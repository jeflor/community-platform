-- Coach Notes Migration
-- Creates coach_notes table for private staff notes about students
-- Only accessible to assigned coaches and admins, never visible to students

-- Create coach_notes table
CREATE TABLE coach_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_coach_notes_student_id ON coach_notes(student_id);
CREATE INDEX idx_coach_notes_author_id ON coach_notes(author_id);
CREATE INDEX idx_coach_notes_created_at ON coach_notes(created_at DESC);

-- Add updated_at trigger
CREATE TRIGGER update_coach_notes_updated_at BEFORE UPDATE ON coach_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Helper function to check if user is assigned coach for a student
CREATE OR REPLACE FUNCTION is_assigned_coach_for_student(p_student_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM coach_students
    WHERE student_id = p_student_id
      AND coach_id = auth.uid()
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION is_assigned_coach_for_student(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION is_assigned_coach_for_student(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION is_assigned_coach_for_student(UUID) FROM anon;

-- Enable Row Level Security
ALTER TABLE coach_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policy: SELECT - assigned coach or admin can view notes for a student
CREATE POLICY "Assigned coaches and admins can view notes" ON coach_notes
  FOR SELECT
  TO authenticated
  USING (
    is_admin()
    OR is_assigned_coach_for_student(student_id)
  );

-- RLS Policy: INSERT - assigned coach or admin can create notes
CREATE POLICY "Assigned coaches and admins can create notes" ON coach_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND (
      is_admin()
      OR is_assigned_coach_for_student(student_id)
    )
  );

-- RLS Policy: UPDATE - author can edit their own notes
CREATE POLICY "Authors can update their own notes" ON coach_notes
  FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- RLS Policy: DELETE - author or admin can delete notes
CREATE POLICY "Authors and admins can delete notes" ON coach_notes
  FOR DELETE
  TO authenticated
  USING (
    author_id = auth.uid()
    OR is_admin()
  );
