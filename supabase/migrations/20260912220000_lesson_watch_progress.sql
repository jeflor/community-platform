-- Add lesson watch progress tracking
-- Allows users to resume videos from where they left off

-- First, make completed_at nullable to allow progress tracking before completion
ALTER TABLE lesson_progress ALTER COLUMN completed_at DROP NOT NULL;
ALTER TABLE lesson_progress ALTER COLUMN completed_at DROP DEFAULT;

-- Add watch progress fields
ALTER TABLE lesson_progress ADD COLUMN watched_seconds INTEGER NOT NULL DEFAULT 0;
ALTER TABLE lesson_progress ADD COLUMN last_watched_at TIMESTAMPTZ;

-- Add index for querying watch progress
CREATE INDEX idx_lesson_progress_last_watched ON lesson_progress(last_watched_at DESC) WHERE last_watched_at IS NOT NULL;

-- Update existing RLS policy for INSERT to restore can_access_lesson check
-- Drop the existing INSERT policy and recreate it with proper access control
DROP POLICY IF EXISTS "Users can mark lessons complete" ON lesson_progress;

-- New policy: Users can insert/update their own lesson progress (both watch progress and completion)
-- Must respect sequential/drip locks via can_access_lesson
CREATE POLICY "Users can manage own lesson progress" ON lesson_progress
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND can_access_lesson(lesson_id)
  );

-- Add UPDATE policy for watch progress
-- Must also check can_access_lesson to prevent updating locked lessons
CREATE POLICY "Users can update own lesson progress" ON lesson_progress
  FOR UPDATE
  USING (user_id = auth.uid() AND can_access_lesson(lesson_id))
  WITH CHECK (user_id = auth.uid() AND can_access_lesson(lesson_id));

-- Fix notify_on_course_completion to only count lessons with completed_at IS NOT NULL
-- Watch-only inserts should not trigger "Course completed!" notification
CREATE OR REPLACE FUNCTION notify_on_course_completion()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_course_id UUID;
  v_user_id UUID;
  v_course_title TEXT;
  v_course_slug TEXT;
  v_notification_href TEXT;
  v_total_lessons INT;
  v_completed_lessons INT;
BEGIN
  -- Only proceed if completed_at was just set (not just watch progress)
  IF NEW.completed_at IS NULL THEN
    RETURN NEW;
  END IF;

  v_user_id := NEW.user_id;

  -- Get the course_id, title, and slug for this lesson
  SELECT c.id, c.title, c.slug INTO v_course_id, v_course_title, v_course_slug
  FROM lessons l
  INNER JOIN modules m ON m.id = l.module_id
  INNER JOIN courses c ON c.id = m.course_id
  WHERE l.id = NEW.lesson_id;

  -- Build notification href
  v_notification_href := '/courses/' || v_course_slug;

  -- Check if notification already exists (once-only guard)
  IF EXISTS (
    SELECT 1 FROM notifications
    WHERE user_id = v_user_id
      AND type = 'course_completed'
      AND href = v_notification_href
  ) THEN
    -- Already notified for this course, skip
    RETURN NEW;
  END IF;

  -- Count total lessons in this course
  SELECT COUNT(*) INTO v_total_lessons
  FROM lessons l
  INNER JOIN modules m ON m.id = l.module_id
  WHERE m.course_id = v_course_id;

  -- Count completed lessons (must have completed_at IS NOT NULL)
  SELECT COUNT(*) INTO v_completed_lessons
  FROM lesson_progress lp
  INNER JOIN lessons l ON l.id = lp.lesson_id
  INNER JOIN modules m ON m.id = l.module_id
  WHERE m.course_id = v_course_id
    AND lp.user_id = v_user_id
    AND lp.completed_at IS NOT NULL;

  -- If all lessons are now complete, send notification
  IF v_total_lessons > 0 AND v_completed_lessons = v_total_lessons THEN
    INSERT INTO notifications (user_id, type, title, body, href)
    VALUES (
      v_user_id,
      'course_completed',
      'Course completed!',
      'You finished all lessons in "' || v_course_title || '"',
      v_notification_href
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Fix can_access_lesson to only count completed lessons (completed_at IS NOT NULL)
-- Watch-only inserts should not unlock next lesson in sequential courses
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
  v_unlock_at TIMESTAMPTZ;
BEGIN
  -- Admins can access all lessons
  IF is_admin() THEN
    RETURN true;
  END IF;
  
  -- Get lesson details and course info
  SELECT 
    l.module_id, 
    l.position,
    l.unlock_at,
    m.course_id,
    m.position,
    c.sequential
  INTO 
    v_module_id,
    v_lesson_position,
    v_unlock_at,
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
  
  -- Check if lesson is time-locked
  IF v_unlock_at IS NOT NULL AND v_unlock_at > NOW() THEN
    RETURN false;
  END IF;
  
  -- If course is not sequential, allow access
  IF v_course_sequential = false THEN
    RETURN true;
  END IF;
  
  -- For sequential courses, check if all prior lessons are completed
  -- Get all lessons in order (by module position, then lesson position)
  -- and check if all lessons before this one are completed (completed_at IS NOT NULL)
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
      -- Lesson is not completed by current user (must have completed_at set)
      AND NOT EXISTS (
        SELECT 1
        FROM lesson_progress lp
        WHERE lp.lesson_id = l2.id
          AND lp.user_id = auth.uid()
          AND lp.completed_at IS NOT NULL
      )
  );
END;
$$;

COMMENT ON COLUMN lesson_progress.watched_seconds IS 'Number of seconds watched in the lesson video';
COMMENT ON COLUMN lesson_progress.last_watched_at IS 'Timestamp of last watch progress update';
COMMENT ON POLICY "Users can manage own lesson progress" ON lesson_progress IS 'Users can track watch progress and mark lessons complete if they have access and are enrolled';
COMMENT ON POLICY "Users can update own lesson progress" ON lesson_progress IS 'Users can update their watch progress (watched_seconds, last_watched_at) and completion status';
