"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getNotifications(limit: number = 20) {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { notifications: [], unreadCount: 0 };
  }

  // Create event reminders for upcoming events (reference-style)
  // This runs once per session when notifications are loaded
  // Returns count of reminders created, but we don't need to use it
  const { error: reminderError } = await supabase.rpc("create_due_event_reminders");
  // Silently ignore errors - don't block notification fetch
  if (reminderError) {
    console.error("Failed to create event reminders:", reminderError);
  }

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);

  return {
    notifications: notifications || [],
    unreadCount: unreadCount || 0,
  };
}

export async function markNotificationRead(notificationId: string) {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Use RPC function instead of direct UPDATE
  const { error } = await supabase.rpc("mark_notifications_read", {
    p_ids: [notificationId],
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/pulse");
  return { success: true };
}

export async function markAllNotificationsRead() {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Use RPC function with null to mark all as read
  const { error } = await supabase.rpc("mark_notifications_read", {
    p_ids: null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/pulse");
  return { success: true };
}
