-- Add comment system for documents
-- Users with can_see_document access can post comments, edit/delete their own
-- Admins can delete any comment

-- Create document_comments table
CREATE TABLE IF NOT EXISTS public.document_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_document_comments_document_id ON public.document_comments(document_id);
CREATE INDEX idx_document_comments_user_id ON public.document_comments(user_id);
CREATE INDEX idx_document_comments_created ON public.document_comments(created_at ASC);

-- Enable RLS
ALTER TABLE public.document_comments ENABLE ROW LEVEL SECURITY;

-- Add updated_at trigger
CREATE TRIGGER update_document_comments_updated_at 
  BEFORE UPDATE ON public.document_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies

-- SELECT: Users can read comments on documents they can see
CREATE POLICY "Users can view comments on accessible documents"
  ON public.document_comments FOR SELECT
  TO authenticated
  USING (can_see_document(document_id) OR is_admin());

-- INSERT: Users can post comments on documents they can see
CREATE POLICY "Users can post comments on accessible documents"
  ON public.document_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND can_see_document(document_id));

-- UPDATE: Users can edit their own comments
CREATE POLICY "Users can update their own comments"
  ON public.document_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can delete their own comments
CREATE POLICY "Users can delete their own comments"
  ON public.document_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- DELETE: Admins can delete any comment
CREATE POLICY "Admins can delete any comment"
  ON public.document_comments FOR DELETE
  TO authenticated
  USING (is_admin());
