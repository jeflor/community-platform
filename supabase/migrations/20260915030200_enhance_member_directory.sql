-- Enhance member_directory view to include bio
-- This allows non-admin members to see each other's bios and basic profile info

-- Drop the existing view
DROP VIEW IF EXISTS public.member_directory;

-- Recreate with bio included
CREATE OR REPLACE VIEW public.member_directory
WITH (security_barrier = true)
AS
SELECT 
  id,
  full_name,
  avatar_url,
  bio,
  headline,
  location,
  role,
  is_active,
  last_seen,
  created_at
FROM users
WHERE is_active = true;

-- Make the view execute with definer privileges
ALTER VIEW public.member_directory OWNER TO postgres;

-- Revoke default permissions
REVOKE ALL ON public.member_directory FROM anon;
REVOKE ALL ON public.member_directory FROM public;

-- Grant SELECT to authenticated users only
GRANT SELECT ON public.member_directory TO authenticated;

-- Add comment for documentation
COMMENT ON VIEW public.member_directory IS 
  'Public member directory view showing active members with bios, headlines, and locations. Emails are excluded for privacy. Accessible to all authenticated users.';
