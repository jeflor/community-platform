-- Add event capacity and waitlist support
-- Allows events to have optional capacity limits with automatic waitlist management
-- (Part 2: capacity column, indexes, functions - after enum addition)

-- Add capacity column to events table
-- NULL means unlimited capacity
ALTER TABLE events
ADD COLUMN capacity INTEGER NULL CHECK (capacity IS NULL OR capacity > 0);

CREATE INDEX idx_events_capacity ON events(capacity) WHERE capacity IS NOT NULL;

-- Add index for efficient waitlist queries (oldest first)
CREATE INDEX idx_event_rsvps_waitlist ON event_rsvps(event_id, created_at) 
  WHERE status = 'waitlist';

-- Helper function to manage RSVP with capacity and waitlist
-- This function handles all the logic for RSVP creation/updates with capacity checks
-- and automatic waitlist promotion when spots open up.
CREATE OR REPLACE FUNCTION manage_event_rsvp(
  p_event_id UUID,
  p_user_id UUID,
  p_desired_status rsvp_status
)
RETURNS TABLE(
  actual_status rsvp_status,
  waitlist_position INTEGER
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_capacity INTEGER;
  v_going_count INTEGER;
  v_old_status rsvp_status;
  v_final_status rsvp_status;
  v_waitlist_pos INTEGER := NULL;
BEGIN
  -- Security: prevent caller spoofing
  IF p_user_id IS DISTINCT FROM auth.uid() AND NOT is_admin() THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  -- Security: verify user can RSVP to this event
  IF NOT can_rsvp_event(p_event_id) AND NOT is_admin() THEN
    RAISE EXCEPTION 'cannot rsvp';
  END IF;

  -- Get event capacity with row lock to prevent race conditions
  SELECT capacity INTO v_capacity
  FROM events
  WHERE id = p_event_id
  FOR UPDATE;

  -- Get user's current RSVP status if it exists
  SELECT status INTO v_old_status
  FROM event_rsvps
  WHERE event_id = p_event_id AND user_id = p_user_id;

  -- If trying to set status to 'going', check capacity
  IF p_desired_status = 'going' THEN
    -- Count current 'going' RSVPs (excluding this user if they're already going)
    SELECT COUNT(*) INTO v_going_count
    FROM event_rsvps
    WHERE event_id = p_event_id 
      AND status = 'going'
      AND (v_old_status IS NULL OR user_id != p_user_id);

    -- If capacity is set and we're at capacity, put them on waitlist instead
    IF v_capacity IS NOT NULL AND v_going_count >= v_capacity THEN
      v_final_status := 'waitlist';
    ELSE
      v_final_status := 'going';
    END IF;
  ELSE
    -- For any other status, use as requested
    v_final_status := p_desired_status;
  END IF;

  -- Upsert the RSVP
  INSERT INTO event_rsvps (event_id, user_id, status)
  VALUES (p_event_id, p_user_id, v_final_status)
  ON CONFLICT (event_id, user_id)
  DO UPDATE SET 
    status = v_final_status,
    updated_at = NOW();

  -- If user was 'going' and is now changing to something else (not_going, maybe, or removing)
  -- Promote the oldest waitlist entry
  IF v_old_status = 'going' AND v_final_status != 'going' THEN
    PERFORM promote_oldest_waitlist_entry(p_event_id);
  END IF;

  -- Calculate waitlist position if user is waitlisted
  IF v_final_status = 'waitlist' THEN
    SELECT COUNT(*) + 1 INTO v_waitlist_pos
    FROM event_rsvps
    WHERE event_id = p_event_id
      AND status = 'waitlist'
      AND created_at < (
        SELECT created_at FROM event_rsvps 
        WHERE event_id = p_event_id AND user_id = p_user_id
      );
  END IF;

  RETURN QUERY SELECT v_final_status, v_waitlist_pos;
END;
$$;

-- Helper function to promote the oldest waitlist entry to 'going'
-- Called when a 'going' RSVP is removed/changed
CREATE OR REPLACE FUNCTION promote_oldest_waitlist_entry(p_event_id UUID)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_capacity INTEGER;
  v_going_count INTEGER;
  v_next_user_id UUID;
BEGIN
  -- Get event capacity with row lock to prevent race conditions
  SELECT capacity INTO v_capacity
  FROM events
  WHERE id = p_event_id
  FOR UPDATE;

  -- If no capacity limit, no waitlist management needed
  IF v_capacity IS NULL THEN
    RETURN;
  END IF;

  -- Count current 'going' RSVPs
  SELECT COUNT(*) INTO v_going_count
  FROM event_rsvps
  WHERE event_id = p_event_id AND status = 'going';

  -- If we're under capacity and there's someone on the waitlist, promote them
  IF v_going_count < v_capacity THEN
    -- Get the oldest waitlist entry
    SELECT user_id INTO v_next_user_id
    FROM event_rsvps
    WHERE event_id = p_event_id AND status = 'waitlist'
    ORDER BY created_at ASC
    LIMIT 1;

    -- Promote them if found
    IF v_next_user_id IS NOT NULL THEN
      UPDATE event_rsvps
      SET status = 'going', updated_at = NOW()
      WHERE event_id = p_event_id AND user_id = v_next_user_id;
    END IF;
  END IF;
END;
$$;

-- Function to delete RSVP and promote waitlist
-- This is used when a user removes their RSVP entirely
CREATE OR REPLACE FUNCTION delete_rsvp_and_promote(
  p_event_id UUID,
  p_user_id UUID
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_old_status rsvp_status;
BEGIN
  -- Security: prevent caller spoofing
  IF p_user_id IS DISTINCT FROM auth.uid() AND NOT is_admin() THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  -- Security: verify user can RSVP to this event
  IF NOT can_rsvp_event(p_event_id) AND NOT is_admin() THEN
    RAISE EXCEPTION 'cannot rsvp';
  END IF;

  -- Get the current status
  SELECT status INTO v_old_status
  FROM event_rsvps
  WHERE event_id = p_event_id AND user_id = p_user_id;

  -- Delete the RSVP
  DELETE FROM event_rsvps
  WHERE event_id = p_event_id AND user_id = p_user_id;

  -- If they were 'going', try to promote someone from waitlist
  IF v_old_status = 'going' THEN
    PERFORM promote_oldest_waitlist_entry(p_event_id);
  END IF;
END;
$$;

-- Grant execute permissions to authenticated users for client-callable functions
GRANT EXECUTE ON FUNCTION manage_event_rsvp(UUID, UUID, rsvp_status) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_rsvp_and_promote(UUID, UUID) TO authenticated;

-- Revoke from public/anon for security
REVOKE EXECUTE ON FUNCTION manage_event_rsvp(UUID, UUID, rsvp_status) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION delete_rsvp_and_promote(UUID, UUID) FROM PUBLIC, anon;

-- promote_oldest_waitlist_entry is internal only - revoke from everyone
-- Only called by other SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION promote_oldest_waitlist_entry(UUID) FROM authenticated, PUBLIC, anon;

-- Ensure can_rsvp_event is available to authenticated users (needed for security checks)
GRANT EXECUTE ON FUNCTION can_rsvp_event(UUID) TO authenticated;
