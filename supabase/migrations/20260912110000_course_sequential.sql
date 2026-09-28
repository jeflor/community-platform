-- Add sequential lesson unlock feature to courses
-- Allows courses to lock lessons until prior lessons are completed

-- Add sequential column to courses table
ALTER TABLE courses
ADD COLUMN sequential BOOLEAN NOT NULL DEFAULT false;

-- Create helper function to check if a user can access a specific lesson
-- Returns true if:
--   1. User is admin, OR
--   2. Course is not sequential, OR
--   3. All prior lessons (in module order, then next module) are completed
CREATE OR REPLACE FUNCTION can_access_lesson(lesson_uuid UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_course_id UUID;
  v_course_sequential BOOLEAN;
  v_module_id UUID;
  v_lesson_position INTEGER;
  v_module_position INTEGER;
BEGIN
  -- Admins can access all lessons
  IF is_admin() THEN
    RETURN true;
  END IF;
  
  -- Get lesson details and course info
  SELECT 
    l.module_id, 
    l.position,
    m.course_id,
    m.position,
    c.sequential
  INTO 
    v_module_id,
    v_lesson_position,
    v_course_id,
    v_module_position,
    v_course_sequential
  FROM lessons l
  INNER JOIN modules m ON m.id = l.module_id
  INNER JOIN courses c ON c.id = m.course_id
  WHERE l.id = lesson_uuid;
  
  -- If lesson not found, deny access
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check if user is enrolled
  IF NOT is_enrolled(v_course_id) THEN
    RETURN false;
  END IF;
  
  -- If course is not sequential, allow access
  IF v_course_sequential = false THEN
    RETURN true;
  END IF;
  
  -- For sequential courses, check if all prior lessons are completed
  -- Get all lessons in order (by module position, then lesson position)
  -- and check if all lessons before this one are completed
  RETURN NOT EXISTS (
    SELECT 1
    FROM lessons l2
    INNER JOIN modules m2 ON m2.id = l2.module_id
    WHERE m2.course_id = v_course_id
      -- Prior module OR same module with earlier position
      AND (
        m2.position < v_module_position
        OR (m2.position = v_module_position AND l2.position < v_lesson_position)
      )
      -- Lesson is not completed by current user
      AND NOT EXISTS (
        SELECT 1
        FROM lesson_progress lp
        WHERE lp.lesson_id = l2.id
          AND lp.user_id = auth.uid()
      )
  );
END;
$$;

-- Grant execute to authenticated users only
GRANT EXECUTE ON FUNCTION can_access_lesson(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION can_access_lesson(UUID) FROM anon, PUBLIC;

-- Add comment for documentation
COMMENT ON FUNCTION can_access_lesson(UUID) IS 'Checks if the current user can access a lesson based on course sequential settings and completion progress. Admins always have access. Non-admins in sequential courses must complete prior lessons first.';
COMMENT ON COLUMN courses.sequential IS 'When true, lessons must be completed in order (by module position, then lesson position). When false, all lessons are accessible immediately.';
