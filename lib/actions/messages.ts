"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  edited_at: string | null;
  users?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string;
  };
  reactions?: Array<{
    emoji: string;
    user_id: string;
    users?: {
      full_name: string | null;
    };
  }>;
  mentions?: Array<{
    mentioned_user_id: string;
    read_at: string | null;
  }>;
}

export async function getMessages(
  channelId: string,
  limit: number = 50,
  before?: string
): Promise<Message[]> {
  const supabase = await createClient();

  let query = supabase
    .from("messages")
    .select(
      `
      *,
      users(id, full_name, avatar_url, role),
      reactions(emoji, user_id, users(full_name)),
      mentions(mentioned_user_id, read_at)
    `
    )
    .eq("channel_id", channelId)
    .is("parent_id", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching messages:", error);
    return [];
  }

  return (data || []).reverse();
}

export async function getReplies(parentId: string): Promise<Message[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("messages")
    .select(
      `
      *,
      users(id, full_name, avatar_url, role),
      reactions(emoji, user_id, users(full_name)),
      mentions(mentioned_user_id, read_at)
    `
    )
    .eq("parent_id", parentId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching replies:", error);
    return [];
  }

  return data || [];
}

export async function createMessage(
  channelId: string,
  body: string,
  parentId?: string | null
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const mentionRegex = /@(\w+)/g;
    const mentions = [...body.matchAll(mentionRegex)].map((m) => m[1]);

    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert({
        channel_id: channelId,
        user_id: user.id,
        parent_id: parentId || null,
        body,
      })
      .select()
      .single();

    if (messageError) {
      return { success: false, error: messageError.message };
    }

    if (mentions.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("id, email")
        .in(
          "email",
          mentions.map((m) => `${m}@`)
        );

      if (users && users.length > 0) {
        const mentionInserts = users.map((u) => ({
          message_id: message.id,
          mentioned_user_id: u.id,
        }));

        await supabase.from("mentions").insert(mentionInserts);
      }
    }

    revalidatePath(`/chat/${channelId}`);

    return { success: true, messageId: message.id };
  } catch (error) {
    console.error("Error creating message:", error);
    return { success: false, error: "Failed to create message" };
  }
}

export async function updateMessage(
  messageId: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("messages")
      .update({
        body,
        edited_at: new Date().toISOString(),
      })
      .eq("id", messageId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating message:", error);
    return { success: false, error: "Failed to update message" };
  }
}

export async function deleteMessage(
  messageId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("id", messageId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting message:", error);
    return { success: false, error: "Failed to delete message" };
  }
}

export async function addReaction(
  messageId: string,
  emoji: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { error } = await supabase.from("reactions").insert({
      message_id: messageId,
      user_id: user.id,
      emoji,
    });

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: "Reaction already exists" };
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error adding reaction:", error);
    return { success: false, error: "Failed to add reaction" };
  }
}

export async function removeReaction(
  messageId: string,
  emoji: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { error } = await supabase
      .from("reactions")
      .delete()
      .eq("message_id", messageId)
      .eq("user_id", user.id)
      .eq("emoji", emoji);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error removing reaction:", error);
    return { success: false, error: "Failed to remove reaction" };
  }
}

export async function markMentionAsRead(
  messageId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { error } = await supabase
      .from("mentions")
      .update({ read_at: new Date().toISOString() })
      .eq("message_id", messageId)
      .eq("mentioned_user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error marking mention as read:", error);
    return { success: false, error: "Failed to mark mention as read" };
  }
}

export async function getUnreadMentions(): Promise<number> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return 0;
  }

  const { count, error } = await supabase
    .from("mentions")
    .select("*", { count: "exact", head: true })
    .eq("mentioned_user_id", user.id)
    .is("read_at", null);

  if (error) {
    console.error("Error getting unread mentions:", error);
    return 0;
  }

  return count || 0;
}
