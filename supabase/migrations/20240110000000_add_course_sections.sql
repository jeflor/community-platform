-- Phase 3: Add course sections support
-- Adds section column to courses table for catalog grouping

ALTER TABLE courses ADD COLUMN IF NOT EXISTS section TEXT DEFAULT 'Video Training Courses';

-- Create index for section queries
CREATE INDEX IF NOT EXISTS idx_courses_section ON courses(section);

-- Update updated_at timestamp
UPDATE courses SET updated_at = NOW() WHERE section IS NULL;

COMMENT ON COLUMN courses.section IS 'Section name for grouping courses in the catalog (e.g., "Video Training Courses")';
