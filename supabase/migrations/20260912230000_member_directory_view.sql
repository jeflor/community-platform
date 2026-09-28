-- Add headline and location columns to users table for member directory
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS headline TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT;

-- Create member_directory view with SECURITY DEFINER
-- This view allows authenticated users to see active members without exposing emails
-- Uses SECURITY DEFINER to bypass RLS and only return non-sensitive columns
CREATE OR REPLACE VIEW public.member_directory
WITH (security_barrier = true)
AS
SELECT 
  id,
  full_name,
  avatar_url,
  headline,
  location,
  role,
  is_active,
  last_seen
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
  'Public member directory view showing active members without email addresses. Accessible to all authenticated users.';
