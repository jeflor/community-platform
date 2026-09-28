-- Add top_nav site_settings for editable top navigation
-- This stores the top navigation items (Pulse, Video Courses, Resources, etc.)
-- with customizable labels, visibility, and group access control

INSERT INTO site_settings (key, value, description) VALUES
  ('top_nav', '[
    {"key": "pulse", "label": "Pulse", "href": "/pulse", "icon": "📰", "enabled": true, "group_slugs": []},
    {"key": "video-courses", "label": "Video Courses", "href": "/courses", "icon": "🎓", "enabled": true, "group_slugs": []},
    {"key": "resources", "label": "Resources", "href": "/resources", "icon": "📚", "enabled": true, "group_slugs": []},
    {"key": "events", "label": "Events", "href": "/dashboard/events", "icon": "📅", "enabled": true, "group_slugs": []},
    {"key": "members", "label": "Members", "href": "/dashboard/members", "icon": "👥", "enabled": true, "group_slugs": []},
    {"key": "students", "label": "Students", "href": "/dashboard/coaches", "icon": "🎓", "enabled": true, "group_slugs": ["admin", "coach"]},
    {"key": "support", "label": "Support", "href": "/support", "icon": "💬", "enabled": true, "group_slugs": []}
  ]', 'Top navigation items with label, href, icon, enabled flag, and group access control')
ON CONFLICT (key) DO NOTHING;
