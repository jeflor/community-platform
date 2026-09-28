-- Add new site settings for Phase 6
-- This migration adds site name, tagline, member defaults, per-type locked messages, and theme settings

-- Insert new site settings (use ON CONFLICT DO NOTHING to avoid overwriting existing values)
INSERT INTO site_settings (key, value, description) VALUES
  ('site_name', '"Community Platform"', 'Community/site name shown across the app')
ON CONFLICT (key) DO NOTHING;

INSERT INTO site_settings (key, value, description) VALUES
  ('site_tagline', '""', 'Optional short tagline/description for the community')
ON CONFLICT (key) DO NOTHING;

INSERT INTO site_settings (key, value, description) VALUES
  ('member_defaults', '{"weekly_digest": true, "pending_user_followups": true}', 'Default notification and follow-up settings for new members')
ON CONFLICT (key) DO NOTHING;

INSERT INTO site_settings (key, value, description) VALUES
  ('locked_messages', '{"courses": "This content is available to premium members.", "channels": "This channel is available to premium members.", "events": "This event is available to premium members.", "documents": "This document is available to premium members."}', 'Per-content-type locked messages')
ON CONFLICT (key) DO NOTHING;

INSERT INTO site_settings (key, value, description) VALUES
  ('theme', '{"primary_color": "#3b82f6", "logo_url": ""}', 'Theme settings including primary accent color and logo')
ON CONFLICT (key) DO NOTHING;

-- Migrate existing locked_message_text to locked_messages if it exists
-- This will preserve any custom locked message that was set before
DO $$
DECLARE
  old_message TEXT;
BEGIN
  -- Get the existing locked_message_text value
  SELECT value::text INTO old_message FROM site_settings WHERE key = 'locked_message_text';
  
  IF old_message IS NOT NULL AND old_message != '""' THEN
    -- Update locked_messages with the old value for all content types
    UPDATE site_settings 
    SET value = jsonb_build_object(
      'courses', old_message::jsonb,
      'channels', old_message::jsonb,
      'events', old_message::jsonb,
      'documents', old_message::jsonb
    )
    WHERE key = 'locked_messages';
  END IF;
END $$;
