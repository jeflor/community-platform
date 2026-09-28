"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export interface DMThread {
  id: string;
  client_id: string;
  created_at: string;
  updated_at: string;
  client?: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
    role: string;
  };
  last_message?: {
    body: string;
    created_at: string;
    user_id: string;
  };
  unread_count?: number;
}

export interface DMMessage {
  id: string;
  thread_id: string;
  user_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  users?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string;
    email: string;
  };
}

/**
 * Get or create a DM thread for the current user (client) with the team
 */
export async function getOrCreateClientThread(): Promise<{
  success: boolean;
  threadId?: string;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Check if thread exists
    const { data: existingThread } = await supabase
      .from("dm_threads")
      .select("id")
      .eq("client_id", user.id)
      .single();

    if (existingThread) {
      return { success: true, threadId: existingThread.id };
    }

    // Create new thread
    const { data: newThread, error: createError } = await supabase
      .from("dm_threads")
      .insert({ client_id: user.id })
      .select("id")
      .single();

    if (createError) {
      return { success: false, error: createError.message };
    }

    return { success: true, threadId: newThread.id };
  } catch (error) {
    console.error("Error getting/creating client thread:", error);
    return { success: false, error: "Failed to get or create thread" };
  }
}

/**
 * Get or create a DM thread for a specific client (team members only)
 */
export async function getOrCreateThreadForClient(clientId: string): Promise<{
  success: boolean;
  threadId?: string;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // Check if thread exists
    const { data: existingThread } = await supabase
      .from("dm_threads")
      .select("id")
      .eq("client_id", clientId)
      .single();

    if (existingThread) {
      return { success: true, threadId: existingThread.id };
    }

    // Create new thread
    const { data: newThread, error: createError } = await supabase
      .from("dm_threads")
      .insert({ client_id: clientId })
      .select("id")
      .single();

    if (createError) {
      return { success: false, error: createError.message };
    }

    return { success: true, threadId: newThread.id };
  } catch (error) {
    console.error("Error getting/creating thread for client:", error);
    return { success: false, error: "Failed to get or create thread" };
  }
}

/**
 * Get all DM threads (for team members, returns all client threads; for clients, returns their own thread)
 */
export async function getDMThreads(): Promise<DMThread[]> {
  try {
    const adminClient = createAdminClient();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    // Get user role
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userData) {
      return [];
    }

    const isTeamMember = userData.role === "admin" || userData.role === "coach";

    // Build query for threads
    let threadsQuery = adminClient
      .from("dm_threads")
      .select(
        `
        id,
        client_id,
        created_at,
        updated_at,
        client:users!dm_threads_client_id_fkey(id, full_name, email, avatar_url, role)
      `
      )
      .order("updated_at", { ascending: false });

    if (!isTeamMember) {
      // Clients only see their own thread
      threadsQuery = threadsQuery.eq("client_id", user.id);
    }

    const { data: threads, error } = await threadsQuery;

    if (error) {
      console.error("Error fetching DM threads:", error);
      return [];
    }

    if (!threads) {
      return [];
    }

    // Get last message for each thread
    const threadsWithMessages: DMThread[] = await Promise.all(
      threads.map(async (thread: any) => {
        const { data: lastMessage } = await adminClient
          .from("dm_messages")
          .select("body, created_at, user_id")
          .eq("thread_id", thread.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        // Get unread count for current user
        const { count: unreadCount } = await adminClient
          .from("dm_messages")
          .select("*", { count: "exact", head: true })
          .eq("thread_id", thread.id)
          .neq("user_id", user.id)
          .is("read_at", null);

        return {
          id: thread.id,
          client_id: thread.client_id,
          created_at: thread.created_at,
          updated_at: thread.updated_at,
          client: Array.isArray(thread.client) ? thread.client[0] : thread.client,
          last_message: lastMessage || undefined,
          unread_count: unreadCount || 0,
        };
      })
    );

    return threadsWithMessages;
  } catch (error) {
    console.error("Error fetching DM threads:", error);
    return [];
  }
}

/**
 * Get messages for a specific thread
 */
