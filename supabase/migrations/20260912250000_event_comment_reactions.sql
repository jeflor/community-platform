-- Add reactions support for Event comments
-- Users can react with emoji (heart, thumbs_up, laugh, clap)
-- Each user can only react once per emoji per comment

CREATE TABLE IF NOT EXISTS public.event_comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID REFERENCES public.event_comments(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL CHECK (emoji IN ('heart', 'thumbs_up', 'laugh', 'clap')),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT event_comment_reactions_unique UNIQUE (comment_id, user_id, emoji)
);

-- Create indexes for performance
CREATE INDEX idx_event_comment_reactions_comment_id ON public.event_comment_reactions(comment_id);
CREATE INDEX idx_event_comment_reactions_user_id ON public.event_comment_reactions(user_id);

-- Enable RLS
ALTER TABLE public.event_comment_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone authenticated can see all reactions
CREATE POLICY "Event comment reactions are readable by authenticated users"
  ON public.event_comment_reactions FOR SELECT
  TO authenticated
  USING (true);

-- Users can add their own reactions
CREATE POLICY "Users can insert their own event comment reactions"
  ON public.event_comment_reactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reactions
CREATE POLICY "Users can delete their own event comment reactions"
  ON public.event_comment_reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, DELETE ON public.event_comment_reactions TO authenticated;

-- Revoke permissions from anon and public
REVOKE ALL ON public.event_comment_reactions FROM anon, public;
