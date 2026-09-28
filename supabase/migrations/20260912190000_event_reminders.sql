-- Event Reminders Migration
-- Adds in-app reminders for upcoming events
-- Users with 'going' status get notified within 24 hours before event starts

-- Add reminded_at column to track which RSVPs have been reminded
ALTER TABLE public.event_rsvps
ADD COLUMN reminded_at TIMESTAMPTZ DEFAULT NULL;

-- Index for efficient querying of unreminded RSVPs for upcoming events
CREATE INDEX idx_event_rsvps_reminded_at ON public.event_rsvps(reminded_at) WHERE reminded_at IS NULL;

-- SECURITY DEFINER function to create due event reminders
-- Creates notifications for users who RSVP'd 'going' (or promoted from waitlist)
-- for events starting within the next 24 hours
-- Race-safe: claims rows via UPDATE...RETURNING before inserting notifications
CREATE OR REPLACE FUNCTION public.create_due_event_reminders()
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_reminder_count INTEGER := 0;
  v_reminder_record RECORD;
BEGIN
  -- Only authenticated users can trigger reminder creation
  IF auth.uid() IS NULL THEN
    RETURN 0;
  END IF;

  -- Race-safe: First claim the rows by updating reminded_at, then create notifications
  -- This prevents duplicate notifications if multiple users open notifications simultaneously
  FOR v_reminder_record IN
    UPDATE public.event_rsvps er
    SET reminded_at = now()
    FROM public.events e
    WHERE e.id = er.event_id
      AND er.status = 'going'
      AND er.reminded_at IS NULL
      AND e.is_visible = true
      AND e.starts_at > now()
      AND e.starts_at <= now() + interval '24 hours'
      AND (e.visibility IS NULL OR e.visibility::text IS DISTINCT FROM 'hide')
    RETURNING er.event_id, er.user_id, e.title, e.starts_at
  LOOP
    -- Create notification for this user
    INSERT INTO public.notifications (user_id, type, title, body, href)
    VALUES (
      v_reminder_record.user_id,
      'event_reminder',
      v_reminder_record.title || ' starts soon',
      'Your event starts ' || 
        CASE 
          WHEN v_reminder_record.starts_at <= NOW() + INTERVAL '1 hour' THEN 'in less than an hour'
          WHEN v_reminder_record.starts_at <= NOW() + INTERVAL '3 hours' THEN 'in a few hours'
          WHEN v_reminder_record.starts_at <= NOW() + INTERVAL '12 hours' THEN 'today'
          ELSE 'tomorrow'
        END,
      '/dashboard/events/' || v_reminder_record.event_id
    );

    v_reminder_count := v_reminder_count + 1;
  END LOOP;

  RETURN v_reminder_count;
END;
$$;

-- SECURITY: Only authenticated users can call this function
-- Revoke from anon and public
REVOKE EXECUTE ON FUNCTION public.create_due_event_reminders() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.create_due_event_reminders() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.create_due_event_reminders() IS 
'Creates in-app notifications for users with going RSVPs for events starting within 24 hours. Called from notification fetch to ensure reminders appear without requiring cron jobs.';
