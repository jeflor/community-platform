-- Phase 5: Events System Migration
-- Creates events, event_groups, and event_rsvps tables
-- Adds RLS policies for event-based access control with visibility settings

-- Create RSVP status enum
CREATE TYPE rsvp_status AS ENUM ('going', 'not_going', 'maybe');

-- Create events table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  zoom_url TEXT,
  cover_url TEXT,
  locked_message TEXT,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_event_times CHECK (ends_at > starts_at)
);

-- Create event_groups junction table (access control)
CREATE TABLE event_groups (
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES access_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, group_id)
);

-- Create event_rsvps table
CREATE TABLE event_rsvps (
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status rsvp_status NOT NULL DEFAULT 'going',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, user_id)
);

-- Create indexes
CREATE INDEX idx_events_starts_at ON events(starts_at);
CREATE INDEX idx_events_ends_at ON events(ends_at);
CREATE INDEX idx_events_is_visible ON events(is_visible);
CREATE INDEX idx_events_created_by ON events(created_by);
CREATE INDEX idx_event_groups_event_id ON event_groups(event_id);
CREATE INDEX idx_event_groups_group_id ON event_groups(group_id);
CREATE INDEX idx_event_rsvps_event_id ON event_rsvps(event_id);
CREATE INDEX idx_event_rsvps_user_id ON event_rsvps(user_id);
CREATE INDEX idx_event_rsvps_status ON event_rsvps(status);

-- Add updated_at triggers
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_rsvps_updated_at BEFORE UPDATE ON event_rsvps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user can see an event
-- User can see an event if:
-- 1. They are admin, OR
-- 2. The event is visible AND they belong to any group assigned to the event
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
  
  -- Check if event is visible and user is in any group that has access
  RETURN EXISTS (
    SELECT 1
    FROM events e
    INNER JOIN event_groups eg ON eg.event_id = e.id
    INNER JOIN group_members gm ON gm.group_id = eg.group_id
    WHERE e.id = event_uuid
      AND e.is_visible = true
      AND gm.user_id = auth.uid()
  );
END;
$$;

-- Revoke execute from anon and authenticated for security
REVOKE EXECUTE ON FUNCTION can_see_event(UUID) FROM anon, authenticated;

-- RLS Policies for events table
-- Admins can manage all events
CREATE POLICY "Admins can manage events" ON events
  FOR ALL
  USING (is_admin());

-- Users can view accessible visible events
CREATE POLICY "Users can view accessible events" ON events
  FOR SELECT
  USING (can_see_event(id));

-- RLS Policies for event_groups table
-- Admins can manage event group assignments
CREATE POLICY "Admins can manage event groups" ON event_groups
  FOR ALL
  USING (is_admin());

-- Users can view event group assignments for events they can see
CREATE POLICY "Users can view event groups for accessible events" ON event_groups
  FOR SELECT
  USING (can_see_event(event_id));

-- RLS Policies for event_rsvps table
-- Users can view RSVPs for events they can see
CREATE POLICY "Users can view rsvps for accessible events" ON event_rsvps
  FOR SELECT
  USING (can_see_event(event_id));

-- Users can create/update their own RSVPs for events they can see
CREATE POLICY "Users can manage own rsvps" ON event_rsvps
  FOR INSERT
  WITH CHECK (user_id = auth.uid() AND can_see_event(event_id));

CREATE POLICY "Users can update own rsvps" ON event_rsvps
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own rsvps" ON event_rsvps
  FOR DELETE
  USING (user_id = auth.uid());

-- Admins can view/manage all RSVPs
CREATE POLICY "Admins can view all rsvps" ON event_rsvps
  FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can manage all rsvps" ON event_rsvps
  FOR ALL
  USING (is_admin());
