-- Drop insecure public SELECT policy on signup_links
-- This policy was allowing anonymous users to SELECT all enabled signup links,
-- which leaked all tokens. Now links are looked up via admin client or SECURITY DEFINER functions.

DROP POLICY IF EXISTS "Anyone can view enabled signup links" ON public.signup_links;
