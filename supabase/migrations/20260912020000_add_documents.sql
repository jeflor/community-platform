-- Add documents system for admin-editable resources
-- Creates documents and document_groups tables with RLS policies

-- Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body TEXT, -- HTML content
  cover_url TEXT,
  video_url TEXT, -- YouTube/Vimeo/Loom embed URL
  attachments JSONB DEFAULT '[]'::jsonb, -- Array of {name, url, type}
  is_published BOOLEAN NOT NULL DEFAULT false,
  locked_message TEXT, -- Override site_settings locked_messages.documents
  visibility content_visibility NOT NULL DEFAULT 'show_locked', -- show_locked or hide
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create document_groups junction table
CREATE TABLE IF NOT EXISTS public.document_groups (
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.access_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (document_id, group_id)
);

-- Create indexes
CREATE INDEX idx_documents_slug ON public.documents(slug);
CREATE INDEX idx_documents_is_published ON public.documents(is_published);
CREATE INDEX idx_documents_created_by ON public.documents(created_by);
CREATE INDEX idx_document_groups_document_id ON public.document_groups(document_id);
CREATE INDEX idx_document_groups_group_id ON public.document_groups(group_id);

-- Add updated_at trigger
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Helper function to check if user can see a document
-- User can see if they are admin OR if document is published AND (no groups OR user in one of the groups)
CREATE OR REPLACE FUNCTION can_see_document(document_uuid UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  doc_is_published BOOLEAN;
  has_groups BOOLEAN;
BEGIN
  -- Admins can see all documents
  IF is_admin() THEN
    RETURN true;
  END IF;
  
  -- Check if document is published
  SELECT is_published INTO doc_is_published
  FROM documents
  WHERE id = document_uuid;
  
  IF NOT doc_is_published THEN
    RETURN false;
  END IF;
  
  -- Check if document has any group restrictions
  SELECT EXISTS (
    SELECT 1
    FROM document_groups
    WHERE document_id = document_uuid
  ) INTO has_groups;
  
  -- If no groups, everyone authenticated can see it
  IF NOT has_groups THEN
    RETURN true;
  END IF;
  
  -- Check if user is in any of the document's groups
  RETURN EXISTS (
    SELECT 1
    FROM document_groups dg
    INNER JOIN group_members gm ON gm.group_id = dg.group_id
    WHERE dg.document_id = document_uuid
      AND gm.user_id = auth.uid()
  );
END;
$$;

-- Grant execute to authenticated only (fix previous migration issues with anon/public)
REVOKE EXECUTE ON FUNCTION can_see_document(UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION can_see_document(UUID) TO authenticated;

-- Enable Row Level Security
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for documents table
-- Admins can manage all documents
CREATE POLICY "Admins can manage documents" ON public.documents
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Users can view documents they have access to
CREATE POLICY "Users can view accessible documents" ON public.documents
  FOR SELECT
  USING (can_see_document(id));

-- RLS Policies for document_groups table
-- Admins can manage document group assignments
CREATE POLICY "Admins can manage document groups" ON public.document_groups
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Users can view document groups for documents they can see
CREATE POLICY "Users can view document groups for accessible documents" ON public.document_groups
  FOR SELECT
  USING (can_see_document(document_id));

-- Seed documents from existing sidebar items
-- Create a document for each /resources/* href in sidebar_items
DO $$
DECLARE
  item_record RECORD;
  doc_slug TEXT;
  doc_title TEXT;
BEGIN
  FOR item_record IN 
    SELECT DISTINCT ON (href) id, label, href, group_slugs
    FROM sidebar_items
    WHERE href LIKE '/resources/%' AND href NOT LIKE '/resources/%/%'
    ORDER BY href, position
  LOOP
    -- Extract slug from href (e.g., /resources/announcements -> announcements)
    doc_slug := substring(item_record.href from '/resources/(.+)');
    doc_title := item_record.label;
    
    -- Insert document if it doesn't exist
    INSERT INTO documents (slug, title, body, is_published, created_at)
    VALUES (
      doc_slug,
      doc_title,
      '', -- Empty body - admins will fill in content
      true, -- Published so members see the title
      now()
    )
    ON CONFLICT (slug) DO NOTHING;
    
    -- Link document to groups if item has group restrictions
    IF item_record.group_slugs IS NOT NULL AND array_length(item_record.group_slugs, 1) > 0 THEN
      INSERT INTO document_groups (document_id, group_id)
      SELECT 
        d.id,
        ag.id
      FROM documents d
      CROSS JOIN access_groups ag
      WHERE d.slug = doc_slug
        AND ag.slug = ANY(item_record.group_slugs)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;
