-- Pulse, Notifications, and Search enhancements
-- Adds pulse_comments, notifications table, and helper functions
-- SECURITY: notify_user is NOT directly callable; mark_notifications_read RPC enforces ownership

-- Create pulse_comments table for discussions on Pulse posts
CREATE TABLE IF NOT EXISTS public.pulse_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.pulse_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  href TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pulse_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Pulse comments policies
CREATE POLICY "Pulse comments are readable by authenticated users"
  ON public.pulse_comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own pulse comments"
  ON public.pulse_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pulse comments"
  ON public.pulse_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pulse comments"
  ON public.pulse_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admin can delete any pulse comment
CREATE POLICY "Admins can delete any pulse comment"
  ON public.pulse_comments FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Add admin delete policy for pulse_posts
CREATE POLICY "Admins can delete any pulse post"
  ON public.pulse_posts FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Notifications policies (SELECT only; UPDATE removed - use RPC instead)
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_pulse_comments_post_id ON public.pulse_comments(post_id);
CREATE INDEX idx_pulse_comments_user_id ON public.pulse_comments(user_id);
CREATE INDEX idx_pulse_comments_created ON public.pulse_comments(created_at DESC);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read_at ON public.notifications(read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);

-- Add updated_at trigger for pulse_comments
CREATE TRIGGER update_pulse_comments_updated_at 
  BEFORE UPDATE ON public.pulse_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Helper function to create notifications (SECURITY DEFINER, NOT directly callable)
-- Only the trigger notify_on_pulse_comment should call this
CREATE OR REPLACE FUNCTION public.notify_user(
  target_user_id UUID,
  notification_type TEXT,
  notification_title TEXT,
  notification_body TEXT DEFAULT NULL,
  notification_href TEXT DEFAULT NULL
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  notification_id UUID;
BEGIN
  -- Only authenticated users can create notifications
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to create notifications';
  END IF;

  -- Don't notify yourself
  IF target_user_id = auth.uid() THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, href)
  VALUES (target_user_id, notification_type, notification_title, notification_body, notification_href)
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$;

-- SECURITY: notify_user MUST NOT be executable by authenticated/anon/public directly
-- Only the SECURITY DEFINER trigger can call it
REVOKE ALL ON FUNCTION public.notify_user(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

-- Trigger function to notify on new pulse comment
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
      '/pulse'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for pulse comments
DROP TRIGGER IF EXISTS on_pulse_comment_created ON public.pulse_comments;
CREATE TRIGGER on_pulse_comment_created
  AFTER INSERT ON public.pulse_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_pulse_comment();

-- Revoke trigger function from anon/authenticated (only trigger invokes it)
REVOKE ALL ON FUNCTION public.notify_on_pulse_comment() FROM PUBLIC, anon, authenticated;

-- RPC function to mark notifications as read (replaces direct UPDATE)
-- SECURITY DEFINER ensures it only marks the caller's own notifications
CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_ids UUID[] DEFAULT NULL)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated';
  END IF;

  IF p_ids IS NULL THEN
    -- Mark all caller's unread notifications as read
    UPDATE public.notifications
    SET read_at = now()
    WHERE user_id = auth.uid()
      AND read_at IS NULL;
  ELSE
    -- Mark specific notifications as read (only caller's own)
    UPDATE public.notifications
    SET read_at = now()
    WHERE user_id = auth.uid()
      AND id = ANY(p_ids)
      AND read_at IS NULL;
  END IF;
END;
$$;

-- Grant execute to authenticated users on the mark_notifications_read RPC
GRANT EXECUTE ON FUNCTION public.mark_notifications_read(UUID[]) TO authenticated;
