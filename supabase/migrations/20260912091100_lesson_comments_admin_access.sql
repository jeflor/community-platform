-- Update lesson_comments policies to allow admin access
-- This migration updates existing lesson_comments policies to include admin access
-- Admins can view and post comments on any lesson

-- Drop existing policies to recreate them with admin access
DROP POLICY IF EXISTS "Users can view comments for enrolled lessons" ON public.lesson_comments;
DROP POLICY IF EXISTS "Users can post comments on enrolled lessons" ON public.lesson_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.lesson_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.lesson_comments;
DROP POLICY IF EXISTS "Admins can delete any comment" ON public.lesson_comments;

-- Recreate SELECT policy with admin access
CREATE POLICY "Users can view comments for enrolled lessons"
  ON public.lesson_comments FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM lessons l
      INNER JOIN modules m ON m.id = l.module_id
      INNER JOIN courses c ON c.id = m.course_id
      WHERE l.id = lesson_id
        AND c.is_published = true
        AND has_course_access(c.id)
        AND is_enrolled(c.id)
    )
  );

-- Recreate INSERT policy with admin access
CREATE POLICY "Users can post comments on enrolled lessons"
  ON public.lesson_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM lessons l
        INNER JOIN modules m ON m.id = l.module_id
        INNER JOIN courses c ON c.id = m.course_id
        WHERE l.id = lesson_id
          AND c.is_published = true
          AND has_course_access(c.id)
          AND is_enrolled(c.id)
      )
    )
  );

-- Recreate UPDATE policy (unchanged)
CREATE POLICY "Users can update their own comments"
  ON public.lesson_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Recreate DELETE own policy (unchanged)
CREATE POLICY "Users can delete their own comments"
  ON public.lesson_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Recreate admin DELETE policy (unchanged)
CREATE POLICY "Admins can delete any comment"
  ON public.lesson_comments FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Ensure helper functions are granted to authenticated
GRANT EXECUTE ON FUNCTION public.has_course_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_enrolled(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
