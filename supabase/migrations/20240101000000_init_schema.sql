-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
CREATE TYPE user_role AS ENUM ('admin', 'coach', 'client');
CREATE TYPE membership_source AS ENUM ('manual', 'stripe');

-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'client',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sidebar_width INTEGER NOT NULL DEFAULT 280 CHECK (sidebar_width >= 200 AND sidebar_width <= 480),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create access_groups table
CREATE TABLE access_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create group_members table
CREATE TABLE group_members (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES access_groups(id) ON DELETE CASCADE,
  source membership_source NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, group_id, source)
);

-- Create site_settings table
CREATE TABLE site_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);
CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_site_settings_key ON site_settings(key);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_access_groups_updated_at BEFORE UPDATE ON access_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_group_members_updated_at BEFORE UPDATE ON group_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_site_settings_updated_at BEFORE UPDATE ON site_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed system groups
INSERT INTO access_groups (name, description, is_system) VALUES
  ('everyone', 'All active users', true),
  ('team', 'Admins and coaches', true);

-- Seed default site settings
INSERT INTO site_settings (key, value, description) VALUES
  ('sidebar_defaults', '{"admin_width": 320, "user_width": 280}', 'Default sidebar widths'),
  ('locked_message_enabled', 'false', 'Whether locked content messages are shown'),
  ('locked_message_text', '"This content is available to premium members."', 'Message shown for locked content');

-- Auth sync trigger function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  -- Add to everyone group
  INSERT INTO public.group_members (user_id, group_id, source)
  SELECT NEW.id, id, 'manual'
  FROM public.access_groups
  WHERE name = 'everyone';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new auth users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Team membership maintenance function
CREATE OR REPLACE FUNCTION maintain_team_membership()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  team_group_id UUID;
BEGIN
  SELECT id INTO team_group_id FROM public.access_groups WHERE name = 'team';
  
  IF NEW.role IN ('admin', 'coach') THEN
    -- Add to team group
    INSERT INTO public.group_members (user_id, group_id, source)
    VALUES (NEW.id, team_group_id, 'manual')
    ON CONFLICT (user_id, group_id, source) DO NOTHING;
  ELSIF OLD.role IN ('admin', 'coach') AND NEW.role = 'client' THEN
    -- Remove from team group
    DELETE FROM public.group_members
    WHERE user_id = NEW.id AND group_id = team_group_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for role changes
DROP TRIGGER IF EXISTS on_user_role_changed ON users;
CREATE TRIGGER on_user_role_changed
  AFTER UPDATE OF role ON users
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION maintain_team_membership();

-- Everyone group membership maintenance
CREATE OR REPLACE FUNCTION maintain_everyone_membership()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  everyone_group_id UUID;
BEGIN
  SELECT id INTO everyone_group_id FROM public.access_groups WHERE name = 'everyone';
  
  IF NEW.is_active AND NOT OLD.is_active THEN
    -- Add to everyone group when activated
    INSERT INTO public.group_members (user_id, group_id, source)
    VALUES (NEW.id, everyone_group_id, 'manual')
    ON CONFLICT (user_id, group_id, source) DO NOTHING;
  ELSIF NOT NEW.is_active AND OLD.is_active THEN
    -- Remove from everyone group when deactivated
    DELETE FROM public.group_members
    WHERE user_id = NEW.id AND group_id = everyone_group_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for active status changes
DROP TRIGGER IF EXISTS on_user_active_changed ON users;
CREATE TRIGGER on_user_active_changed
  AFTER UPDATE OF is_active ON users
  FOR EACH ROW
  WHEN (OLD.is_active IS DISTINCT FROM NEW.is_active)
  EXECUTE FUNCTION maintain_everyone_membership();

-- Revoke execute permissions from anon and authenticated for security functions
REVOKE EXECUTE ON FUNCTION handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION maintain_team_membership() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION maintain_everyone_membership() FROM anon, authenticated;

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view active users" ON users
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert users" ON users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all users" ON users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete users" ON users
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for access_groups table
CREATE POLICY "Anyone can view groups" ON access_groups
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage groups" ON access_groups
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for group_members table
CREATE POLICY "Users can view own memberships" ON group_members
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all memberships" ON group_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage memberships" ON group_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for site_settings table
CREATE POLICY "Anyone can view settings" ON site_settings
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage settings" ON site_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
