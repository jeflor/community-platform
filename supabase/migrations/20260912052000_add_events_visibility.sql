-- Add visibility column to events table to support locked content
-- Matches the course locked content pattern (show_locked or hide)

ALTER TABLE events
ADD COLUMN visibility content_visibility NOT NULL DEFAULT 'show_locked';

CREATE INDEX idx_events_visibility ON events(visibility);

-- Update the can_see_event function to respect visibility settings
-- Users can see an event if:
-- 1. They are admin, OR
-- 2. The event is visible AND (
--    a. visibility is 'show_locked' (preview available even without access), OR
--    b. They belong to any group assigned to the event
-- )
CREATE OR REPLACE FUNCTION can_see_event(event_uuid UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Admins can see all events
  IF is_admin() THEN
    RETURN true;
  END IF;
  
  -- Check if event is visible
  -- If visibility is 'show_locked', anyone authenticated can see it (for paywall preview)
  -- If visibility is 'hide', only users in assigned groups can see it
  RETURN EXISTS (
    SELECT 1
    FROM events e
    WHERE e.id = event_uuid
      AND e.is_visible = true
      AND (
        e.visibility = 'show_locked'
        OR EXISTS (
          SELECT 1
          FROM event_groups eg
          INNER JOIN group_members gm ON gm.group_id = eg.group_id
          WHERE eg.event_id = e.id
            AND gm.user_id = auth.uid()
        )
      )
  );
END;
$$;

-- Add helper function to check if user can RSVP to an event
-- User can RSVP if they have actual group access (not just show_locked preview)
-- If no groups are assigned to the event, treat as open-to-all (return true)
CREATE OR REPLACE FUNCTION can_rsvp_event(event_uuid UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  group_count INTEGER;
BEGIN
  -- Admins can RSVP to all events
  IF is_admin() THEN
    RETURN true;
  END IF;
  
  -- Check if event is visible
  IF NOT EXISTS (
    SELECT 1 FROM events WHERE id = event_uuid AND is_visible = true
  ) THEN
    RETURN false;
  END IF;
  
  -- Count how many groups are assigned to this event
  SELECT COUNT(*) INTO group_count
  FROM event_groups
  WHERE event_id = event_uuid;
  
  -- If no groups are assigned, treat as open-to-all
  IF group_count = 0 THEN
    RETURN true;
  END IF;
  
  -- Check if user is in any group assigned to the event
  RETURN EXISTS (
    SELECT 1
    FROM event_groups eg
    INNER JOIN group_members gm ON gm.group_id = eg.group_id
    WHERE eg.event_id = event_uuid
      AND gm.user_id = auth.uid()
  );
END;
$$;

-- Grant execute to authenticated users (needed for RLS WITH CHECK)
-- Revoke only from PUBLIC and anon for security
GRANT EXECUTE ON FUNCTION can_rsvp_event(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION can_rsvp_event(UUID) FROM PUBLIC, anon;

-- Update RLS policy for event_rsvps to use can_rsvp_event
DROP POLICY IF EXISTS "Users can manage own rsvps" ON event_rsvps;
CREATE POLICY "Users can manage own rsvps" ON event_rsvps
  FOR INSERT
  WITH CHECK (user_id = auth.uid() AND can_rsvp_event(event_id));
