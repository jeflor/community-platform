-- Create banners table for community banner slots
CREATE TABLE IF NOT EXISTS public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  href TEXT, -- Optional link URL
  enabled BOOLEAN NOT NULL DEFAULT false,
  position TEXT NOT NULL DEFAULT 'pulse', -- pulse, home, or both
  group_slugs TEXT[] DEFAULT ARRAY[]::TEXT[], -- empty = everyone; specific slugs = only those groups
  starts_at TIMESTAMPTZ, -- Optional: banner is active only after this time
  ends_at TIMESTAMPTZ, -- Optional: banner expires after this time
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_banner_times CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);

-- Create index for enabled banners lookup
CREATE INDEX idx_banners_enabled ON public.banners(enabled);
CREATE INDEX idx_banners_position ON public.banners(position);

-- Add updated_at trigger
CREATE TRIGGER update_banners_updated_at BEFORE UPDATE ON public.banners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Helper function to check if user can see a banner
-- User can see if banner is enabled AND within time window AND (group_slugs empty OR user in one of those groups OR is_admin)
CREATE OR REPLACE FUNCTION can_see_banner(banner_uuid UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  banner_enabled BOOLEAN;
  banner_starts_at TIMESTAMPTZ;
  banner_ends_at TIMESTAMPTZ;
  banner_group_slugs TEXT[];
  has_group_restrictions BOOLEAN;
BEGIN
  -- Admins can see all banners
  IF is_admin() THEN
    RETURN true;
  END IF;
  
  -- Get banner details
  SELECT enabled, starts_at, ends_at, group_slugs
  INTO banner_enabled, banner_starts_at, banner_ends_at, banner_group_slugs
  FROM banners
  WHERE id = banner_uuid;
  
  -- Check if banner is enabled
  IF NOT banner_enabled THEN
    RETURN false;
  END IF;
  
  -- Check time window
  IF banner_starts_at IS NOT NULL AND now() < banner_starts_at THEN
    RETURN false;
  END IF;
  
  IF banner_ends_at IS NOT NULL AND now() > banner_ends_at THEN
    RETURN false;
  END IF;
  
  -- Check group restrictions
  has_group_restrictions := banner_group_slugs IS NOT NULL AND array_length(banner_group_slugs, 1) > 0;
  
  -- If no group restrictions, everyone authenticated can see it
  IF NOT has_group_restrictions THEN
    RETURN true;
  END IF;
  
  -- Check if user is in any of the banner's groups (by slug)
  RETURN EXISTS (
    SELECT 1
    FROM group_members gm
    INNER JOIN access_groups ag ON ag.id = gm.group_id
    WHERE gm.user_id = auth.uid()
      AND ag.slug IS NOT NULL
      AND ag.slug = ANY(banner_group_slugs)
  );
END;
$$;

-- Grant execute to authenticated users
REVOKE EXECUTE ON FUNCTION can_see_banner(UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION can_see_banner(UUID) TO authenticated;

-- Enable Row Level Security
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- RLS Policies for banners table
-- Admins can manage all banners
CREATE POLICY "Admins can manage banners" ON public.banners
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Authenticated users can view banners they have access to
CREATE POLICY "Users can view accessible banners" ON public.banners
  FOR SELECT
  USING (can_see_banner(id));

-- Grant table permissions
-- Admin mutations use the user JWT (authenticated role), not service_role
-- RLS still gates writes to is_admin()
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banners TO authenticated;
GRANT ALL ON public.banners TO service_role;
