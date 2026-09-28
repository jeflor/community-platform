-- Add bio, headline, and location fields to users table
-- These fields allow members to add reference-style profile information

-- Add new columns
ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE users ADD COLUMN headline TEXT;
ALTER TABLE users ADD COLUMN location TEXT;

-- Add comment for documentation
COMMENT ON COLUMN users.bio IS 'Member bio (max ~500 characters)';
COMMENT ON COLUMN users.headline IS 'Member headline/tagline (max ~80 characters)';
COMMENT ON COLUMN users.location IS 'Member location (max ~80 characters)';

-- The existing RLS policy "Users can update own profile" already allows users to update their own record
-- No additional RLS policies needed since it uses auth.uid() = id without column restrictions
