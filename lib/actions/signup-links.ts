"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { nanoid } from "nanoid";

const createSignupLinkSchema = z.object({
  name: z.string().min(1, "Name is required"),
  defaultGroupId: z.string().uuid().optional(),
});

const updateSignupLinkSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Name is required").optional(),
  isEnabled: z.boolean().optional(),
  defaultGroupId: z.string().uuid().optional().nullable(),
});

async function checkAdmin() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return { error: "Not authenticated", supabase: null, userId: null };
  }

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

export async function createSignupLink(
  data: z.infer<typeof createSignupLinkSchema>
) {
  const { error: authError } = await checkAdmin();
  if (authError) return { error: authError };

  const validation = createSignupLinkSchema.safeParse(data);
  if (!validation.success) {
    return { error: validation.error.errors[0].message };
  }

  const adminClient = createAdminClient();

  // Generate a unique token
  const token = nanoid(12);

  const insertData: any = {
    name: data.name,
    token,
    is_enabled: true,
  };

  if (data.defaultGroupId) {
    insertData.default_group_id = data.defaultGroupId;
  }

  const { data: link, error } = await adminClient
    .from("signup_links")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/settings/people");
  return { success: true, link };
}

export async function updateSignupLink(
  data: z.infer<typeof updateSignupLinkSchema>
) {
  const { error: authError } = await checkAdmin();
  if (authError) return { error: authError };

  const validation = updateSignupLinkSchema.safeParse(data);
  if (!validation.success) {
    return { error: validation.error.errors[0].message };
  }

  const adminClient = createAdminClient();

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.isEnabled !== undefined) updateData.is_enabled = data.isEnabled;
  if (data.defaultGroupId !== undefined) {
    updateData.default_group_id = data.defaultGroupId;
  }

  const { error } = await adminClient
    .from("signup_links")
    .update(updateData)
    .eq("id", data.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/settings/people");
  return { success: true };
}

export async function deleteSignupLink(id: string) {
  const { error: authError } = await checkAdmin();
  if (authError) return { error: authError };

  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("signup_links")
    .delete()
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/settings/people");
  return { success: true };
}

export async function getSignupLinkByToken(token: string) {
  // Use admin client to look up the link (not relying on anon SELECT)
  const adminClient = createAdminClient();

  const { data: link, error } = await adminClient
    .from("signup_links")
    .select("*, access_groups(id, name)")
    .eq("token", token)
    .eq("is_enabled", true)
    .single();

  if (error || !link) {
    return { error: "Invalid or expired signup link" };
  }

  // Increment visit count
  await adminClient.rpc("increment_signup_link_visit", { link_token: token });

  return { success: true, link };
}

export async function completeSignupLinkRegistration(
  token: string,
  userId: string
) {
  const adminClient = createAdminClient();

  await adminClient.rpc("complete_signup_link_registration", {
    link_token: token,
    user_id: userId,
  });

  return { success: true };
}
