-- Add banner_mode column to courses table
-- This allows admins to choose between showing an image banner or a title text banner

CREATE TYPE banner_mode_type AS ENUM ('image', 'text');

ALTER TABLE courses 
ADD COLUMN banner_mode banner_mode_type NOT NULL DEFAULT 'text';

-- Set existing courses with banner_url to use 'image' mode
UPDATE courses 
SET banner_mode = 'image' 
WHERE banner_url IS NOT NULL AND banner_url != '';

COMMENT ON COLUMN courses.banner_mode IS 'Controls banner display: "image" shows banner_url only (no title overlay), "text" shows course title as banner (no image)';
