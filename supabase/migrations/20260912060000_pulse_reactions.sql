-- Add reactions support for Pulse posts
-- Users can react with emoji (heart, thumbs up, laugh, clap)
-- Each user can only react once per emoji per post

CREATE TABLE IF NOT EXISTS public.pulse_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.pulse_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL CHECK (emoji IN ('heart', 'thumbs_up', 'laugh', 'clap')),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT pulse_reactions_unique UNIQUE (post_id, user_id, emoji)
);

-- Create indexes for performance
CREATE INDEX idx_pulse_reactions_post_id ON public.pulse_reactions(post_id);
CREATE INDEX idx_pulse_reactions_user_id ON public.pulse_reactions(user_id);

-- Enable RLS
ALTER TABLE public.pulse_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone authenticated can see all reactions
CREATE POLICY "Pulse reactions are readable by authenticated users"
  ON public.pulse_reactions FOR SELECT
  TO authenticated
  USING (true);

-- Users can add their own reactions
CREATE POLICY "Users can insert their own pulse reactions"
  ON public.pulse_reactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reactions
CREATE POLICY "Users can delete their own pulse reactions"
  ON public.pulse_reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
