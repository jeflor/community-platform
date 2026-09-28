-- Rebuild sidebar sections and items into the current default structure
-- This migration rebuilds sidebar_sections and sidebar_items to reflect the current source inventory

-- Delete existing sections (CASCADE will delete items)
DELETE FROM public.sidebar_sections;

-- Section 1: START HERE (Everyone)
WITH s AS (
  INSERT INTO public.sidebar_sections (name, position, collapsed_default, group_slugs)
  VALUES ('START HERE', 0, false, ARRAY[]::TEXT[])
  RETURNING id
)
INSERT INTO public.sidebar_items (section_id, label, href, icon, position, enabled, channel_type, group_slugs)
SELECT s.id, v.label, v.href, v.icon, v.position, true, 'threads', v.group_slugs
FROM s
CROSS JOIN (VALUES
  ('Welcome Start Here', '/resources/welcome-start-here', '👋', 0, ARRAY[]::TEXT[]),
  ('Introduce Yourself', '/resources/introduce-yourself', '🗣️', 1, ARRAY[]::TEXT[]),
  ('Announcements', '/resources/announcements', '📣', 2, ARRAY[]::TEXT[]),
  ('Events', '/dashboard/events', '📆', 3, ARRAY[]::TEXT[]),
  ('Voice Room', '/resources/voice-room', '🔊', 4, ARRAY[]::TEXT[])
) AS v(label, href, icon, position, group_slugs);

-- Section 2: FOUNDATIONAL RESOURCES (Everyone)
WITH s AS (
  INSERT INTO public.sidebar_sections (name, position, collapsed_default, group_slugs)
  VALUES ('FOUNDATIONAL RESOURCES', 1, false, ARRAY[]::TEXT[])
  RETURNING id
)
INSERT INTO public.sidebar_items (section_id, label, href, icon, position, enabled, channel_type, group_slugs)
SELECT s.id, v.label, v.href, v.icon, v.position, true, 'threads', v.group_slugs
FROM s
CROSS JOIN (VALUES
  ('The Insiders Report', '/resources/insiders-report', '🔵', 0, ARRAY[]::TEXT[]),
  ('State Auction Guide', '/resources/state-auction-guide', '🔵', 1, ARRAY[]::TEXT[]),
  ('Platinum Directory', '/resources/platinum-directory', '🔵', 2, ARRAY[]::TEXT[]),
  ('Hotspot Calendar', '/resources/hotspot-calendar', '🔵', 3, ARRAY[]::TEXT[]),
  ('Tax Sale Opportunities', '/resources/tax-sale-opportunities', '🔵', 4, ARRAY[]::TEXT[]),
  ('Upcoming Auctions', '/resources/upcoming-auctions', '🔵', 5, ARRAY[]::TEXT[]),
  ('Tax Defaulted Properties', '/resources/tax-defaulted-properties', '🔵', 6, ARRAY[]::TEXT[]),
  ('Revenue Certificates Manual', '/resources/revenue-certificates-manual', '🔵', 7, ARRAY[]::TEXT[]),
  ('Revenue Certificates Video', '/resources/revenue-certificates-video', '🔵', 8, ARRAY[]::TEXT[])
) AS v(label, href, icon, position, group_slugs);

-- Section 3: YOUR COMMUNITY (Everyone)
WITH s AS (
  INSERT INTO public.sidebar_sections (name, position, collapsed_default, group_slugs)
  VALUES ('YOUR COMMUNITY', 2, false, ARRAY[]::TEXT[])
  RETURNING id
)
INSERT INTO public.sidebar_items (section_id, label, href, icon, position, enabled, channel_type, group_slugs)
SELECT s.id, v.label, v.href, v.icon, v.position, true, 'threads', v.group_slugs
FROM s
CROSS JOIN (VALUES
  ('General Discussion', '/resources/general-discussion', '💬', 0, ARRAY[]::TEXT[]),
  ('Tax Liens 101', '/resources/tax-liens-101', '📜', 1, ARRAY[]::TEXT[]),
  ('Tax Deeds 101', '/resources/tax-deeds-101', '🏡', 2, ARRAY[]::TEXT[]),
  ('States And Auctions', '/resources/states-and-auctions', '🇺🇸', 3, ARRAY[]::TEXT[]),
  ('Wins And Progress', '/resources/wins-and-progress', '🏆', 4, ARRAY[]::TEXT[]),
  ('Free Resources', '/resources/free-resources', '🎁', 5, ARRAY[]::TEXT[]),
  ('Next Steps', '/resources/next-steps', '🎓', 6, ARRAY[]::TEXT[]),
  ('The Free Foundational Resources', '/resources/the-free-foundational-resources', '🧵', 7, ARRAY[]::TEXT[])
) AS v(label, href, icon, position, group_slugs);

