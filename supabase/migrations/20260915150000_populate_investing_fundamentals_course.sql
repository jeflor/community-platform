-- Populate "Investing Fundamentals" course with modules and lessons
-- This migration is idempotent by slug

-- Update the course with full title, description, and banner
UPDATE courses
SET 
  title = 'Investing Fundamentals',
  description = 'the instructor — America''s Tax Lien Certificate & Tax Deed Authority — walks you through the complete system for finding, buying, and profiting from tax-defaulted properties. Through 9 expert video lessons featuring real student success stories, you''ll gain the knowledge, confidence, and clear process to start investing in tax liens and tax deeds — safely and profitably — from the comfort of your own home.',
  banner_url = 'https://example.com/assets/course-banner-4x1.png',
  section = 'COURSES',
  updated_at = NOW()
WHERE slug = 'investing-fundamentals';

-- Delete existing modules (lessons will cascade due to ON DELETE CASCADE)
DELETE FROM modules
WHERE course_id = (SELECT id FROM courses WHERE slug = 'investing-fundamentals');

-- Insert modules and lessons for Investing Fundamentals course
DO $$
DECLARE
  v_course_id UUID;
  v_module1_id UUID;
  v_module2_id UUID;
  v_module3_id UUID;
BEGIN
  -- Get course ID
  SELECT id INTO v_course_id FROM courses WHERE slug = 'investing-fundamentals';
  
  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'Course with slug investing-fundamentals not found';
  END IF;

  -- Insert Module 1: Foundations & Strategy
  INSERT INTO modules (course_id, title, position)
  VALUES (v_course_id, 'Foundations & Strategy', 1)
  RETURNING id INTO v_module1_id;

  -- Lesson 1
  INSERT INTO lessons (module_id, title, body, video_url, position)
  VALUES (
    v_module1_id,
    'Lesson 1',
    '<h2>Tax Lien Certificates & Tax Deeds: Safe, Predictable Investing</h2>

<h3>Meet the Team & Community:</h3>
<p>Join the instructor and his expert team—including seasoned coaches like the veteran coach and the investor-coach team—who have helped thousands safely invest in tax lien certificates and tax deeds. With decades of experience and live support through weekly Q&A webinars, one-on-one coaching, and facilitator-led Zoom calls, you'll have guidance every step of the way.</p>

<h3>Why Tax Liens?</h3>
<p>Tax lien certificates offer a government-backed, low-risk way to earn high, legally mandated interest rates—often 16% to 24%—by paying off delinquent property taxes. Most certificates are redeemed, so you get your investment back plus interest; in rare cases, you may acquire the property, often mortgage-free and for a fraction of its value.</p>

<h3>How It Works:</h3>
<p>Local governments sell tax lien certificates at public auctions (now mostly online) to recover unpaid property taxes.</p>

<h3>Strategies & Real Results:</h3>
<p>Conservative investors like the veteran coach target quality properties likely to redeem, ensuring steady, passive returns.</p>

<h3>Getting Started:</h3>
<p>All research, bidding, and purchases can be done online, making this accessible from anywhere—even for beginners.</p>

<h3>Ready to Learn More?</h3>
<p>Explore America's 200-year-old, government-backed tax lien and tax deed system.</p>',
    'https://player.vimeo.com/video/000000000',
    1
  );

  -- Lesson 2
  INSERT INTO lessons (module_id, title, body, video_url, position)
  VALUES (
    v_module1_id,
    'Lesson 2',
    '<h3>Lesson 2 Summary: Investing in Tax Deeds</h3>
<h3>What Is a Tax Deed?</h3>
<h3>How the Auctions Work</h3>
<h3>Research Is Everything</h3>
<h3>A Real Student's First Deal</h3>
<h3>Selling the Property</h3>
<h3>Start Small, Then Scale</h3>
<h3>The Bigger Picture</h3>',
    'https://player.vimeo.com/video/000000000',
    2
  );

  -- Lesson 3
  INSERT INTO lessons (module_id, title, body, video_url, position)
  VALUES (
    v_module1_id,
    'Lesson 3',
    '<h3>Tax Lien & Tax Deed Investing: Strategies and Success with the investor-coach team</h3>
<h3>The investor-coach team & the investor-coach team's Approach</h3>
<h3>Two Distinct Investment Strategies</h3>
<h3>The investor-coach team & the investor-coach team's Success Stories</h3>
<h3>Key Lessons & Best Practices</h3>
<h3>Student Successes & Broader Impact</h3>
<h3>Summary</h3>',
    'https://player.vimeo.com/video/000000000',
    3
  );

  -- Insert Module 2: Student Success Stories
  INSERT INTO modules (course_id, title, position)
  VALUES (v_course_id, 'Student Success Stories', 2)
  RETURNING id INTO v_module2_id;

  -- Lesson 4
  INSERT INTO lessons (module_id, title, body, video_url, position)
  VALUES (
    v_module2_id,
    'Lesson 4',
    '<h3>Tax Lien Certificates & Tax Deeds: Strategies, Student Success, and the featured investor's Journey</h3>
<h3>The featured investor's Experience</h3>
<h3>Tax Lien & Tax Deed Strategies</h3>
<h3>Key Lessons and Best Practices</h3>
<h3>Summary</h3>',
    'https://player.vimeo.com/video/000000000',
    1
  );

  -- Lesson 5
  INSERT INTO lessons (module_id, title, body, video_url, position)
  VALUES (
    v_module2_id,
    'Lesson 5',
    '<h3>Tax Lien Certificates & Tax Deeds: Fundamentals, Strategies, and the seasoned coach's Journey</h3>
<h3>How Tax Liens and Tax Deeds Work</h3>
<h3>The seasoned coach's Investor Story</h3>
<h3>Expert Strategies and Student Successes</h3>
<h3>Best Practices and Key Takeaways</h3>
<h3>Summary</h3>',
    'https://player.vimeo.com/video/000000000',
    2
  );

  -- Lesson 6
  INSERT INTO lessons (module_id, title, body, video_url, position)
  VALUES (
    v_module2_id,
    'Lesson 6',
    '<h3>Tax Lien & Tax Deed Investing: New and Experienced Investors</h3>
<h3>The new investor's Experience: From Uncertainty to Confidence</h3>
<h3>The retiree investor: Learning by Example</h3>
<h3>the coaching couple: Building Success Together</h3>
<h3>Key Takeaways</h3>',
    'https://player.vimeo.com/video/000000000',
    3
  );

  -- Insert Module 3: Breakthroughs & Masterclass
  INSERT INTO modules (course_id, title, position)
  VALUES (v_course_id, 'Breakthroughs & Masterclass', 3)
  RETURNING id INTO v_module3_id;

  -- Lesson 7
  INSERT INTO lessons (module_id, title, body, video_url, position)
  VALUES (
    v_module3_id,
    'Lesson 7',
    '<h3>Tax Lien & Tax Deed Investing: The new investor's Breakthrough and The seasoned coach's Insights</h3>
<h3>The new investor's Journey: From Uncertainty to Action</h3>
<h3>The seasoned coach: Building Wealth Step by Step</h3>
<h3>Key Takeaways</h3>
<h3>Summary</h3>',
    'https://player.vimeo.com/video/000000000',
    1
  );

  -- Lesson 8
  INSERT INTO lessons (module_id, title, body, video_url, position)
  VALUES (
    v_module3_id,
    'Lesson 8',
    '<h3>Focus on the Florida investor, the veteran coach, the investor-coach team, and the student investor</h3>
<h3>The Florida investor's Story:</h3>
<h3>The veteran coach:</h3>
<h3>The investor-coach team:</h3>
<h3>The student investor's Experience:</h3>
<h3>Summary:</h3>',
    'https://player.vimeo.com/video/000000000',
    2
  );

  -- Lesson 9
  INSERT INTO lessons (module_id, title, body, video_url, position)
  VALUES (
    v_module3_id,
    'Lesson 9',
    '<h3>Lesson 9: Featuring the Instructor, Coaches, and Student Investors</h3>
<h3>The instructor</h3>
<h3>The Florida investor</h3>
<h3>The veteran coach</h3>
<h3>The investor-coach team</h3>
<h3>The student investor</h3>
<h3>The physician investor</h3>
<h3>Key Takeaways</h3>
<h3>Summary</h3>',
    'https://player.vimeo.com/video/000000000',
    3
  );

END $$;
