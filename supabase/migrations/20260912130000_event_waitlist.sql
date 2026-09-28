-- Add 'waitlist' status to rsvp_status enum
-- Must be in separate transaction from indexes/functions that reference it
ALTER TYPE rsvp_status ADD VALUE IF NOT EXISTS 'waitlist';
