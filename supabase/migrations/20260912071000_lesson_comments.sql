-- Add lesson comments support
-- Users can discuss lessons with other enrolled members

CREATE TABLE IF NOT EXISTS public.lesson_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_lesson_comments_lesson_id ON public.lesson_comments(lesson_id);
CREATE INDEX idx_lesson_comments_user_id ON public.lesson_comments(user_id);
CREATE INDEX idx_lesson_comments_created_at ON public.lesson_comments(created_at);

-- Add updated_at trigger
CREATE TRIGGER update_lesson_comments_updated_at BEFORE UPDATE ON public.lesson_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.lesson_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view comments for lessons they have access to (enrolled in the course)
CREATE POLICY "Users can view comments for enrolled lessons"
  ON public.lesson_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lessons l
      INNER JOIN modules m ON m.id = l.module_id
      INNER JOIN courses c ON c.id = m.course_id
      WHERE l.id = lesson_id
        AND c.is_published = true
        AND has_course_access(c.id)
        AND is_enrolled(c.id)
    )
  );

-- Users can insert comments for lessons they are enrolled in
CREATE POLICY "Users can post comments on enrolled lessons"
  ON public.lesson_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM lessons l
      INNER JOIN modules m ON m.id = l.module_id
      INNER JOIN courses c ON c.id = m.course_id
      WHERE l.id = lesson_id
        AND c.is_published = true
        AND has_course_access(c.id)
        AND is_enrolled(c.id)
    )
  );

-- Users can update their own comments
CREATE POLICY "Users can update their own comments"
  ON public.lesson_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete their own comments"
  ON public.lesson_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can delete any comment
CREATE POLICY "Admins can delete any comment"
  ON public.lesson_comments FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Grant execute permission to authenticated for the RLS helper functions used
-- (has_course_access and is_enrolled are already granted in their definition, 
-- this is just documentation that they're required)
GRANT EXECUTE ON FUNCTION public.has_course_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_enrolled(UUID) TO authenticated;
