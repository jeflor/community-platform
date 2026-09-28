-- Add can_access_lesson check to lesson_progress INSERT policy
-- Prevents users from marking later lessons complete and bypassing sequential drip

-- Drop existing policy
DROP POLICY IF EXISTS "Users can mark lessons complete" ON lesson_progress;

-- Recreate with can_access_lesson check
CREATE POLICY "Users can mark lessons complete" ON lesson_progress
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND can_access_lesson(lesson_id)
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

COMMENT ON POLICY "Users can mark lessons complete" ON lesson_progress IS 'Users can mark lessons complete only if they have access (respects sequential locks) and are enrolled in the course';
