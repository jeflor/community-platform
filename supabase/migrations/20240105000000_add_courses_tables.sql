-- Phase 3: Courses System Migration
-- Creates courses, course_groups, modules, lessons, enrollments, and lesson_progress tables
-- Adds RLS policies for course access control

-- Create visibility enum for locked content
CREATE TYPE content_visibility AS ENUM ('show_locked', 'hide');

-- Create courses table
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  banner_url TEXT, -- Optional course cover image URL (per §8.3 config)
  is_published BOOLEAN NOT NULL DEFAULT false,
  locked_message TEXT, -- Custom locked message for this course (§8.2)
  visibility content_visibility NOT NULL DEFAULT 'show_locked', -- show_locked or hide (§8.2)
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create course_groups junction table (which groups have access to which courses)
CREATE TABLE course_groups (
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES access_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (course_id, group_id)
);

-- Create modules table (organize lessons within a course)
CREATE TABLE modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create lessons table
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT, -- Rich text content
  video_url TEXT, -- YouTube, Vimeo, Loom embed URL
  attachments JSONB, -- Array of attachment objects {name, url, type}
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create enrollments table (tracks which users are enrolled in which courses)
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, course_id)
);

-- Create lesson_progress table (tracks completion of individual lessons)
CREATE TABLE lesson_progress (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, lesson_id)
);

-- Create indexes
CREATE INDEX idx_courses_slug ON courses(slug);
CREATE INDEX idx_courses_position ON courses(position);
CREATE INDEX idx_courses_is_published ON courses(is_published);
CREATE INDEX idx_course_groups_course_id ON course_groups(course_id);
CREATE INDEX idx_course_groups_group_id ON course_groups(group_id);
CREATE INDEX idx_modules_course_id ON modules(course_id);
CREATE INDEX idx_modules_position ON modules(position);
CREATE INDEX idx_lessons_module_id ON lessons(module_id);
CREATE INDEX idx_lessons_position ON lessons(position);
CREATE INDEX idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX idx_lesson_progress_user_id ON lesson_progress(user_id);
CREATE INDEX idx_lesson_progress_lesson_id ON lesson_progress(lesson_id);

-- Add updated_at triggers
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Helper function to check if user has access to a course
-- User has access if they are admin OR if they belong to any group assigned to the course
CREATE OR REPLACE FUNCTION has_course_access(course_uuid UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Admins have access to all courses
  IF is_admin() THEN
    RETURN true;
  END IF;
  
  -- Check if user is in any group that has access to this course
  RETURN EXISTS (
    SELECT 1
    FROM course_groups cg
    INNER JOIN group_members gm ON gm.group_id = cg.group_id
    WHERE cg.course_id = course_uuid
      AND gm.user_id = auth.uid()
  );
END;
$$;

-- Revoke execute from anon and authenticated for security
REVOKE EXECUTE ON FUNCTION has_course_access(UUID) FROM anon, authenticated;

-- Helper function to check if user is enrolled in a course
CREATE OR REPLACE FUNCTION is_enrolled(course_uuid UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM enrollments
    WHERE user_id = auth.uid() AND course_id = course_uuid
  );
END;
$$;

-- Revoke execute from anon and authenticated for security
REVOKE EXECUTE ON FUNCTION is_enrolled(UUID) FROM anon, authenticated;

-- Enable Row Level Security
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for courses table
-- Admins can manage all courses
CREATE POLICY "Admins can manage courses" ON courses
  FOR ALL
  USING (is_admin());

-- Users can view published courses they have access to
CREATE POLICY "Users can view accessible published courses" ON courses
  FOR SELECT
  USING (is_published = true AND has_course_access(id));

-- RLS Policies for course_groups table
-- Admins can manage course group assignments
CREATE POLICY "Admins can manage course groups" ON course_groups
  FOR ALL
  USING (is_admin());

-- Users can view course group assignments for courses they can see
CREATE POLICY "Users can view course groups for accessible courses" ON course_groups
  FOR SELECT
  USING (has_course_access(course_id));

-- RLS Policies for modules table
-- Admins can manage all modules
CREATE POLICY "Admins can manage modules" ON modules
  FOR ALL
  USING (is_admin());

-- Users can view modules for courses they have access to and are enrolled in
CREATE POLICY "Users can view modules for enrolled courses" ON modules
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_id 
        AND c.is_published = true
        AND has_course_access(c.id)
        AND is_enrolled(c.id)
    )
  );

-- RLS Policies for lessons table
-- Admins can manage all lessons
CREATE POLICY "Admins can manage lessons" ON lessons
  FOR ALL
  USING (is_admin());

-- Users can view lessons for courses they are enrolled in
CREATE POLICY "Users can view lessons for enrolled courses" ON lessons
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM modules m
      INNER JOIN courses c ON c.id = m.course_id
      WHERE m.id = module_id
        AND c.is_published = true
        AND has_course_access(c.id)
        AND is_enrolled(c.id)
    )
  );

-- RLS Policies for enrollments table
-- Admins can view all enrollments
CREATE POLICY "Admins can view all enrollments" ON enrollments
  FOR SELECT
  USING (is_admin());

-- Users can view their own enrollments
CREATE POLICY "Users can view own enrollments" ON enrollments
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can enroll themselves in courses they have access to
-- (This will typically be done via server actions with additional validation)
CREATE POLICY "Users can create own enrollments" ON enrollments
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_id 
        AND c.is_published = true
        AND has_course_access(c.id)
    )
  );

-- Admins can manage all enrollments
CREATE POLICY "Admins can manage enrollments" ON enrollments
  FOR ALL
  USING (is_admin());

-- RLS Policies for lesson_progress table
-- Users can view their own progress
CREATE POLICY "Users can view own lesson progress" ON lesson_progress
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can mark lessons complete for courses they're enrolled in
CREATE POLICY "Users can mark lessons complete" ON lesson_progress
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM lessons l
      INNER JOIN modules m ON m.id = l.module_id
      INNER JOIN courses c ON c.id = m.course_id
      WHERE l.id = lesson_id
        AND c.is_published = true
        AND has_course_access(c.id)
        AND is_enrolled(c.id)
    )
  );

-- Users can delete their own progress (un-mark complete)
CREATE POLICY "Users can delete own lesson progress" ON lesson_progress
  FOR DELETE
  USING (user_id = auth.uid());

-- Admins can view and manage all progress
CREATE POLICY "Admins can view all lesson progress" ON lesson_progress
  FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can manage lesson progress" ON lesson_progress
  FOR ALL
  USING (is_admin());

-- Trigger function to auto-enroll user when they join a group linked to a course
CREATE OR REPLACE FUNCTION auto_enroll_user_in_courses()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a user is added to a group, enroll them in all published courses linked to that group
  INSERT INTO enrollments (user_id, course_id)
  SELECT NEW.user_id, cg.course_id
  FROM course_groups cg
  INNER JOIN courses c ON c.id = cg.course_id
  WHERE cg.group_id = NEW.group_id
    AND c.is_published = true
  ON CONFLICT (user_id, course_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-enrollment
DROP TRIGGER IF EXISTS on_group_member_added ON group_members;
CREATE TRIGGER on_group_member_added
  AFTER INSERT ON group_members
  FOR EACH ROW EXECUTE FUNCTION auto_enroll_user_in_courses();

-- Revoke execute from anon and authenticated for security
REVOKE EXECUTE ON FUNCTION auto_enroll_user_in_courses() FROM anon, authenticated;