-- Section 4: STUDENT MEMBERSHIP (Header only, no items, Everyone)
INSERT INTO public.sidebar_sections (name, position, collapsed_default, group_slugs)
VALUES ('STUDENT MEMBERSHIP', 3, false, ARRAY[]::TEXT[]);

-- Section 5: LOOK HERE (Paid Students)
WITH s AS (
  INSERT INTO public.sidebar_sections (name, position, collapsed_default, group_slugs)
  VALUES ('LOOK HERE', 4, false, ARRAY['paid-students']::TEXT[])
  RETURNING id
)
INSERT INTO public.sidebar_items (section_id, label, href, icon, position, enabled, channel_type, group_slugs)
SELECT s.id, v.label, v.href, v.icon, v.position, true, 'threads', v.group_slugs
FROM s
CROSS JOIN (VALUES
  ('Student Roadmap', '/resources/student-roadmap', '🧭', 0, ARRAY['paid-students']::TEXT[]),
  ('Tax Lien Investing', '/resources/tax-lien-investing', '📜', 1, ARRAY['paid-students']::TEXT[]),
  ('Tax Deed Investing', '/resources/tax-deed-investing', '🏠', 2, ARRAY['paid-students']::TEXT[]),
  ('Property Review Room', '/resources/property-review-room', '🏘️', 3, ARRAY['paid-students']::TEXT[]),
  ('State And County Research', '/resources/state-and-county-research', '📍', 4, ARRAY['paid-students']::TEXT[]),
  ('Due Dilligence Support', '/resources/due-dilligence-support', '🔍', 5, ARRAY['paid-students']::TEXT[]),
  ('Student Deals And Wins', '/resources/student-deals-and-wins', '🏆', 6, ARRAY['paid-students']::TEXT[])
) AS v(label, href, icon, position, group_slugs);

-- Section 6: COURSES (Everyone)
WITH s AS (
  INSERT INTO public.sidebar_sections (name, position, collapsed_default, group_slugs)
  VALUES ('COURSES', 5, false, ARRAY[]::TEXT[])
  RETURNING id
)
INSERT INTO public.sidebar_items (section_id, label, href, icon, position, enabled, channel_type, group_slugs)
SELECT s.id, v.label, v.href, v.icon, v.position, true, 'threads', v.group_slugs
FROM s
CROSS JOIN (VALUES
  ('Investing Fundamentals', '/courses/investing-fundamentals', '🔵', 0, ARRAY[]::TEXT[]),
  ('Hand Holding - Deal Making', '/courses/hand-holding-deal-making', '🔵', 1, ARRAY[]::TEXT[]),
  ('Tax Lien Certificates', '/courses/tax-lien-certificates', '🔵', 2, ARRAY[]::TEXT[]),
  ('Making Money Carefully', '/courses/making-money-carefully', '🔵', 3, ARRAY[]::TEXT[]),
  ('Classic Accelerated Program', '/courses/classic-investing-fundamentals-accelerated', '🔵', 4, ARRAY[]::TEXT[]),
  ('Classic Hand Holding Deal Making', '/courses/classic-hand-holding-deal-making', '🔵', 5, ARRAY[]::TEXT[]),
  ('Quick Start Program', '/courses/quick-start-program', '🔵', 6, ARRAY[]::TEXT[])
) AS v(label, href, icon, position, group_slugs);

