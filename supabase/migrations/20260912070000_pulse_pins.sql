-- Add admin-pinned posts support for Pulse
-- Admins can pin/unpin posts to keep them at the top of the feed

-- Add is_pinned column to pulse_posts
ALTER TABLE public.pulse_posts 
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;

-- Create index for efficient sorting (pinned posts first, then by created_at desc)
CREATE INDEX idx_pulse_posts_pinned_created ON public.pulse_posts(is_pinned DESC, created_at DESC);

-- Add admin UPDATE policy for is_pinned column
-- The existing UPDATE policy only allows users to update their own posts
-- We need a separate policy to allow admins to pin/unpin any post
CREATE POLICY "Admins can pin/unpin pulse posts"
  ON public.pulse_posts FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
