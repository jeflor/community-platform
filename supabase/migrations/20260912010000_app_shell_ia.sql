-- Application shell and information architecture
-- Adds sidebar_sections for configurable navigation and pulse_posts for Pulse feed

-- Create sidebar_sections table for admin-editable navigation
CREATE TABLE IF NOT EXISTS public.sidebar_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  collapsed_default BOOLEAN NOT NULL DEFAULT false,
  group_slugs TEXT[] DEFAULT ARRAY[]::TEXT[], -- empty array = everyone who can see the section
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create sidebar_items table for navigation items within sections
CREATE TABLE IF NOT EXISTS public.sidebar_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES public.sidebar_sections(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  href TEXT NOT NULL,
  icon TEXT, -- emoji or icon class
  position INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  group_slugs TEXT[] DEFAULT ARRAY[]::TEXT[], -- empty = everyone who can see the section
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create pulse_posts table for Pulse feed
CREATE TABLE IF NOT EXISTS public.pulse_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sidebar_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sidebar_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_posts ENABLE ROW LEVEL SECURITY;

-- Sidebar sections: readable by all authenticated, writable by admin
CREATE POLICY "Sidebar sections are readable by authenticated users"
  ON public.sidebar_sections FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Sidebar sections are writable by admins"
  ON public.sidebar_sections FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Sidebar items: readable by all authenticated, writable by admin
CREATE POLICY "Sidebar items are readable by authenticated users"
  ON public.sidebar_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Sidebar items are writable by admins"
  ON public.sidebar_items FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Pulse posts: readable by authenticated (if in everyone), writable by own user
CREATE POLICY "Pulse posts are readable by authenticated users"
  ON public.pulse_posts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own pulse posts"
  ON public.pulse_posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pulse posts"
  ON public.pulse_posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pulse posts"
  ON public.pulse_posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_sidebar_sections_position ON public.sidebar_sections(position);
CREATE INDEX idx_sidebar_items_section_position ON public.sidebar_items(section_id, position);
CREATE INDEX idx_pulse_posts_created ON public.pulse_posts(created_at DESC);

-- Seed default sidebar sections and items based on the instructor IA
-- Section 1: START HERE (Everyone)
INSERT INTO public.sidebar_sections (name, position, collapsed_default, group_slugs)
VALUES ('START HERE', 0, false, ARRAY[]::TEXT[])
RETURNING id AS start_here_id \gset

INSERT INTO public.sidebar_items (section_id, label, href, position, group_slugs) VALUES
  (:'start_here_id', 'Announcements', '/resources/announcements', 0, ARRAY[]::TEXT[]);

-- Section 2: FOUNDATIONAL RESOURCES (Everyone)
INSERT INTO public.sidebar_sections (name, position, collapsed_default, group_slugs)
VALUES ('FOUNDATIONAL RESOURCES', 1, false, ARRAY[]::TEXT[])
RETURNING id AS foundational_id \gset

INSERT INTO public.sidebar_items (section_id, label, href, position, group_slugs) VALUES
  (:'foundational_id', 'The Insiders Report', '/resources/insiders-report', 0, ARRAY[]::TEXT[]),
  (:'foundational_id', 'State Auction Guide', '/resources/state-auction-guide', 1, ARRAY[]::TEXT[]),
  (:'foundational_id', 'Platinum Directory', '/resources/platinum-directory', 2, ARRAY[]::TEXT[]),
  (:'foundational_id', 'Hotspot Calendar', '/resources/hotspot-calendar', 3, ARRAY[]::TEXT[]),
  (:'foundational_id', 'Tax Sale Opportunities', '/resources/tax-sale-opportunities', 4, ARRAY[]::TEXT[]),
  (:'foundational_id', 'Upcoming Auctions', '/resources/upcoming-auctions', 5, ARRAY[]::TEXT[]),
  (:'foundational_id', 'Tax Defaulted Properties', '/resources/tax-defaulted-properties', 6, ARRAY[]::TEXT[]),
  (:'foundational_id', 'Revenue Certificates Manual', '/resources/revenue-certificates-manual', 7, ARRAY[]::TEXT[]),
  (:'foundational_id', 'Revenue Certificates Video', '/resources/revenue-certificates-video', 8, ARRAY[]::TEXT[]);

-- Section 3: COACHING (Paid Students only - Way to Wealth Program is Paid, others are Admin+Paid)
INSERT INTO public.sidebar_sections (name, position, collapsed_default, group_slugs)
VALUES ('COACHING', 2, false, ARRAY['paid-students']::TEXT[])
RETURNING id AS coaching_id \gset

INSERT INTO public.sidebar_items (section_id, label, href, position, group_slugs) VALUES
  (:'coaching_id', 'Way to Wealth Program', '/resources/way-to-wealth', 0, ARRAY['paid-students']::TEXT[]),
  (:'coaching_id', 'Intensive Business Growth System', '/resources/intensive-business-growth', 1, ARRAY['paid-students']::TEXT[]),
  (:'coaching_id', 'Deal Multiplier Formula', '/resources/deal-multiplier', 2, ARRAY['paid-students']::TEXT[]),
  (:'coaching_id', 'Research Service', '/resources/research-service', 3, ARRAY['paid-students']::TEXT[]);

-- Section 4: COURSES (Everyone - sidebar shortcuts)
INSERT INTO public.sidebar_sections (name, position, collapsed_default, group_slugs)
VALUES ('COURSES', 3, false, ARRAY[]::TEXT[])
RETURNING id AS courses_section_id \gset

INSERT INTO public.sidebar_items (section_id, label, href, position, group_slugs) VALUES
  (:'courses_section_id', 'Investing Fundamentals', '/courses/investing-fundamentals', 0, ARRAY[]::TEXT[]),
  (:'courses_section_id', 'Hand Holding - Deal Making', '/courses/hand-holding-deal-making', 1, ARRAY[]::TEXT[]),
  (:'courses_section_id', 'Tax Lien Certificates', '/courses/tax-lien-certificates', 2, ARRAY[]::TEXT[]);

-- Section 5: INTERACTIVE TRAINING (Mixed: 3-Day-Workshop = Everyone, Wednesday/Live = Paid)
INSERT INTO public.sidebar_sections (name, position, collapsed_default, group_slugs)
VALUES ('INTERACTIVE TRAINING', 4, false, ARRAY[]::TEXT[])
RETURNING id AS training_id \gset

INSERT INTO public.sidebar_items (section_id, label, href, position, group_slugs) VALUES
  (:'training_id', '3-Day-Workshop', '/resources/3-day-workshop', 0, ARRAY[]::TEXT[]),
  (:'training_id', 'Wednesday Sessions', '/resources/wednesday-sessions', 1, ARRAY['paid-students']::TEXT[]),
  (:'training_id', 'Live Support Schedule', '/resources/live-support-schedule', 2, ARRAY['paid-students']::TEXT[]);

-- Section 6: THE AI HUB (Everyone)
INSERT INTO public.sidebar_sections (name, position, collapsed_default, group_slugs)
VALUES ('THE AI HUB', 5, false, ARRAY[]::TEXT[])
RETURNING id AS ai_hub_id \gset

INSERT INTO public.sidebar_items (section_id, label, href, position, group_slugs) VALUES
  (:'ai_hub_id', 'Talk to the AI Assistant', '/resources/virtual-assistant', 0, ARRAY[]::TEXT[]),
  (:'ai_hub_id', 'Deal Repair Estimator', '/resources/deal-repair-estimator', 1, ARRAY[]::TEXT[]),
  (:'ai_hub_id', 'Max Bid Calculator', '/resources/max-bid-calculator', 2, ARRAY[]::TEXT[]),
  (:'ai_hub_id', 'Lien and Deed Decoder', '/resources/lien-deed-decoder', 3, ARRAY[]::TEXT[]),
  (:'ai_hub_id', 'Property List Scanner', '/resources/property-list-scanner', 4, ARRAY[]::TEXT[]),
  (:'ai_hub_id', 'Statutes and Auctions', '/resources/statutes-auctions', 5, ARRAY[]::TEXT[]);

-- Section 7: MAGIC MAP (Everyone, Book a Demo visible to admin)
INSERT INTO public.sidebar_sections (name, position, collapsed_default, group_slugs)
VALUES ('MAGIC MAP', 6, false, ARRAY[]::TEXT[])
RETURNING id AS magic_map_id \gset

INSERT INTO public.sidebar_items (section_id, label, href, position, group_slugs) VALUES
  (:'magic_map_id', 'Magic Map', '/resources/magic-map', 0, ARRAY[]::TEXT[]),
  (:'magic_map_id', 'Book a Demo', '/resources/book-demo', 1, ARRAY[]::TEXT[]);

-- Section 8: BONUS RESOURCE CENTER (Everyone)
INSERT INTO public.sidebar_sections (name, position, collapsed_default, group_slugs)
VALUES ('BONUS RESOURCE CENTER', 7, false, ARRAY[]::TEXT[])
RETURNING id AS bonus_id \gset

INSERT INTO public.sidebar_items (section_id, label, href, position, group_slugs) VALUES
  (:'bonus_id', 'Daily Tutorials Library', '/resources/daily-tutorials', 0, ARRAY[]::TEXT[]),
  (:'bonus_id', 'Property Research', '/resources/property-research', 1, ARRAY[]::TEXT[]),
  (:'bonus_id', 'White Papers', '/resources/white-papers', 2, ARRAY[]::TEXT[]),
  (:'bonus_id', 'Marketing and Selling', '/resources/marketing-selling', 3, ARRAY[]::TEXT[]),
  (:'bonus_id', 'Geographic Info System', '/resources/gis', 4, ARRAY[]::TEXT[]),
  (:'bonus_id', 'Investor Resources', '/resources/investor-resources', 5, ARRAY[]::TEXT[]);

-- Section 9: CODE OF CONDUCT (Everyone)
INSERT INTO public.sidebar_sections (name, position, collapsed_default, group_slugs)
VALUES ('CODE OF CONDUCT', 8, false, ARRAY[]::TEXT[])
RETURNING id AS conduct_id \gset

INSERT INTO public.sidebar_items (section_id, label, href, position, group_slugs) VALUES
  (:'conduct_id', 'Code of Conduct', '/resources/code-of-conduct', 0, ARRAY[]::TEXT[]);

-- Add logo_url and gradient settings to site_settings if not present
INSERT INTO site_settings (key, value, description) VALUES
  ('logo_url', '""', 'URL to community logo image')
ON CONFLICT (key) DO NOTHING;
