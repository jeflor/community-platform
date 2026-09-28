-- Waitlist promotion notifications
-- Automatically notify users when they are promoted from waitlist to going status
-- SECURITY: Trigger function is NOT directly callable by clients

-- Trigger function to notify on waitlist promotion
CREATE OR REPLACE FUNCTION public.notify_on_waitlist_promotion()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_event_title TEXT;
  v_event_id UUID;
BEGIN
  -- Only notify when status changes from waitlist to going
  IF OLD.status = 'waitlist' AND NEW.status = 'going' THEN
    v_event_id := NEW.event_id;
    
    -- Get event title for notification
    SELECT title INTO v_event_title FROM public.events WHERE id = v_event_id;
    
    -- Insert notification for the promoted user
    INSERT INTO public.notifications (user_id, type, title, body, href)
    VALUES (
      NEW.user_id,
      'waitlist_promotion',
      'You''re off the waitlist!',
      'A spot opened up for "' || v_event_title || '"',
      '/dashboard/events/' || v_event_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for waitlist promotions
DROP TRIGGER IF EXISTS on_waitlist_promotion ON public.event_rsvps;
CREATE TRIGGER on_waitlist_promotion
  AFTER UPDATE ON public.event_rsvps
  FOR EACH ROW
  WHEN (OLD.status = 'waitlist' AND NEW.status = 'going')
  EXECUTE FUNCTION public.notify_on_waitlist_promotion();

-- SECURITY: Revoke direct execution - only the trigger should invoke this function
REVOKE ALL ON FUNCTION public.notify_on_waitlist_promotion() FROM PUBLIC, anon, authenticated;
