"use server";

import { createClient } from "@/lib/supabase/server";

export interface ActiveUser {
  id: string;
  full_name: string;
  role: string;
  last_seen: string | null;
}

/**
 * Get a list of active users for the presence rail
 * Limited to 12 users
 * Users are considered online if they've been seen in the last 5 minutes
 */
export async function getActiveUsers(): Promise<ActiveUser[]> {
  const supabase = await createClient();

  // Use member_directory view to avoid RLS issues with email column
  const { data: users, error } = await supabase
    .from("member_directory")
    .select("id, full_name, role, last_seen")
    .order("last_seen", { ascending: false, nullsFirst: false })
    .limit(12);

  if (error) {
    console.error("Error fetching active users:", {
      message: error.message,
      code: error.code,
      details: error.details,
    });
    return [];
  }

  if (!users) {
    return [];
  }

  // Filter to users seen in the last 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const onlineUsers = users.filter((user) => {
    if (!user.last_seen) return false;
    return new Date(user.last_seen) > fiveMinutesAgo;
  });

  return onlineUsers;
}

/**
 * Touch the current user's presence timestamp
 * Called periodically to indicate the user is online
 */
export async function touchPresence(): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase
    .from("users")
    .update({ last_seen: new Date().toISOString() })
    .eq("id", user.id);
}
