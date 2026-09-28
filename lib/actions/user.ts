"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";

export async function updateSidebarWidth(width: number) {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Ensure width is within bounds
  const clampedWidth = Math.max(200, Math.min(480, width));

  const { error } = await supabase
    .from("users")
    .update({ sidebar_width: clampedWidth })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function getCurrentUser() {
  return await getCurrentProfile();
}

export async function updateProfile({ 
  fullName, 
  avatarUrl, 
  bio, 
  headline, 
  location 
}: { 
  fullName: string; 
  avatarUrl: string; 
  bio?: string; 
  headline?: string; 
  location?: string; 
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Explicitly whitelist safe fields - never allow role or is_active updates from client
  const updateData: Record<string, string> = {
    full_name: fullName.trim(),
    avatar_url: avatarUrl.trim(),
  };

  if (bio !== undefined) updateData.bio = bio.trim();
  if (headline !== undefined) updateData.headline = headline.trim();
  if (location !== undefined) updateData.location = location.trim();

  const { error } = await supabase
    .from("users")
    .update(updateData)
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/account");
  revalidatePath("/dashboard/members/[id]", "page");
  return { success: true };
}

export async function updatePassword(newPassword: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function updateNotificationPrefs(prefs: {
  dm_email: boolean;
  mention_email: boolean;
  event_reminder_email: boolean;
  weekly_digest_email: boolean;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("notification_prefs")
    .upsert(
      {
        user_id: user.id,
        ...prefs,
      },
      { onConflict: "user_id" }
    );

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/account");
  return { success: true };
}

export async function uploadAvatar(file: File) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const fileExt = file.name.split(".").pop();
  const fileName = `${user.id}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(fileName, file, { upsert: true });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(fileName);

  const { error: updateError } = await supabase
    .from("users")
    .update({ avatar_url: publicUrl })
    .eq("id", user.id);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath("/dashboard/account");
  return { success: true, url: publicUrl };
}