export async function getDMMessages(
  threadId: string,
  limit: number = 50
): Promise<DMMessage[]> {
  try {
    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from("dm_messages")
      .select(
        `
        *,
        users(id, full_name, avatar_url, role, email)
      `
      )
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) {
      console.error("Error fetching DM messages:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching DM messages:", error);
    return [];
  }
}

/**
 * Send a DM message
 */
export async function sendDMMessage(
  threadId: string,
  body: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data: message, error: messageError } = await supabase
      .from("dm_messages")
      .insert({
        thread_id: threadId,
        user_id: user.id,
        body,
      })
      .select()
      .single();

    if (messageError) {
      return { success: false, error: messageError.message };
    }

    // Send DM notification email (Phase 7)
    const adminClient = createAdminClient();
    const { data: thread } = await adminClient
      .from("dm_threads")
      .select("client_id")
      .eq("id", threadId)
      .single();

    if (thread) {
      const recipientId = thread.client_id === user.id 
        ? null // If sender is the client, we'd need to notify team members (not implemented yet)
        : thread.client_id; // If sender is team member, notify the client

      if (recipientId && recipientId !== user.id) {
        const { sendDMNotificationEmail } = await import("@/lib/email/actions");
        sendDMNotificationEmail({
          recipientUserId: recipientId,
          senderUserId: user.id,
          threadId,
          messageBody: body,
        }).catch((err) => {
          console.error("[DM] Failed to send notification email:", err);
        });
      }
    }

    revalidatePath("/dashboard/messages");

    return { success: true, messageId: message.id };
  } catch (error) {
    console.error("Error sending DM message:", error);
    return { success: false, error: "Failed to send message" };
  }
}

/**
 * Mark DM messages as read
 */
export async function markDMMessagesAsRead(
  threadId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Use the SECURITY DEFINER function to mark messages as read
    const { error } = await supabase.rpc("mark_dm_messages_read_in_thread", {
      p_thread_id: threadId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error marking messages as read:", error);
    return { success: false, error: "Failed to mark messages as read" };
  }
}

/**
 * Get total unread DM count for current user
 */
export async function getUnreadDMCount(): Promise<number> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return 0;
    }

    // Get user role
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userData) {
      return 0;
    }

    const isTeamMember = userData.role === "admin" || userData.role === "coach";

    // Get accessible thread IDs
    let threadIdsQuery = supabase.from("dm_threads").select("id");

    if (!isTeamMember) {
      threadIdsQuery = threadIdsQuery.eq("client_id", user.id);
    }

    const { data: threadIds } = await threadIdsQuery;

    if (!threadIds || threadIds.length === 0) {
      return 0;
    }

    // Count unread messages across all accessible threads
    const { count, error } = await supabase
      .from("dm_messages")
      .select("*", { count: "exact", head: true })
      .in(
        "thread_id",
        threadIds.map((t) => t.id)
      )
      .neq("user_id", user.id)
      .is("read_at", null);

    if (error) {
      console.error("Error getting unread DM count:", error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error("Error getting unread DM count:", error);
    return 0;
  }
}

/**
 * Delete a DM message
 */
export async function deleteDMMessage(
  messageId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("dm_messages")
      .delete()
      .eq("id", messageId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/messages");

    return { success: true };
  } catch (error) {
    console.error("Error deleting DM message:", error);
    return { success: false, error: "Failed to delete message" };
  }
}

/**
 * Get thread by ID with client info
 */
export async function getDMThread(threadId: string): Promise<DMThread | null> {
  try {
    const adminClient = createAdminClient();

    const { data: thread, error } = await adminClient
      .from("dm_threads")
      .select(
        `
        id,
        client_id,
        created_at,
        updated_at,
        client:users!dm_threads_client_id_fkey(id, full_name, email, avatar_url, role)
      `
      )
      .eq("id", threadId)
      .single();

    if (error) {
      console.error("Error fetching DM thread:", error);
      return null;
    }

    return {
      id: thread.id,
      client_id: thread.client_id,
      created_at: thread.created_at,
      updated_at: thread.updated_at,
      client: Array.isArray(thread.client) ? thread.client[0] : thread.client,
    };
  } catch (error) {
    console.error("Error fetching DM thread:", error);
    return null;
  }
}
