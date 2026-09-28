-- Phase 6: Direct Messages (Client-to-Team) and Coach Dashboard Migration
-- Creates dm_threads, dm_participants, dm_messages, and coach_students tables
-- Adds RLS policies for DM access control and coach assignments

-- Create dm_threads table (one thread per client with the team)
CREATE TABLE dm_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id)
);

-- Create dm_participants table (tracks which team members have joined/replied)
-- Note: All admins/coaches can read any thread, this tracks active participants
CREATE TABLE dm_participants (
  thread_id UUID NOT NULL REFERENCES dm_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (thread_id, user_id)
);

-- Create dm_messages table
CREATE TABLE dm_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES dm_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- Create coach_students table (one coach per student)
CREATE TABLE coach_students (
  coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (coach_id, student_id),
  UNIQUE (student_id) -- Each student can only have one coach
);

-- Create indexes
CREATE INDEX idx_dm_threads_client_id ON dm_threads(client_id);
CREATE INDEX idx_dm_threads_updated_at ON dm_threads(updated_at DESC);
CREATE INDEX idx_dm_participants_thread_id ON dm_participants(thread_id);
CREATE INDEX idx_dm_participants_user_id ON dm_participants(user_id);
CREATE INDEX idx_dm_messages_thread_id ON dm_messages(thread_id);
CREATE INDEX idx_dm_messages_user_id ON dm_messages(user_id);
CREATE INDEX idx_dm_messages_created_at ON dm_messages(created_at);
CREATE INDEX idx_dm_messages_read_at ON dm_messages(read_at) WHERE read_at IS NULL;
CREATE INDEX idx_coach_students_coach_id ON coach_students(coach_id);
CREATE INDEX idx_coach_students_student_id ON coach_students(student_id);

-- Add updated_at trigger for dm_threads
CREATE TRIGGER update_dm_threads_updated_at BEFORE UPDATE ON dm_threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update thread updated_at when a new message is added
CREATE OR REPLACE FUNCTION update_thread_timestamp()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE dm_threads
  SET updated_at = NOW()
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_dm_message_inserted
  AFTER INSERT ON dm_messages
  FOR EACH ROW EXECUTE FUNCTION update_thread_timestamp();

-- Revoke execute from anon and authenticated for security
REVOKE EXECUTE ON FUNCTION update_thread_timestamp() FROM anon, authenticated;

-- Helper function to check if user can access a DM thread
-- Clients can only access their own thread, admins/coaches can access all threads
CREATE OR REPLACE FUNCTION can_access_dm_thread(thread_uuid UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_role user_role;
  v_client_id UUID;
BEGIN
  -- Get current user's role
  SELECT role INTO v_user_role
  FROM users
  WHERE id = auth.uid();
  
  -- Admins and coaches can access all threads
  IF v_user_role IN ('admin', 'coach') THEN
    RETURN true;
  END IF;
  
  -- Clients can only access their own thread
  SELECT client_id INTO v_client_id
  FROM dm_threads
  WHERE id = thread_uuid;
  
  RETURN v_client_id = auth.uid();
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION can_access_dm_thread(UUID) TO authenticated;

-- Helper function to check if user is a team member (admin or coach)
CREATE OR REPLACE FUNCTION is_team_member()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role IN ('admin', 'coach')
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION is_team_member() TO authenticated;

-- Enable Row Level Security
ALTER TABLE dm_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_students ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dm_threads table
-- Clients can view their own thread
CREATE POLICY "Clients can view own thread" ON dm_threads
  FOR SELECT
  USING (client_id = auth.uid());

-- Team members can view all threads
CREATE POLICY "Team members can view all threads" ON dm_threads
  FOR SELECT
  USING (is_team_member());

-- Clients can create their own thread (only one per client due to UNIQUE constraint)
CREATE POLICY "Clients can create own thread" ON dm_threads
  FOR INSERT
  WITH CHECK (client_id = auth.uid());

-- Team members can create threads for clients
CREATE POLICY "Team members can create threads for clients" ON dm_threads
  FOR INSERT
  WITH CHECK (is_team_member());

-- RLS Policies for dm_participants table
-- Users can view participants in threads they can access
CREATE POLICY "Users can view participants in accessible threads" ON dm_participants
  FOR SELECT
  USING (can_access_dm_thread(thread_id));

-- Team members can add themselves or others as participants
CREATE POLICY "Team members can manage participants" ON dm_participants
  FOR INSERT
  WITH CHECK (is_team_member());

-- RLS Policies for dm_messages table
-- Users can view messages in threads they can access
CREATE POLICY "Users can view messages in accessible threads" ON dm_messages
  FOR SELECT
  USING (can_access_dm_thread(thread_id));

-- Clients can send messages in their own thread
CREATE POLICY "Clients can send messages in own thread" ON dm_messages
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM dm_threads
      WHERE id = thread_id AND client_id = auth.uid()
    )
  );

-- Team members can send messages in any thread
CREATE POLICY "Team members can send messages in any thread" ON dm_messages
  FOR INSERT
  WITH CHECK (is_team_member() AND user_id = auth.uid());

-- Users can delete their own messages
CREATE POLICY "Users can delete own messages" ON dm_messages
  FOR DELETE
  USING (user_id = auth.uid());

-- Admins can delete any message
CREATE POLICY "Admins can delete any message" ON dm_messages
  FOR DELETE
  USING (is_admin());

-- RLS Policies for coach_students table
-- Coaches can view their own assignments
CREATE POLICY "Coaches can view own assignments" ON coach_students
  FOR SELECT
  USING (coach_id = auth.uid());

-- Students can view their coach assignment
CREATE POLICY "Students can view own coach assignment" ON coach_students
  FOR SELECT
  USING (student_id = auth.uid());

-- Admins can view all assignments
CREATE POLICY "Admins can view all assignments" ON coach_students
  FOR SELECT
  USING (is_admin());

-- Admins can manage all assignments
CREATE POLICY "Admins can manage assignments" ON coach_students
  FOR ALL
  USING (is_admin());

-- Trigger to automatically add sender as participant when sending a message
CREATE OR REPLACE FUNCTION auto_add_participant()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Add the message sender as a participant if they're not already
  INSERT INTO dm_participants (thread_id, user_id)
  VALUES (NEW.thread_id, NEW.user_id)
  ON CONFLICT (thread_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_dm_message_add_participant
  AFTER INSERT ON dm_messages
  FOR EACH ROW EXECUTE FUNCTION auto_add_participant();

-- Revoke execute from anon and authenticated for security
REVOKE EXECUTE ON FUNCTION auto_add_participant() FROM anon, authenticated;

-- Helper function to mark messages as read in a thread (SECURITY DEFINER)
-- Only updates read_at on messages in accessible threads that weren't sent by current user
CREATE OR REPLACE FUNCTION mark_dm_messages_read_in_thread(p_thread_id UUID)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verify user can access this thread
  IF NOT can_access_dm_thread(p_thread_id) THEN
    RAISE EXCEPTION 'Access denied to thread';
  END IF;
  
  -- Mark messages as read (only messages not sent by current user)
  UPDATE dm_messages
  SET read_at = NOW()
  WHERE thread_id = p_thread_id
    AND user_id != auth.uid()
    AND read_at IS NULL;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION mark_dm_messages_read_in_thread(UUID) TO authenticated;
