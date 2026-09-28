"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export interface Channel {
  id: string;
  name: string;
  slug: string;
  type: "chat" | "thread";
  description: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface ChannelWithGroups extends Channel {
  channel_groups: Array<{ group_id: string }>;
}

export async function getAccessibleChannels(): Promise<Channel[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("channels")
    .select("*")
    .order("position", { ascending: true });

  if (error) {
    console.error("Error fetching channels:", error);
    return [];
  }

  return data || [];
}

export async function getChannel(slug: string): Promise<Channel | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("channels")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    console.error("Error fetching channel:", error);
    return null;
  }

  return data;
}

export async function getAllChannelsWithGroups(): Promise<ChannelWithGroups[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("channels")
    .select("*, channel_groups(group_id)")
    .order("position", { ascending: true });

  if (error) {
    console.error("Error fetching channels with groups:", error);
    return [];
  }

  return data || [];
}

export async function createChannel(formData: {
  name: string;
  slug: string;
  type: "chat" | "thread";
  description?: string;
  position?: number;
  groupIds?: string[];
}): Promise<{ success: boolean; error?: string; channelId?: string }> {
  try {
    const supabase = await createClient();

    const { data: channel, error: channelError } = await supabase
      .from("channels")
      .insert({
        name: formData.name,
        slug: formData.slug,
        type: formData.type,
        description: formData.description || null,
        position: formData.position || 0,
      })
      .select()
      .single();

    if (channelError) {
      return { success: false, error: channelError.message };
    }

    if (formData.groupIds && formData.groupIds.length > 0) {
      const channelGroups = formData.groupIds.map((groupId) => ({
        channel_id: channel.id,
        group_id: groupId,
      }));

      const { error: groupsError } = await supabase
        .from("channel_groups")
        .insert(channelGroups);

      if (groupsError) {
        console.error("Error adding channel groups:", groupsError);
      }
    }

    revalidatePath("/dashboard/channels");
    revalidatePath("/chat");

    return { success: true, channelId: channel.id };
  } catch (error) {
    console.error("Error creating channel:", error);
    return { success: false, error: "Failed to create channel" };
  }
}

export async function updateChannel(
  channelId: string,
  formData: {
    name?: string;
    slug?: string;
    type?: "chat" | "thread";
    description?: string;
    position?: number;
    groupIds?: string[];
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const updateData: any = {};
    if (formData.name !== undefined) updateData.name = formData.name;
    if (formData.slug !== undefined) updateData.slug = formData.slug;
    if (formData.type !== undefined) updateData.type = formData.type;
    if (formData.description !== undefined) updateData.description = formData.description || null;
    if (formData.position !== undefined) updateData.position = formData.position;

    if (Object.keys(updateData).length > 0) {
      const { error: channelError } = await supabase
        .from("channels")
        .update(updateData)
        .eq("id", channelId);

      if (channelError) {
        return { success: false, error: channelError.message };
      }
    }

    if (formData.groupIds !== undefined) {
      await supabase
        .from("channel_groups")
        .delete()
        .eq("channel_id", channelId);

      if (formData.groupIds.length > 0) {
        const channelGroups = formData.groupIds.map((groupId) => ({
          channel_id: channelId,
          group_id: groupId,
        }));

        const { error: groupsError } = await supabase
          .from("channel_groups")
          .insert(channelGroups);

        if (groupsError) {
          return { success: false, error: groupsError.message };
        }
      }
    }

    revalidatePath("/dashboard/channels");
    revalidatePath("/chat");

    return { success: true };
  } catch (error) {
    console.error("Error updating channel:", error);
    return { success: false, error: "Failed to update channel" };
  }
}

export async function deleteChannel(
  channelId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("channels")
      .delete()
      .eq("id", channelId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/channels");
    revalidatePath("/chat");

    return { success: true };
  } catch (error) {
    console.error("Error deleting channel:", error);
    return { success: false, error: "Failed to delete channel" };
  }
}

export async function getUsersInChannel(
  channelId: string
): Promise<Array<{ id: string; full_name: string; email: string }>> {
  const adminClient = createAdminClient();

  const { data: channelGroups } = await adminClient
    .from("channel_groups")
    .select("group_id")
    .eq("channel_id", channelId);

  if (!channelGroups || channelGroups.length === 0) {
    return [];
  }

  const groupIds = channelGroups.map((cg) => cg.group_id);

  const { data: users } = await adminClient
    .from("group_members")
    .select("user_id, users(id, full_name, email)")
    .in("group_id", groupIds);

  if (!users) {
    return [];
  }

  const uniqueUsers = new Map();
  users.forEach((item: any) => {
    if (item.users) {
      uniqueUsers.set(item.users.id, item.users);
    }
  });

  return Array.from(uniqueUsers.values());
}
