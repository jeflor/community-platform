-- Add Pulse @mentions and in-app DM notifications
-- SECURITY: notify_user execution revoked from public/anon/authenticated
-- Only SECURITY DEFINER triggers call notify_user

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Extract @mentions from text and return matching user IDs
-- Matches @Name (full_name exact or first name) or @email-local (email prefix)
-- Requires mention length >= 2 to prevent spam
CREATE OR REPLACE FUNCTION public.extract_mentions(text_body TEXT)
RETURNS UUID[]
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  mention_pattern TEXT;
  mentioned_users UUID[];
BEGIN
  -- Extract @mentions: @word_chars (2+ chars) and match exactly
  -- Match ONLY:
  -- 1. LOWER(full_name) = LOWER(token)
  -- 2. LOWER(first_name) = LOWER(token)
  -- 3. LOWER(email_prefix) = LOWER(token)
  SELECT ARRAY_AGG(DISTINCT u.id)
  INTO mentioned_users
  FROM regexp_matches(text_body, '@(\w{2,})', 'g') AS matches(mention_text)
  INNER JOIN public.users u ON (
    -- Exact match on full_name (case-insensitive)
    LOWER(u.full_name) = LOWER(matches.mention_text)
    OR
    -- Exact match on first name (first word of full_name)
    LOWER(SPLIT_PART(u.full_name, ' ', 1)) = LOWER(matches.mention_text)
    OR
    -- Exact match on email prefix (part before @)
    LOWER(SPLIT_PART(u.email, '@', 1)) = LOWER(matches.mention_text)
  )
  WHERE u.is_active = true;

  RETURN COALESCE(mentioned_users, ARRAY[]::UUID[]);
END;
$$;

-- Revoke execute from public roles
REVOKE ALL ON FUNCTION public.extract_mentions(TEXT) FROM PUBLIC, anon, authenticated;

-- ============================================================================
-- PULSE POST MENTIONS TRIGGER
-- ============================================================================

-- Notify users mentioned in a new pulse post
CREATE OR REPLACE FUNCTION public.notify_on_pulse_post_mentions()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  mentioned_user_id UUID;
  author_name TEXT;
  mentioned_users UUID[];
BEGIN
  -- Get author's name
  SELECT COALESCE(full_name, email) INTO author_name FROM public.users WHERE id = NEW.user_id;

  -- Extract mentions
  mentioned_users := public.extract_mentions(NEW.body);

  -- Notify each mentioned user (except the author)
  IF array_length(mentioned_users, 1) > 0 THEN
    FOREACH mentioned_user_id IN ARRAY mentioned_users
    LOOP
      IF mentioned_user_id != NEW.user_id THEN
        PERFORM public.notify_user(
          mentioned_user_id,
          'mention',
          author_name || ' mentioned you in a post',
          LEFT(NEW.body, 100),
          '/pulse'
        );
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for pulse post mentions
DROP TRIGGER IF EXISTS on_pulse_post_mentions ON public.pulse_posts;
CREATE TRIGGER on_pulse_post_mentions
  AFTER INSERT ON public.pulse_posts
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_pulse_post_mentions();

-- Revoke execute from public roles
REVOKE ALL ON FUNCTION public.notify_on_pulse_post_mentions() FROM PUBLIC, anon, authenticated;

-- ============================================================================
-- PULSE COMMENT MENTIONS TRIGGER
-- ============================================================================

-- Notify users mentioned in a new pulse comment
CREATE OR REPLACE FUNCTION public.notify_on_pulse_comment_mentions()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  mentioned_user_id UUID;
  commenter_name TEXT;
  mentioned_users UUID[];
BEGIN
  -- Get commenter's name
  SELECT COALESCE(full_name, email) INTO commenter_name FROM public.users WHERE id = NEW.user_id;

  -- Extract mentions
  mentioned_users := public.extract_mentions(NEW.body);

  -- Notify each mentioned user (except the commenter)
  IF array_length(mentioned_users, 1) > 0 THEN
    FOREACH mentioned_user_id IN ARRAY mentioned_users
    LOOP
      IF mentioned_user_id != NEW.user_id THEN
        PERFORM public.notify_user(
          mentioned_user_id,
          'mention',
          commenter_name || ' mentioned you in a comment',
          LEFT(NEW.body, 100),
          '/pulse'
        );
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for pulse comment mentions
DROP TRIGGER IF EXISTS on_pulse_comment_mentions ON public.pulse_comments;
CREATE TRIGGER on_pulse_comment_mentions
  AFTER INSERT ON public.pulse_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_pulse_comment_mentions();

-- Revoke execute from public roles
REVOKE ALL ON FUNCTION public.notify_on_pulse_comment_mentions() FROM PUBLIC, anon, authenticated;

-- ============================================================================
-- DM NOTIFICATIONS TRIGGER
-- ============================================================================

-- Notify recipient when a new DM message is sent
CREATE OR REPLACE FUNCTION public.notify_on_dm_message()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  sender_name TEXT;
  recipient_id UUID;
  client_id UUID;
  sender_role TEXT;
BEGIN
  -- Get sender's name and role
  SELECT COALESCE(full_name, email), role INTO sender_name, sender_role 
  FROM public.users WHERE id = NEW.user_id;

  -- Get the client_id for this thread
  SELECT dm_threads.client_id INTO client_id 
  FROM public.dm_threads 
  WHERE dm_threads.id = NEW.thread_id;

  -- Determine recipient(s): if sender is client, notify all active admins/coaches; if sender is team, notify client
  IF sender_role = 'client' THEN
    -- Client sent a message, notify all active admins and coaches (except sender)
    FOR recipient_id IN 
      SELECT id FROM public.users 
      WHERE role IN ('admin', 'coach') 
        AND is_active = true 
        AND id != NEW.user_id
    LOOP
      PERFORM public.notify_user(
        recipient_id,
        'dm',
        'New message from ' || sender_name,
        LEFT(NEW.body, 100),
        '/dashboard/messages/' || NEW.thread_id::text
      );
    END LOOP;
  ELSE
    -- Team member sent a message, notify the client
    recipient_id := client_id;
    IF recipient_id IS NOT NULL AND recipient_id != NEW.user_id THEN
      PERFORM public.notify_user(
        recipient_id,
        'dm',
        'New message from ' || sender_name,
        LEFT(NEW.body, 100),
        '/dashboard/messages/' || NEW.thread_id::text
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for DM notifications
DROP TRIGGER IF EXISTS on_dm_message_created ON public.dm_messages;
CREATE TRIGGER on_dm_message_created
  AFTER INSERT ON public.dm_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_dm_message();

-- Revoke execute from public roles
REVOKE ALL ON FUNCTION public.notify_on_dm_message() FROM PUBLIC, anon, authenticated;
