import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AuthResult = {
  authUser: {
    id: string;
    email?: string;
  };
  profile: {
    id: string;
    email: string;
    full_name: string | null;
    role: "admin" | "coach" | "client";
    is_active: boolean;
  };
};

/**
 * Ensures the current user is authenticated.
 * Redirects to /auth/login if not authenticated.
 * 
 * @returns The authenticated user and their profile
 */
export async function requireAuth(): Promise<AuthResult> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/auth/login");
  }

  // Use admin client to bypass RLS for authorization check
  const adminClient = createAdminClient();
  const { data: profile, error } = await adminClient
    .from("users")
    .select("id, email, full_name, role, is_active")
    .eq("id", authUser.id)
    .single();

  if (error || !profile) {
    console.error("Failed to load user profile:", error);
    redirect("/auth/login");
  }

  return {
    authUser: {
      id: authUser.id,
      email: authUser.email,
    },
    profile,
  };
}
