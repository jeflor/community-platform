-- Update Pulse notification triggers to use post-specific permalinks
-- Changes hrefs from '/pulse' to '/pulse/{post_id}' for pulse_comment, pulse_post_mentions, and pulse_comment_mentions

-- Update notify_on_pulse_comment to include post_id in href
CREATE OR REPLACE FUNCTION public.notify_on_pulse_comment()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  post_author_id UUID;
  commenter_name TEXT;
BEGIN
  -- Get the post author
  SELECT user_id INTO post_author_id FROM public.pulse_posts WHERE id = NEW.post_id;

  -- Get commenter's name
  SELECT COALESCE(full_name, email) INTO commenter_name FROM public.users WHERE id = NEW.user_id;

  -- Notify post author (unless they're the commenter)
  IF post_author_id != NEW.user_id THEN
    PERFORM public.notify_user(
      post_author_id,
      'pulse_comment',
      commenter_name || ' commented on your post',
      LEFT(NEW.body, 100),
      '/pulse/' || NEW.post_id::text
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Revoke trigger function from anon/authenticated (only trigger invokes it)
REVOKE ALL ON FUNCTION public.notify_on_pulse_comment() FROM PUBLIC, anon, authenticated;

-- Update notify_on_pulse_post_mentions to include post_id in href
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
          '/pulse/' || NEW.id::text
        );
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Revoke execute from public roles
REVOKE ALL ON FUNCTION public.notify_on_pulse_post_mentions() FROM PUBLIC, anon, authenticated;

-- Update notify_on_pulse_comment_mentions to include post_id in href
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
          '/pulse/' || NEW.post_id::text
        );
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Revoke execute from public roles
REVOKE ALL ON FUNCTION public.notify_on_pulse_comment_mentions() FROM PUBLIC, anon, authenticated;
