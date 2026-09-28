-- Add reactions support for Pulse comments
-- Users can react with emoji (heart, thumbs_up, laugh, clap)
-- Each user can only react once per emoji per comment

CREATE TABLE IF NOT EXISTS public.pulse_comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID REFERENCES public.pulse_comments(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL CHECK (emoji IN ('heart', 'thumbs_up', 'laugh', 'clap')),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT pulse_comment_reactions_unique UNIQUE (comment_id, user_id, emoji)
);

-- Create indexes for performance
CREATE INDEX idx_pulse_comment_reactions_comment_id ON public.pulse_comment_reactions(comment_id);
CREATE INDEX idx_pulse_comment_reactions_user_id ON public.pulse_comment_reactions(user_id);

-- Enable RLS
ALTER TABLE public.pulse_comment_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone authenticated can see all reactions
CREATE POLICY "Pulse comment reactions are readable by authenticated users"
  ON public.pulse_comment_reactions FOR SELECT
  TO authenticated
  USING (true);

-- Users can add their own reactions
CREATE POLICY "Users can insert their own pulse comment reactions"
  ON public.pulse_comment_reactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reactions
CREATE POLICY "Users can delete their own pulse comment reactions"
  ON public.pulse_comment_reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, DELETE ON public.pulse_comment_reactions TO authenticated;

-- Revoke permissions from anon and public
REVOKE ALL ON public.pulse_comment_reactions FROM anon, public;
