import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "admin" | "coach" | "client";
  is_active: boolean;
  sidebar_width: number;
  created_at: string;
  updated_at: string;
};

/**
 * Gets the current authenticated user's profile using admin client to bypass RLS.
 * This is necessary because RLS policies on the users table would create circular dependencies
 * when trying to read the current user's own profile.
 * 
 * @returns The user profile or null if not authenticated or profile doesn't exist
 */
export async function getCurrentProfile(): Promise<UserProfile | null> {
  // Use SSR client only for auth check
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return null;
  }

  // Use admin client to bypass RLS for reading current user's profile
  const adminClient = createAdminClient();
  const { data: profile, error } = await adminClient
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (error || !profile) {
    console.error("Failed to load user profile:", error);
    return null;
  }

  return profile as UserProfile;
}