-- Section 7: RESOURCES (Everyone)
WITH s AS (
  INSERT INTO public.sidebar_sections (name, position, collapsed_default, group_slugs)
  VALUES ('RESOURCES', 6, false, ARRAY[]::TEXT[])
  RETURNING id
)
INSERT INTO public.sidebar_items (section_id, label, href, icon, position, enabled, channel_type, group_slugs)
SELECT s.id, v.label, v.href, v.icon, v.position, true, 'threads', v.group_slugs
FROM s
CROSS JOIN (VALUES
  ('Overview', '/resources/overview', '📌', 0, ARRAY[]::TEXT[])
) AS v(label, href, icon, position, group_slugs);

-- Section 8: COACHING (Paid Students)
WITH s AS (
  INSERT INTO public.sidebar_sections (name, position, collapsed_default, group_slugs)
  VALUES ('COACHING', 7, false, ARRAY['paid-students']::TEXT[])
  RETURNING id
)
INSERT INTO public.sidebar_items (section_id, label, href, icon, position, enabled, channel_type, group_slugs)
SELECT s.id, v.label, v.href, v.icon, v.position, true, 'threads', v.group_slugs
FROM s
CROSS JOIN (VALUES
  ('Way to Wealth Program', '/resources/way-to-wealth', '🔵', 0, ARRAY['paid-students']::TEXT[]),
  ('Intensive Business Growth System', '/resources/intensive-business-growth', '🔵', 1, ARRAY['paid-students']::TEXT[]),
  ('Deal Multiplier Formula', '/resources/deal-multiplier', '🔵', 2, ARRAY['paid-students']::TEXT[]),
  ('Research Service', '/resources/research-service', '🔵', 3, ARRAY['paid-students']::TEXT[])
) AS v(label, href, icon, position, group_slugs);

-- Section 9: INTERACTIVE TRAINING (Everyone)
WITH s AS (
  INSERT INTO public.sidebar_sections (name, position, collapsed_default, group_slugs)
  VALUES ('INTERACTIVE TRAINING', 8, false, ARRAY[]::TEXT[])
  RETURNING id
)
INSERT INTO public.sidebar_items (section_id, label, href, icon, position, enabled, channel_type, group_slugs)
SELECT s.id, v.label, v.href, v.icon, v.position, true, 'threads', v.group_slugs
FROM s
CROSS JOIN (VALUES
  ('Wednesday Sessions', '/resources/wednesday-sessions', '🔵', 0, ARRAY[]::TEXT[]),
  ('Live Support Schedule', '/resources/live-support-schedule', '🔵', 1, ARRAY[]::TEXT[]),
  ('3-Day-Workshop', '/resources/3-day-workshop', '🎓', 2, ARRAY[]::TEXT[])
) AS v(label, href, icon, position, group_slugs);

-- Section 10: THE AI HUB (Everyone)
WITH s AS (
  INSERT INTO public.sidebar_sections (name, position, collapsed_default, group_slugs)
  VALUES ('THE AI HUB', 9, false, ARRAY[]::TEXT[])
  RETURNING id
)
INSERT INTO public.sidebar_items (section_id, label, href, icon, position, enabled, channel_type, group_slugs)
SELECT s.id, v.label, v.href, v.icon, v.position, true, 'threads', v.group_slugs
FROM s
CROSS JOIN (VALUES
  ('Talk to the AI Assistant', '/resources/virtual-assistant', '🔵', 0, ARRAY[]::TEXT[]),
  ('Deal Repair Estimator', '/resources/deal-repair-estimator', '🔵', 1, ARRAY[]::TEXT[]),
  ('Max Bid Calculator', '/resources/max-bid-calculator', '🔵', 2, ARRAY[]::TEXT[]),
  ('Lien and Deed Decoder', '/resources/lien-deed-decoder', '🔵', 3, ARRAY[]::TEXT[]),
  ('Property List Scanner', '/resources/property-list-scanner', '🔵', 4, ARRAY[]::TEXT[]),
  ('Statutes and Auctions', '/resources/statutes-auctions', '🔵', 5, ARRAY[]::TEXT[])
) AS v(label, href, icon, position, group_slugs);

