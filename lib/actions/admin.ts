"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const updateUserSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "coach", "client"]).optional(),
  isActive: z.boolean().optional(),
});

const createGroupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

const updateGroupSchema = z.object({
  groupId: z.string().uuid(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

const updateSettingSchema = z.object({
  key: z.string(),
  value: z.any(),
});

async function checkAdmin() {
  // Use SSR client for auth check
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return { error: "Not authenticated", supabase: null, userId: null };
  }

  // Use admin client to bypass RLS for role check
  const adminClient = createAdminClient();
  const { data: user } = await adminClient
    .from("users")
    .select("role")
    .eq("id", authUser.id)
    .single();

  if (user?.role !== "admin") {
    return { error: "Not authorized", supabase: null, userId: null };
  }

  return { supabase, userId: authUser.id, error: null };
}

export async function updateUser(data: z.infer<typeof updateUserSchema>) {
  const { supabase, error: authError } = await checkAdmin();
  if (authError) return { error: authError };

  const validation = updateUserSchema.safeParse(data);
  if (!validation.success) {
    return { error: validation.error.errors[0].message };
  }

  const updateData: Record<string, unknown> = {};
  if (data.role !== undefined) updateData.role = data.role;
  if (data.isActive !== undefined) updateData.is_active = data.isActive;

  const { error } = await supabase!
    .from("users")
    .update(updateData)
    .eq("id", data.userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/members");
  return { success: true };
}

export async function addUserToGroup(userId: string, groupId: string) {
  const { supabase, error: authError } = await checkAdmin();
  if (authError) return { error: authError };

  const { error } = await supabase!
    .from("group_members")
    .insert({ user_id: userId, group_id: groupId, source: "manual" });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/members");
  return { success: true };
}

export async function removeUserFromGroup(userId: string, groupId: string) {
  const { supabase, error: authError } = await checkAdmin();
  if (authError) return { error: authError };

  const { error } = await supabase!
    .from("group_members")
    .delete()
    .eq("user_id", userId)
    .eq("group_id", groupId)
    .eq("source", "manual");

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/members");
  return { success: true };
}

export async function createGroup(data: z.infer<typeof createGroupSchema>) {
  const { supabase, error: authError } = await checkAdmin();
  if (authError) return { error: authError };

  const validation = createGroupSchema.safeParse(data);
  if (!validation.success) {
    return { error: validation.error.errors[0].message };
  }

  const { error } = await supabase!
    .from("access_groups")
    .insert({
      name: data.name,
      description: data.description,
      is_system: false,
    });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/groups");
  return { success: true };
}

export async function updateGroup(data: z.infer<typeof updateGroupSchema>) {
  const { supabase, error: authError } = await checkAdmin();
  if (authError) return { error: authError };

  const validation = updateGroupSchema.safeParse(data);
  if (!validation.success) {
    return { error: validation.error.errors[0].message };
  }

  const { error } = await supabase!
    .from("access_groups")
    .update({
      name: data.name,
      description: data.description,
    })
    .eq("id", data.groupId)
    .eq("is_system", false);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/groups");
  return { success: true };
}

export async function deleteGroup(groupId: string) {
  const { supabase, error: authError } = await checkAdmin();
  if (authError) return { error: authError };

  const { error } = await supabase!
    .from("access_groups")
    .delete()
    .eq("id", groupId)
    .eq("is_system", false);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/groups");
  return { success: true };
}

export async function updateSiteSetting(
  data: z.infer<typeof updateSettingSchema>
) {
  const { supabase, error: authError } = await checkAdmin();
  if (authError) return { error: authError };

  const validation = updateSettingSchema.safeParse(data);
  if (!validation.success) {
    return { error: validation.error.errors[0].message };
  }

  // Use upsert to insert if missing, update if exists
  const { error } = await supabase!
    .from("site_settings")
    .upsert(
      { key: data.key, value: data.value },
      { onConflict: "key" }
    );

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/settings/people");
  return { success: true };
}

export async function uploadLogo(file: File) {
  const { supabase, error: authError } = await checkAdmin();
  if (authError) return { error: authError };

  const fileExt = file.name.split(".").pop();
  const fileName = `logo/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase!.storage
    .from("site-assets")
    .upload(fileName, file, { upsert: true });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const {
    data: { publicUrl },
  } = supabase!.storage.from("site-assets").getPublicUrl(fileName);

  revalidatePath("/dashboard/settings");
  return { success: true, url: publicUrl };
}

const inviteMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
  fullName: z.string().optional(),
  groupIds: z.array(z.string().uuid()).optional(),
});

export async function inviteMember(data: z.infer<typeof inviteMemberSchema>) {
  const { error: authError } = await checkAdmin();
  if (authError) return { error: authError };

  const validation = inviteMemberSchema.safeParse(data);
  if (!validation.success) {
    return { error: validation.error.errors[0].message };
  }

  const adminClient = createAdminClient();
  
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const redirectTo = `${siteUrl}/auth/callback?next=/dashboard`;

  const inviteOptions: {
    data?: { full_name?: string };
    redirectTo?: string;
  } = {
    redirectTo: redirectTo,
  };

  if (data.fullName) {
    inviteOptions.data = { full_name: data.fullName };
  }

  const { data: inviteResult, error: inviteError } =
    await adminClient.auth.admin.inviteUserByEmail(
      data.email,
      inviteOptions
    );

  if (inviteError) {
    if (inviteError.message?.includes("already registered")) {
      return { error: "This email is already registered" };
    }
    return { error: inviteError.message };
  }

  if (!inviteResult?.user?.id) {
    return { error: "Failed to invite user" };
  }

  const userId = inviteResult.user.id;

  if (data.groupIds && data.groupIds.length > 0) {
    // Wait for handle_new_user trigger to create the users row
    // Retry up to 3 times with 500ms delay between attempts
    let existingUser = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data } = await adminClient
        .from("users")
        .select("id")
        .eq("id", userId)
        .single();
      
      if (data) {
        existingUser = data;
        break;
      }
      
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (existingUser) {
      const groupInserts = data.groupIds.map((groupId) => ({
        user_id: userId,
        group_id: groupId,
        source: "manual" as const,
      }));

      const { error: groupError } = await adminClient
        .from("group_members")
        .insert(groupInserts);

      if (groupError && !groupError.message?.includes("duplicate")) {
        console.error("Failed to add user to groups:", groupError);
      }
    }
  }

  revalidatePath("/dashboard/members");
  return { success: true, email: data.email };
}

function escapeCSVField(field: string | null | undefined): string {
  if (field === null || field === undefined) {
    return "";
  }
  const stringField = String(field);
  if (stringField.includes('"') || stringField.includes(',') || stringField.includes('\n')) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }
  return stringField;
}

export async function exportMembersCSV(): Promise<{
  success: boolean;
  csv?: string;
  filename?: string;
  error?: string;
}> {
  const { supabase, error: authError } = await checkAdmin();
  if (authError) {
    return { success: false, error: authError };
  }

  const { data: users, error: queryError } = await supabase!
    .from("users")
    .select(
      `
      id,
      full_name,
      email,
      role,
      is_active,
      last_seen,
      created_at,
      group_members(
        access_groups(name)
      )
    `
    )
    .order("created_at", { ascending: false });

  if (queryError) {
    return { success: false, error: queryError.message };
  }

  const csvRows = [
    "Name,Email,Role,Groups,Last Seen,Created At,Active",
  ];

  for (const user of users || []) {
    const groups = (user.group_members || [])
      .map((gm: any) => {
        const group = gm.access_groups;
        return group?.name || "";
      })
      .filter((name: string) => name)
      .join(";");

    const lastSeen = user.last_seen
      ? new Date(user.last_seen).toISOString()
      : "";
    const createdAt = user.created_at
      ? new Date(user.created_at).toISOString()
      : "";

    const row = [
      escapeCSVField(user.full_name),
      escapeCSVField(user.email),
      escapeCSVField(user.role),
      escapeCSVField(groups),
      escapeCSVField(lastSeen),
      escapeCSVField(createdAt),
      user.is_active ? "Yes" : "No",
    ].join(",");

    csvRows.push(row);
  }

  const csv = csvRows.join("\n");

  return {
    success: true,
    csv,
    filename: "members.csv",
  };
}

export async function addMemberToGroup(userId: string, groupId: string) {
  const { supabase, error: authError } = await checkAdmin();
  if (authError) return { error: authError };

  const { error } = await supabase!
    .from("group_members")
    .insert({ user_id: userId, group_id: groupId, source: "manual" });

  if (error) {
    if (error.message?.includes("duplicate") || error.message?.includes("unique")) {
      return { error: "User is already in this group" };
    }
    return { error: error.message };
  }

  revalidatePath(`/dashboard/members/${userId}`);
  return { success: true };
}

export async function removeMemberFromGroup(userId: string, groupId: string) {
  const { supabase, error: authError } = await checkAdmin();
  if (authError) return { error: authError };

  // Check if this is a system group that shouldn't be removed
  const { data: group } = await supabase!
    .from("access_groups")
    .select("slug, is_system")
    .eq("id", groupId)
    .single();

  if (group?.is_system) {
    return { error: "Cannot remove system groups" };
  }

  // Delete ALL rows for this user+group combination, regardless of source
  const { error, count } = await supabase!
    .from("group_members")
    .delete({ count: "exact" })
    .eq("user_id", userId)
    .eq("group_id", groupId);

  if (error) {
    return { error: error.message };
  }

  // If no rows were deleted, the user wasn't in this group
  if (count === 0) {
    return { error: "User is not in this group" };
  }

  revalidatePath(`/dashboard/members/${userId}`);
  return { success: true };
}

const setMemberActiveSchema = z.object({
  userId: z.string().uuid(),
  isActive: z.boolean(),
});

export async function setMemberActive(
  userId: string,
  isActive: boolean
): Promise<{ success?: boolean; error?: string }> {
  const { supabase, userId: currentUserId, error: authError } = await checkAdmin();
  if (authError) return { error: authError };

  const validation = setMemberActiveSchema.safeParse({ userId, isActive });
  if (!validation.success) {
    return { error: validation.error.errors[0].message };
  }

  // Refuse acting on your own account
  if (userId === currentUserId) {
    return { error: "You cannot deactivate your own account" };
  }

  // Check if target user is also an admin (refuse deactivating another admin)
  const { data: targetUser } = await supabase!
    .from("users")
    .select("role, full_name, email")
    .eq("id", userId)
    .single();

  if (!targetUser) {
    return { error: "User not found" };
  }

  if (targetUser.role === "admin") {
    return { error: "Cannot deactivate another administrator" };
  }

  // Update is_active status
  const { error } = await supabase!
    .from("users")
    .update({ is_active: isActive })
    .eq("id", userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/members/${userId}`);
  revalidatePath("/dashboard/members");
  return { success: true };
}

// Top Nav Management
export async function updateTopNavItem(
  key: string,
  updates: {
    label?: string;
    enabled?: boolean;
    group_slugs?: string[];
  }
) {
  const { supabase, error: authError } = await checkAdmin();
  if (authError) return { error: authError };

  const { data, error: fetchError } = await supabase!
    .from("site_settings")
    .select("value")
    .eq("key", "top_nav")
    .single();

  if (fetchError || !data?.value) {
    return { error: "Failed to fetch top nav settings" };
  }

  // JSONB column returns parsed array directly
  let topNav = data.value;
  
  // Fallback if stored as string (shouldn't happen with JSONB)
  if (typeof topNav === "string") {
    try {
      topNav = JSON.parse(topNav);
    } catch {
      return { error: "Invalid top nav data" };
    }
  }

  if (!Array.isArray(topNav)) {
    return { error: "Invalid top nav format" };
  }

  const itemIndex = topNav.findIndex((item: any) => item.key === key);

  if (itemIndex === -1) {
    return { error: "Top nav item not found" };
  }

  topNav[itemIndex] = { ...topNav[itemIndex], ...updates };

  // Write JSONB directly, no stringify
  const { error: updateError } = await supabase!
    .from("site_settings")
    .update({ value: topNav })
    .eq("key", "top_nav");

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath("/");
  return { success: true };
}

export async function reorderTopNav(keys: string[]) {
  const { supabase, error: authError } = await checkAdmin();
  if (authError) return { error: authError };

  const { data, error: fetchError } = await supabase!
    .from("site_settings")
    .select("value")
    .eq("key", "top_nav")
    .single();

  if (fetchError || !data?.value) {
    return { error: "Failed to fetch top nav settings" };
  }

  // JSONB column returns parsed array directly
  let topNav = data.value;
  
  // Fallback if stored as string (shouldn't happen with JSONB)
  if (typeof topNav === "string") {
    try {
      topNav = JSON.parse(topNav);
    } catch {
      return { error: "Invalid top nav data" };
    }
  }

  if (!Array.isArray(topNav)) {
    return { error: "Invalid top nav format" };
  }

  const reordered = keys.map((key) =>
    topNav.find((item: any) => item.key === key)
  ).filter(Boolean);

  // Write JSONB directly, no stringify
  const { error: updateError } = await supabase!
    .from("site_settings")
    .update({ value: reordered })
    .eq("key", "top_nav");

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath("/");
  return { success: true };
}
