-- Add navigation items, expanded theme settings, and optional general settings
-- This migration extends Phase 6 site settings with high-value navigation configuration

-- Insert support_email setting
INSERT INTO site_settings (key, value, description) VALUES
  ('support_email', '""', 'Support email address for the community')
ON CONFLICT (key) DO NOTHING;

-- Insert direct_messaging_enabled setting
INSERT INTO site_settings (key, value, description) VALUES
  ('direct_messaging_enabled', '"true"', 'Whether direct messaging is enabled (feature not yet implemented)')
ON CONFLICT (key) DO NOTHING;

-- Insert show_powered_by setting
INSERT INTO site_settings (key, value, description) VALUES
  ('show_powered_by', '"false"', 'Whether to show "Powered by" branding')
ON CONFLICT (key) DO NOTHING;

-- Insert navigation items configuration
-- Default nav items matching Free Members / Paid Students IA
-- Admin must create matching access groups with these slugs: free-members, paid-students
INSERT INTO site_settings (key, value, description) VALUES
  ('nav_items', '[
    {
      "id": "dashboard",
      "enabled": true,
      "label": "Dashboard",
      "href": "/dashboard",
      "group_slugs": [],
      "is_custom": false
    },
    {
      "id": "courses",
      "enabled": true,
      "label": "Video Courses",
      "href": "/courses",
      "group_slugs": ["free-members", "paid-students"],
      "is_custom": false
    },
    {
      "id": "events",
      "enabled": true,
      "label": "Events",
      "href": "/dashboard/events",
      "group_slugs": ["paid-students"],
      "is_custom": false
    },
    {
      "id": "offers",
      "enabled": true,
      "label": "Offers",
      "href": "/dashboard/offers",
      "group_slugs": [],
      "is_custom": false
    }
  ]', 'Navigation items configuration with group-based access control')
ON CONFLICT (key) DO NOTHING;

-- Update theme setting to include background and gradient colors
-- This updates existing theme records or inserts if missing
INSERT INTO site_settings (key, value, description) VALUES
  ('theme', '{
    "primary_color": "#3b82f6",
    "logo_url": "",
    "background_color": "#FFFFFF",
    "gradient_start": "#EAF0FB",
    "gradient_end": "#FBF5D6",
    "sidebar_gradient": false
  }', 'Theme settings including colors, logo, and gradients')
ON CONFLICT (key) DO UPDATE SET
  value = CASE
    WHEN site_settings.value ? 'background_color' THEN site_settings.value
    ELSE site_settings.value || '{"background_color": "#FFFFFF", "gradient_start": "#EAF0FB", "gradient_end": "#FBF5D6", "sidebar_gradient": false}'::jsonb
  END,
  description = 'Theme settings including colors, logo, and gradients';