-- Section 11: MAGIC MAP (Everyone)
WITH s AS (
  INSERT INTO public.sidebar_sections (name, position, collapsed_default, group_slugs)
  VALUES ('MAGIC MAP', 10, false, ARRAY[]::TEXT[])
  RETURNING id
)
INSERT INTO public.sidebar_items (section_id, label, href, icon, position, enabled, channel_type, group_slugs)
SELECT s.id, v.label, v.href, v.icon, v.position, true, 'threads', v.group_slugs
FROM s
CROSS JOIN (VALUES
  ('Magic Map', '/resources/magic-map', '🔵', 0, ARRAY[]::TEXT[]),
  ('Book a Demo', '/resources/book-demo', '📞', 1, ARRAY[]::TEXT[])
) AS v(label, href, icon, position, group_slugs);

-- Section 12: BONUS RESOURCE CENTER (Header only, no items, Everyone)
INSERT INTO public.sidebar_sections (name, position, collapsed_default, group_slugs)
VALUES ('BONUS RESOURCE CENTER', 11, false, ARRAY[]::TEXT[]);

-- Section 13: WHITE PAPERS (Everyone)
WITH s AS (
  INSERT INTO public.sidebar_sections (name, position, collapsed_default, group_slugs)
  VALUES ('WHITE PAPERS', 12, false, ARRAY[]::TEXT[])
  RETURNING id
)
INSERT INTO public.sidebar_items (section_id, label, href, icon, position, enabled, channel_type, group_slugs)
SELECT s.id, v.label, v.href, v.icon, v.position, true, 'threads', v.group_slugs
FROM s
CROSS JOIN (VALUES
  ('Quiet Title', '/resources/quiet-title', '🔵', 0, ARRAY[]::TEXT[]),
  ('Bankruptcy and Home Ownership', '/resources/bankruptcy-and-home-ownership', '🔵', 1, ARRAY[]::TEXT[]),
  ('Quit Claim Deeds', '/resources/quit-claim-deeds', '🔵', 2, ARRAY[]::TEXT[]),
  ('Value in Tax Defaulted Properties', '/resources/value-in-tax-defaulted-properties', '🔵', 3, ARRAY[]::TEXT[]),
  ('Lady in a Red Dress', '/resources/lady-in-a-red-dress', '🔵', 4, ARRAY[]::TEXT[]),
  ('Treasurer Office', '/resources/treasurer-office', '🔵', 5, ARRAY[]::TEXT[])
) AS v(label, href, icon, position, group_slugs);

