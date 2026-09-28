-- Add policy for users to read their own profile
-- This is critical for getCurrentUser() and profile reads with the anon SSR client
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Add slug column to access_groups for live DB compatibility
-- Nullable for backward compatibility; existing rows get NULL
ALTER TABLE access_groups 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Create index on slug for efficient lookups
CREATE INDEX IF NOT EXISTS idx_access_groups_slug ON access_groups(slug);

-- Add comment explaining slug usage
COMMENT ON COLUMN access_groups.slug IS 'URL-friendly identifier for groups, optional legacy field for compatibility';
