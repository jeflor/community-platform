-- Add event_comments table for discussions on event detail pages
-- Follows the pulse_comments pattern for consistency

-- Create event_comments table
CREATE TABLE IF NOT EXISTS public.event_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_event_comments_event_id ON public.event_comments(event_id);
CREATE INDEX idx_event_comments_user_id ON public.event_comments(user_id);
CREATE INDEX idx_event_comments_created ON public.event_comments(created_at DESC);

-- Add updated_at trigger
CREATE TRIGGER update_event_comments_updated_at 
  BEFORE UPDATE ON public.event_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.event_comments ENABLE ROW LEVEL SECURITY;

-- Event comments policies
-- SELECT: users can read comments if they can see the event OR if they are admin
CREATE POLICY "Event comments are readable by users who can see the event"
  ON public.event_comments FOR SELECT
  TO authenticated
  USING (can_see_event(event_id) OR is_admin());

-- INSERT: users can insert their own comments if they can see the event OR if they are admin
CREATE POLICY "Users can insert their own event comments"
  ON public.event_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND (can_see_event(event_id) OR is_admin()));

-- UPDATE: users can update their own comments
CREATE POLICY "Users can update their own event comments"
  ON public.event_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: users can delete their own comments
CREATE POLICY "Users can delete their own event comments"
  ON public.event_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admin can delete any event comment
CREATE POLICY "Admins can delete any event comment"
  ON public.event_comments FOR DELETE
  TO authenticated
  USING (is_admin());

-- Grant execute permissions to authenticated users for helper functions used in policies
-- This ensures RLS policies can call these functions properly
GRANT EXECUTE ON FUNCTION can_see_event(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION can_rsvp_event(UUID) TO authenticated;
