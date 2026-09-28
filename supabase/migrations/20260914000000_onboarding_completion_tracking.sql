-- Add onboarding completion tracking to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_responses JSONB;

-- Create index for querying users who haven't completed onboarding
CREATE INDEX IF NOT EXISTS idx_users_onboarding_completed ON users(onboarding_completed);

-- Update existing users to mark them as having completed onboarding
UPDATE users SET onboarding_completed = true WHERE onboarding_completed = false;
