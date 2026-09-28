"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Whitelist only safe profile fields that users can update
const updateProfileSchema = z.object({
  full_name: z.string().max(200).optional(),
  bio: z.string().max(500).optional(),
  headline: z.string().max(80).optional(),
  location: z.string().max(80).optional(),
  avatar_url: z.string().url().max(2000).optional(),
});

interface UpdateProfileInput {
  full_name?: string;
  bio?: string;
  headline?: string;
  location?: string;
  avatar_url?: string;
}

export async function updateOwnProfile(data: UpdateProfileInput) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "Not authenticated" };
  }

  // Validate and whitelist only safe fields
  const validation = updateProfileSchema.safeParse(data);
  
  if (!validation.success) {
    return { error: validation.error.errors[0]?.message || "Invalid input" };
  }

  // Only update whitelisted fields - never spread unchecked input
  const safeData = validation.data;

  const { error } = await supabase
    .from("users")
    .update(safeData)
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/members");
  revalidatePath(`/dashboard/members/${user.id}`);
  
  return { success: true };
}
