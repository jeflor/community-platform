-- Phase 2: Chat System Migration
-- Creates channels, channel_groups, messages, reactions, and mentions tables
-- Adds RLS policies for channel-based access control

-- Create channel type enum
CREATE TYPE channel_type AS ENUM ('chat', 'thread');

-- Create channels table
CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  type channel_type NOT NULL DEFAULT 'chat',
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create channel_groups junction table
CREATE TABLE channel_groups (
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES access_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (channel_id, group_id)
);

-- Create messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMPTZ
);

-- Create reactions table
CREATE TABLE reactions (
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id, emoji)
);

-- Create mentions table
CREATE TABLE mentions (
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (message_id, mentioned_user_id)
);

-- Create indexes
CREATE INDEX idx_channels_slug ON channels(slug);
CREATE INDEX idx_channels_position ON channels(position);
CREATE INDEX idx_channel_groups_channel_id ON channel_groups(channel_id);
CREATE INDEX idx_channel_groups_group_id ON channel_groups(group_id);
CREATE INDEX idx_messages_channel_id ON messages(channel_id);
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_parent_id ON messages(parent_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_reactions_message_id ON reactions(message_id);
CREATE INDEX idx_reactions_user_id ON reactions(user_id);
CREATE INDEX idx_mentions_message_id ON mentions(message_id);
CREATE INDEX idx_mentions_mentioned_user_id ON mentions(mentioned_user_id);
CREATE INDEX idx_mentions_read_at ON mentions(read_at) WHERE read_at IS NULL;

-- Add updated_at trigger for channels
CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentions ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user can see a channel
-- User can see a channel if they are admin OR if they belong to any group assigned to the channel
CREATE OR REPLACE FUNCTION can_see_channel(channel_uuid UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Admins can see all channels
  IF is_admin() THEN
    RETURN true;
  END IF;
  
  -- Check if user is in any group that has access to this channel
  RETURN EXISTS (
    SELECT 1
    FROM channel_groups cg
    INNER JOIN group_members gm ON gm.group_id = cg.group_id
    WHERE cg.channel_id = channel_uuid
      AND gm.user_id = auth.uid()
  );
END;
$$;

-- Revoke execute from anon and authenticated for security
REVOKE EXECUTE ON FUNCTION can_see_channel(UUID) FROM anon, authenticated;

-- RLS Policies for channels table
-- Admins can do everything
CREATE POLICY "Admins can manage channels" ON channels
  FOR ALL
  USING (is_admin());

-- Users can view channels they have access to
CREATE POLICY "Users can view accessible channels" ON channels
  FOR SELECT
  USING (can_see_channel(id));

-- RLS Policies for channel_groups table
-- Admins can manage channel group assignments
CREATE POLICY "Admins can manage channel groups" ON channel_groups
  FOR ALL
  USING (is_admin());

-- Users can view channel group assignments for channels they can see
CREATE POLICY "Users can view channel groups for accessible channels" ON channel_groups
  FOR SELECT
  USING (can_see_channel(channel_id));

-- RLS Policies for messages table
-- Users can view messages in channels they can see
CREATE POLICY "Users can view messages in accessible channels" ON messages
  FOR SELECT
  USING (can_see_channel(channel_id));

-- Users can create messages in channels they can see
CREATE POLICY "Users can create messages in accessible channels" ON messages
  FOR INSERT
  WITH CHECK (can_see_channel(channel_id) AND user_id = auth.uid());

-- Users can update their own messages
CREATE POLICY "Users can update own messages" ON messages
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own messages
CREATE POLICY "Users can delete own messages" ON messages
  FOR DELETE
  USING (user_id = auth.uid());

-- Admins can delete any message
CREATE POLICY "Admins can delete any message" ON messages
  FOR DELETE
  USING (is_admin());

-- RLS Policies for reactions table
-- Users can view reactions on messages they can see
CREATE POLICY "Users can view reactions on accessible messages" ON reactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_id AND can_see_channel(m.channel_id)
    )
  );

-- Users can add reactions to messages they can see
CREATE POLICY "Users can add reactions to accessible messages" ON reactions
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_id AND can_see_channel(m.channel_id)
    )
  );

-- Users can remove their own reactions
CREATE POLICY "Users can remove own reactions" ON reactions
  FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for mentions table
-- Users can view mentions in messages they can see
CREATE POLICY "Users can view mentions in accessible messages" ON mentions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_id AND can_see_channel(m.channel_id)
    )
  );

-- Users can create mentions when creating messages (system creates these)
CREATE POLICY "Users can create mentions in their messages" ON mentions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_id 
        AND m.user_id = auth.uid()
        AND can_see_channel(m.channel_id)
    )
  );

-- Users can update their own mention read status
CREATE POLICY "Users can update own mention read status" ON mentions
  FOR UPDATE
  USING (mentioned_user_id = auth.uid())
  WITH CHECK (mentioned_user_id = auth.uid());
