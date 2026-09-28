-- Add last_seen column to users table for presence tracking
ALTER TABLE users ADD COLUMN last_seen TIMESTAMPTZ;

-- Create index for efficient presence queries
CREATE INDEX idx_users_last_seen ON users(last_seen);

-- RLS Policy: Users can update only their own last_seen
CREATE POLICY "Users can update own last_seen" ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
