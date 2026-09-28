-- Add placeholder courses from source sidebar
-- These courses are initially empty to match the sidebar structure

-- Insert the 7 placeholder courses
INSERT INTO courses (title, slug, description, is_published, visibility, position, section) VALUES
  ('Investing Fundamentals', 'investing-fundamentals', 'A comprehensive program on building wealth and achieving early retirement.', true, 'show_locked', 1, 'COURSES'),
  ('Hand Holding - Deal Making', 'hand-holding-deal-making', 'Step-by-step guidance through the deal-making process.', true, 'show_locked', 2, 'COURSES'),
  ('Tax Lien Certificates', 'tax-lien-certificates', 'Learn the fundamentals of tax lien certificate investing.', true, 'show_locked', 3, 'COURSES'),
  ('Making Money Carefully', 'making-money-carefully', 'Strategies for conservative wealth building and risk management.', true, 'show_locked', 4, 'COURSES'),
  ('Classic Accelerated Program', 'classic-investing-fundamentals-accelerated', 'An accelerated version of the classic retirement wealth program.', true, 'show_locked', 5, 'COURSES'),
  ('Classic Hand Holding Deal Making', 'classic-hand-holding-deal-making', 'The classic edition of our deal-making mentorship program.', true, 'show_locked', 6, 'COURSES'),
  ('Quick Start Program', 'quick-start-program', 'Get started quickly with the essentials of wealth building.', true, 'show_locked', 7, 'COURSES');

-- Link all courses to the 'Everyone' group for universal access
INSERT INTO course_groups (course_id, group_id)
SELECT c.id, g.id
FROM courses c
CROSS JOIN access_groups g
WHERE g.name = 'Everyone'
  AND c.slug IN (
    'investing-fundamentals',
    'hand-holding-deal-making',
    'tax-lien-certificates',
    'making-money-carefully',
    'classic-investing-fundamentals-accelerated',
    'classic-hand-holding-deal-making',
    'quick-start-program'
  );
