-- Add duration_seconds column to lessons table
-- This column stores video duration in seconds for display in course curriculum

ALTER TABLE lessons
ADD COLUMN duration_seconds INTEGER;

COMMENT ON COLUMN lessons.duration_seconds IS 'Video duration in seconds for display in course curriculum';

-- Seed durations for "Investing Fundamentals" course lessons
-- L1: 1:03:00 = 3780 seconds
-- L2: 58:58 = 3538 seconds
-- L3: 1:09:18 = 4158 seconds
-- L4: 53:28 = 3208 seconds
-- L5: 1:01:56 = 3716 seconds
-- L6: 1:02:02 = 3722 seconds
-- L7: 56:03 = 3363 seconds
-- L8: 1:00:39 = 3639 seconds
-- L9: 1:28:34 = 5314 seconds

UPDATE lessons
SET duration_seconds = CASE 
  WHEN title = 'Lesson 1' THEN 3780
  WHEN title = 'Lesson 2' THEN 3538
  WHEN title = 'Lesson 3' THEN 4158
  WHEN title = 'Lesson 4' THEN 3208
  WHEN title = 'Lesson 5' THEN 3716
  WHEN title = 'Lesson 6' THEN 3722
  WHEN title = 'Lesson 7' THEN 3363
  WHEN title = 'Lesson 8' THEN 3639
  WHEN title = 'Lesson 9' THEN 5314
  ELSE duration_seconds
END
WHERE module_id IN (
  SELECT m.id 
  FROM modules m
  JOIN courses c ON c.id = m.course_id
  WHERE c.slug = 'investing-fundamentals'
);
