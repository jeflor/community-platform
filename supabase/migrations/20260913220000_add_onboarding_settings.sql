-- Add onboarding settings row for People > Onboarding tab
INSERT INTO site_settings (key, value, description) VALUES
  (
    'onboarding',
    '{
      "enabled": true,
      "questions": [
        {
          "id": "1",
          "text": "Where are you joining us from? Please include your state and county, province or country.",
          "required": true,
          "include_in_bio": true,
          "private": false
        },
        {
          "id": "2",
          "text": "Which area are you most interested in exploring: tax lien certificates, tax deeds, both... or are you still learning?",
          "required": true,
          "include_in_bio": false,
          "private": false
        },
        {
          "id": "3",
          "text": "What is one fun or unexpected fact about you that might help other members get to know you?",
          "required": true,
          "include_in_bio": true,
          "private": false
        }
      ],
      "profile_picture_required": false,
      "code_of_conduct_slug": null
    }'::jsonb,
    'Onboarding flow configuration: profile questions, picture requirement, and code of conduct'
  )
ON CONFLICT (key) DO NOTHING;
