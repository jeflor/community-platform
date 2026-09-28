-- Create is_admin() helper function to avoid RLS recursion
-- This function uses SECURITY DEFINER to bypass RLS when checking admin status
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- Grant execute to authenticated users so they can call it in RLS policies
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Drop and recreate admin policies to use the helper function
-- This prevents RLS recursion issues

-- Users table admin policies
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Admins can delete users" ON users;

CREATE POLICY "Admins can view all users" ON users
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can insert users" ON users
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update all users" ON users
  FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete users" ON users
  FOR DELETE
  USING (public.is_admin());

-- Access groups admin policy
DROP POLICY IF EXISTS "Admins can manage groups" ON access_groups;

CREATE POLICY "Admins can manage groups" ON access_groups
  FOR ALL
  USING (public.is_admin());

-- Group members admin policies
DROP POLICY IF EXISTS "Admins can view all memberships" ON group_members;
DROP POLICY IF EXISTS "Admins can manage memberships" ON group_members;

CREATE POLICY "Admins can view all memberships" ON group_members
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can manage memberships" ON group_members
  FOR ALL
  USING (public.is_admin());

-- Site settings admin policy
DROP POLICY IF EXISTS "Admins can manage settings" ON site_settings;

CREATE POLICY "Admins can manage settings" ON site_settings
  FOR ALL
  USING (public.is_admin());
