-- Course completion notifications
-- Automatically notify users when they complete all lessons in a course
-- SECURITY: Trigger function is NOT directly callable by clients

-- Trigger function to notify on course completion
CREATE OR REPLACE FUNCTION public.notify_on_course_completion()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_course_id UUID;
  v_course_title TEXT;
  v_course_slug TEXT;
  v_total_lessons INTEGER;
  v_completed_lessons INTEGER;
  v_notification_href TEXT;
BEGIN
  -- Get course info from the completed lesson
  SELECT c.id, c.title, c.slug
  INTO v_course_id, v_course_title, v_course_slug
  FROM public.lessons l
  INNER JOIN public.modules m ON m.id = l.module_id
  INNER JOIN public.courses c ON c.id = m.course_id
  WHERE l.id = NEW.lesson_id;
  
  -- If no course found, nothing to do
  IF v_course_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Build notification href
  v_notification_href := '/courses/' || v_course_slug;
  
  -- Check if notification already exists for this user and course
  IF EXISTS (
    SELECT 1 FROM public.notifications
    WHERE user_id = NEW.user_id
      AND type = 'course_completed'
      AND href = v_notification_href
  ) THEN
    -- Already notified for this course, skip
    RETURN NEW;
  END IF;
  
  -- Count total lessons in the course
  SELECT COUNT(*)
  INTO v_total_lessons
  FROM public.lessons l
  INNER JOIN public.modules m ON m.id = l.module_id
  WHERE m.course_id = v_course_id;
  
  -- Count user's completed lessons in the course
  SELECT COUNT(*)
  INTO v_completed_lessons
  FROM public.lesson_progress lp
  INNER JOIN public.lessons l ON l.id = lp.lesson_id
  INNER JOIN public.modules m ON m.id = l.module_id
  WHERE m.course_id = v_course_id
    AND lp.user_id = NEW.user_id;
  
  -- If user has completed all lessons, send notification
  IF v_total_lessons > 0 AND v_completed_lessons = v_total_lessons THEN
    INSERT INTO public.notifications (user_id, type, title, body, href)
    VALUES (
      NEW.user_id,
      'course_completed',
      'Course completed!',
      'You finished all lessons in "' || v_course_title || '"',
      v_notification_href
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for course completion notifications
DROP TRIGGER IF EXISTS on_course_completion ON public.lesson_progress;
CREATE TRIGGER on_course_completion
  AFTER INSERT ON public.lesson_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_course_completion();

-- SECURITY: Revoke direct execution - only the trigger should invoke this function
REVOKE ALL ON FUNCTION public.notify_on_course_completion() FROM PUBLIC, anon, authenticated;
