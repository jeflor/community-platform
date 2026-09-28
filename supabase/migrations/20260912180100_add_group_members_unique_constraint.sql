-- Add unique constraint on (user_id, group_id) to prevent duplicate memberships
-- regardless of source
DO $$ BEGIN
  ALTER TABLE group_members ADD CONSTRAINT group_members_user_group_unique UNIQUE (user_id, group_id);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL;
END $$;
