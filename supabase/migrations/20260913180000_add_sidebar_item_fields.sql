-- Add reference-style fields to sidebar_items
-- channel_type: threads (default, /resources/*), chat (hidden for now), voice (skip)
-- read_only: boolean for read-only channels
-- description: rich text description
-- banner_image: optional banner image URL

ALTER TABLE public.sidebar_items
ADD COLUMN IF NOT EXISTS channel_type TEXT DEFAULT 'threads' CHECK (channel_type IN ('threads', 'chat', 'voice')),
ADD COLUMN IF NOT EXISTS read_only BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS banner_image TEXT;

COMMENT ON COLUMN public.sidebar_items.channel_type IS 'channel type: threads (default, maps to /resources/*), chat (hidden), voice (skip)';
COMMENT ON COLUMN public.sidebar_items.read_only IS 'If true, channel is read-only';
COMMENT ON COLUMN public.sidebar_items.description IS 'Rich text description shown in channel';
COMMENT ON COLUMN public.sidebar_items.banner_image IS 'Optional banner image URL';
