-- Phase 3: Add Supabase Storage bucket for course assets
-- Creates a storage bucket for course banners and lesson attachments

-- Create course-assets bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-assets',
  'course-assets',
  true, -- Public bucket for course images and files
  52428800, -- 50MB limit
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'video/mp4',
    'video/quicktime'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for course-assets bucket

-- Allow authenticated users to view all files (public bucket)
CREATE POLICY "Anyone can view course assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-assets');

-- Allow admins to upload files
CREATE POLICY "Admins can upload course assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'course-assets'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Allow admins to update files
CREATE POLICY "Admins can update course assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'course-assets'
  AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Allow admins to delete files
CREATE POLICY "Admins can delete course assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'course-assets'
  AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

COMMENT ON TABLE storage.buckets IS 'Storage buckets including course-assets for course banners and lesson attachments';