-- Section 14: DAILY TUTORIALS LIBRARY (Everyone)
WITH s AS (
  INSERT INTO public.sidebar_sections (name, position, collapsed_default, group_slugs)
  VALUES ('DAILY TUTORIALS LIBRARY', 13, false, ARRAY[]::TEXT[])
  RETURNING id
)
INSERT INTO public.sidebar_items (section_id, label, href, icon, position, enabled, channel_type, group_slugs)
SELECT s.id, v.label, v.href, v.icon, v.position, true, 'threads', v.group_slugs
FROM s
CROSS JOIN (VALUES
  ('Resource Center Intro', '/resources/resource-center-intro', '🔵', 0, ARRAY[]::TEXT[]),
  ('Winning Deal Framework', '/resources/winning-deal-framework', '🔵', 1, ARRAY[]::TEXT[]),
  ('Finding Auctions First', '/resources/finding-auctions-first', '🔵', 2, ARRAY[]::TEXT[]),
  ('County to Deal List', '/resources/county-to-deal-list', '🔵', 3, ARRAY[]::TEXT[]),
  ('Raw Data to Real Deals', '/resources/raw-data-to-real-deals', '🔵', 4, ARRAY[]::TEXT[]),
  ('The Investor Shortcut', '/resources/the-investor-shortcut', '🔵', 5, ARRAY[]::TEXT[]),
  ('Using LienHub', '/resources/using-lienhub', '🔵', 6, ARRAY[]::TEXT[]),
  ('Valuing Property Remotely', '/resources/valuing-property-remotely', '🔵', 7, ARRAY[]::TEXT[]),
  ('Digging for Liens', '/resources/digging-for-liens', '🔵', 8, ARRAY[]::TEXT[]),
  ('Before You Bid', '/resources/before-you-bid', '🔵', 9, ARRAY[]::TEXT[]),
  ('Win or Lose Rules', '/resources/win-or-lose-rules', '🔵', 10, ARRAY[]::TEXT[]),
  ('What makes or break your deal', '/resources/what-makes-or-break-your-deal', '🔵', 11, ARRAY[]::TEXT[]),
  ('Securing the Deal', '/resources/securing-the-deal', '🔵', 12, ARRAY[]::TEXT[]),
  ('Deals Nobody Bids On', '/resources/deals-nobody-bids-on', '🔵', 13, ARRAY[]::TEXT[]),
  ('Michigan Research Guide', '/resources/michigan-research-guide', '🔵', 14, ARRAY[]::TEXT[]),
  ('Arkansas Tax Deeds', '/resources/arkansas-tax-deeds', '🔵', 15, ARRAY[]::TEXT[]),
  ('Texas Tax Deeds', '/resources/texas-tax-deeds', '🔵', 16, ARRAY[]::TEXT[]),
  ('Auctions and Strategy', '/resources/auctions-and-strategy', '🔵', 17, ARRAY[]::TEXT[])
) AS v(label, href, icon, position, group_slugs);

-- Section 15: PROPERTY RESEARCH (Everyone)
WITH s AS (
  INSERT INTO public.sidebar_sections (name, position, collapsed_default, group_slugs)
  VALUES ('PROPERTY RESEARCH', 14, false, ARRAY[]::TEXT[])
  RETURNING id
)
INSERT INTO public.sidebar_items (section_id, label, href, icon, position, enabled, channel_type, group_slugs)
SELECT s.id, v.label, v.href, v.icon, v.position, true, 'threads', v.group_slugs
FROM s
CROSS JOIN (VALUES
  ('Auction Preparation', '/resources/auction-preparation', '🔵', 0, ARRAY[]::TEXT[]),
  ('Downloads', '/resources/downloads', '🔵', 1, ARRAY[]::TEXT[]),
  ('Keri Goff Workshop Recap', '/resources/keri-goff-workshop-recap', '🔵', 2, ARRAY[]::TEXT[]),
  ('3-Day Workshop Highlights', '/resources/3-day-workshop-highlights', '🔵', 3, ARRAY[]::TEXT[]),
  ('Getting Started', '/resources/getting-started', '🔵', 4, ARRAY[]::TEXT[])
) AS v(label, href, icon, position, group_slugs);

-- Section 16: MARKETING AND SELLING (Everyone)
WITH s AS (
  INSERT INTO public.sidebar_sections (name, position, collapsed_default, group_slugs)
  VALUES ('MARKETING AND SELLING', 15, false, ARRAY[]::TEXT[])
  RETURNING id
)
INSERT INTO public.sidebar_items (section_id, label, href, icon, position, enabled, channel_type, group_slugs)
SELECT s.id, v.label, v.href, v.icon, v.position, true, 'threads', v.group_slugs
FROM s
CROSS JOIN (VALUES
  ('Marketing and Selling Strategy', '/resources/marketing-and-selling-strategy', '🔵', 0, ARRAY[]::TEXT[]),
  ('Locate Real Estate Agents', '/resources/locate-real-estate-agents', '🔵', 1, ARRAY[]::TEXT[])
) AS v(label, href, icon, position, group_slugs);

