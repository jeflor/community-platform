-- Create storage bucket for document covers and attachments
-- Bucket: document-assets
-- Public read for published documents, admin-only write

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'document-assets',
  'document-assets',
  true, -- Public bucket for easy access to published document covers
  20971520, -- 20MB limit
  ARRAY[
    -- Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    -- PDFs
    'application/pdf',
    -- Office documents
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    -- Videos
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for document-assets bucket

-- Authenticated users can SELECT (read/list) objects
-- This allows admins to see files when editing
CREATE POLICY "Authenticated users can view document assets"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'document-assets');

-- Only admins can INSERT objects
CREATE POLICY "Admins can upload document assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'document-assets' 
  AND is_admin()
);

-- Only admins can UPDATE objects (for upsert operations)
CREATE POLICY "Admins can update document assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'document-assets' 
  AND is_admin()
)
WITH CHECK (
  bucket_id = 'document-assets' 
  AND is_admin()
);

-- Only admins can DELETE objects
CREATE POLICY "Admins can delete document assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'document-assets' 
  AND is_admin()
);
