-- Add recording_url column to events table
-- This allows admins to add a recording link for past events

ALTER TABLE events ADD COLUMN recording_url TEXT;

-- Add index for querying events with recordings
CREATE INDEX idx_events_recording_url ON events(recording_url) WHERE recording_url IS NOT NULL;
