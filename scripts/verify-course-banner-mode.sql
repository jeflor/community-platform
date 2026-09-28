-- Verification script for investing-fundamentals course banner mode
-- Run this after applying migration 20260915150000_add_course_banner_mode.sql
-- Expected result: banner_mode should be 'image'

SELECT 
  slug,
  title,
  banner_url,
  banner_mode,
  CASE 
    WHEN banner_mode = 'image' AND banner_url IS NOT NULL THEN '✓ Correct: Image mode with banner URL'
    WHEN banner_mode = 'image' AND banner_url IS NULL THEN '⚠ Warning: Image mode but no banner URL'
    WHEN banner_mode = 'text' AND banner_url IS NOT NULL THEN '⚠ Warning: Text mode but has banner URL'
    WHEN banner_mode = 'text' AND banner_url IS NULL THEN '✓ OK: Text mode with no banner URL'
    ELSE '? Unknown state'
  END as status
FROM courses
WHERE slug = 'investing-fundamentals';
