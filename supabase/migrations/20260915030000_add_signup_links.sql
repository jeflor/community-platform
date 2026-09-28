-- Create signup_links table for public sign-up link management
CREATE TABLE IF NOT EXISTS public.signup_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  default_group_id UUID REFERENCES public.access_groups(id) ON DELETE SET NULL,
  visits_count INTEGER NOT NULL DEFAULT 0,
  signups_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_signup_links_token ON public.signup_links(token);
CREATE INDEX idx_signup_links_is_enabled ON public.signup_links(is_enabled);

-- Add updated_at trigger
CREATE TRIGGER update_signup_links_updated_at 
  BEFORE UPDATE ON public.signup_links
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.signup_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for signup_links table
-- Note: No public SELECT policy - links are looked up via SECURITY DEFINER functions
-- to prevent leaking tokens to anonymous users

-- Admins can view all signup links
CREATE POLICY "Admins can view all signup links" ON public.signup_links
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can manage signup links
CREATE POLICY "Admins can manage signup links" ON public.signup_links
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to increment visit count
CREATE OR REPLACE FUNCTION increment_signup_link_visit(link_token TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.signup_links
  SET visits_count = visits_count + 1
  WHERE token = link_token AND is_enabled = true;
END;
$$;

-- Function to increment signup count and optionally add user to group
CREATE OR REPLACE FUNCTION complete_signup_link_registration(
  link_token TEXT,
  user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  link_group_id UUID;
BEGIN
  -- Get the default group for this signup link
  SELECT default_group_id INTO link_group_id
  FROM public.signup_links
  WHERE token = link_token AND is_enabled = true;
  
  -- Increment signup count
  UPDATE public.signup_links
  SET signups_count = signups_count + 1
  WHERE token = link_token AND is_enabled = true;
  
  -- Add user to the default group if one is specified
  IF link_group_id IS NOT NULL THEN
    INSERT INTO public.group_members (user_id, group_id, source)
    VALUES (user_id, link_group_id, 'manual')
    ON CONFLICT (user_id, group_id) DO NOTHING;
  END IF;
END;
$$;

-- Revoke execute permissions from anon and authenticated for security
REVOKE EXECUTE ON FUNCTION increment_signup_link_visit(TEXT) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION complete_signup_link_registration(TEXT, UUID) FROM anon, authenticated;
