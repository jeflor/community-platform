-- Add image attachments to Pulse posts
-- Migration timestamp: 20260912090000

-- Create pulse_attachments table
CREATE TABLE IF NOT EXISTS public.pulse_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.pulse_posts(id) ON DELETE CASCADE NOT NULL,
  storage_path TEXT NOT NULL,
  content_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on pulse_attachments
CREATE INDEX idx_pulse_attachments_post_id ON public.pulse_attachments(post_id);
CREATE INDEX idx_pulse_attachments_created ON public.pulse_attachments(created_at DESC);

-- Enable RLS on pulse_attachments
ALTER TABLE public.pulse_attachments ENABLE ROW LEVEL SECURITY;

-- Create pulse-assets storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pulse-assets',
  'pulse-assets',
  true, -- Public bucket for easy viewing of pulse images
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Helper function to check if user can view a pulse post
-- Used to determine if they can view its attachments
CREATE OR REPLACE FUNCTION public.can_view_pulse_post(post_uuid UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- All authenticated users can view pulse posts (per existing policy)
  RETURN EXISTS (
    SELECT 1 FROM public.pulse_posts
    WHERE id = post_uuid
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_view_pulse_post(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.can_view_pulse_post(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_view_pulse_post(UUID) FROM anon;

-- Helper function to check if user is the author of a pulse post
-- Used to control attachment deletion
CREATE OR REPLACE FUNCTION public.is_pulse_post_author(post_uuid UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.pulse_posts
    WHERE id = post_uuid AND user_id = auth.uid()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_pulse_post_author(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_pulse_post_author(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_pulse_post_author(UUID) FROM anon;

-- RLS policies for pulse_attachments table

-- Authenticated users can SELECT attachments for posts they can view
CREATE POLICY "Authenticated users can view pulse attachments"
ON public.pulse_attachments FOR SELECT
TO authenticated
USING (can_view_pulse_post(post_id));

-- Post authors can INSERT attachments for their own posts
CREATE POLICY "Users can attach images to their own posts"
ON public.pulse_attachments FOR INSERT
TO authenticated
WITH CHECK (is_pulse_post_author(post_id));

-- Post authors and admins can DELETE attachments
CREATE POLICY "Users can delete their own pulse attachments"
ON public.pulse_attachments FOR DELETE
TO authenticated
USING (is_pulse_post_author(post_id) OR is_admin());

-- Storage policies for pulse-assets bucket

-- Public SELECT for pulse-assets (anyone can view)
CREATE POLICY "Pulse images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'pulse-assets');

-- Authenticated users can INSERT to their own folder
CREATE POLICY "Users can upload pulse images to their own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'pulse-assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can UPDATE their own files
CREATE POLICY "Users can update their own pulse images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'pulse-assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can DELETE their own files, admins can delete any
CREATE POLICY "Users can delete their own pulse images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'pulse-assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Admins can manage all pulse images"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'pulse-assets' AND
  is_admin()
);
