import { createClient } from "@supabase/supabase-js";

/**
 * Creates an admin Supabase client that bypasses RLS.
 * This should ONLY be used for server-side authorization checks
 * where RLS policies would create circular dependencies.
 * 
 * NEVER use this client for data operations on behalf of users.
 * ONLY use server-side. NEVER import in client components.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
  }

  if (!supabaseServiceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