-- Section 17: INVESTOR RESOURCES (Everyone)
WITH s AS (
  INSERT INTO public.sidebar_sections (name, position, collapsed_default, group_slugs)
  VALUES ('INVESTOR RESOURCES', 16, false, ARRAY[]::TEXT[])
  RETURNING id
)
INSERT INTO public.sidebar_items (section_id, label, href, icon, position, enabled, channel_type, group_slugs)
SELECT s.id, v.label, v.href, v.icon, v.position, true, 'threads', v.group_slugs
FROM s
CROSS JOIN (VALUES
  ('US and Foreign Investors', '/resources/us-and-foreign-investors', '🔵', 0, ARRAY[]::TEXT[]),
  ('Forms for Non-US Citizens', '/resources/forms-for-non-us-citizens', '🔵', 1, ARRAY[]::TEXT[])
) AS v(label, href, icon, position, group_slugs);

-- Section 18: GEOGRAPHIC INFORMATION SYSTEM (GIS) TRAINING (Everyone)
WITH s AS (
  INSERT INTO public.sidebar_sections (name, position, collapsed_default, group_slugs)
  VALUES ('GEOGRAPHIC INFORMATION SYSTEM (GIS) TRAINING', 17, false, ARRAY[]::TEXT[])
  RETURNING id
)
INSERT INTO public.sidebar_items (section_id, label, href, icon, position, enabled, channel_type, group_slugs)
SELECT s.id, v.label, v.href, v.icon, v.position, true, 'threads', v.group_slugs
FROM s
CROSS JOIN (VALUES
  ('GIS Training With Keri Goff', '/resources/gis-training-with-keri-goff', '🔵', 0, ARRAY[]::TEXT[]),
  ('How to Use a GIS Website', '/resources/how-to-use-a-gis-website', '🔵', 1, ARRAY[]::TEXT[]),
  ('Locate Property on GIS', '/resources/locate-property-on-gis', '🔵', 2, ARRAY[]::TEXT[]),
  ('Determine Property Value', '/resources/determine-property-value', '🔵', 3, ARRAY[]::TEXT[]),
  ('Find the Property Address', '/resources/find-the-property-address', '🔵', 4, ARRAY[]::TEXT[]),
  ('Georgia Tax Sale Parcels', '/resources/georgia-tax-sale-parcels', '🔵', 5, ARRAY[]::TEXT[])
) AS v(label, href, icon, position, group_slugs);

-- Section 19: CODE OF CONDUCT (Everyone)
WITH s AS (
  INSERT INTO public.sidebar_sections (name, position, collapsed_default, group_slugs)
  VALUES ('CODE OF CONDUCT', 18, false, ARRAY[]::TEXT[])
  RETURNING id
)
INSERT INTO public.sidebar_items (section_id, label, href, icon, position, enabled, channel_type, group_slugs)
SELECT s.id, v.label, v.href, v.icon, v.position, true, 'threads', v.group_slugs
FROM s
CROSS JOIN (VALUES
  ('Code of Conduct', '/resources/code-of-conduct', '🔵', 0, ARRAY[]::TEXT[])
) AS v(label, href, icon, position, group_slugs);

-- Ensure documents exist for all /resources/* items
-- This creates placeholder documents that don't 404 (published with empty body)
DO $$
DECLARE
  item_record RECORD;
  doc_slug TEXT;
  doc_title TEXT;
BEGIN
  FOR item_record IN 
    SELECT DISTINCT label, href, group_slugs
    FROM sidebar_items
    WHERE href LIKE '/resources/%' AND href NOT LIKE '/resources/%/%'
  LOOP
    -- Extract slug from href (e.g., /resources/announcements -> announcements)
    doc_slug := substring(item_record.href from '/resources/(.+)');
    doc_title := item_record.label;
    
    -- Insert document if it doesn't exist
    INSERT INTO documents (slug, title, body, is_published)
    VALUES (
      doc_slug,
      doc_title,
      '', -- Empty body - admins will fill in content
      true -- Published so members see the title
    )
    ON CONFLICT (slug) DO NOTHING;
    
    -- Link document to groups if item has group restrictions
    IF item_record.group_slugs IS NOT NULL AND array_length(item_record.group_slugs, 1) > 0 THEN
      INSERT INTO document_groups (document_id, group_id)
      SELECT 
        d.id,
        ag.id
      FROM documents d
      CROSS JOIN access_groups ag
      WHERE d.slug = doc_slug
        AND ag.slug = ANY(item_record.group_slugs)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;
