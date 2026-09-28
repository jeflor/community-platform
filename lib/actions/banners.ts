"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const bannerSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, "Title is required"),
  body: z.string().min(1, "Body is required"),
  href: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val === "") return true;
        return val.startsWith("/") || val.startsWith("http://") || val.startsWith("https://");
      },
      { message: "URL must be a path starting with / or http(s):// - javascript: and other schemes are not allowed" }
    ),
  enabled: z.boolean(),
  position: z.enum(["pulse", "home", "both"]),
  group_slugs: z.array(z.string()),
  starts_at: z.string().nullable().optional(),
  ends_at: z.string().nullable().optional(),
});

async function checkAdmin() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return { error: "Not authenticated", supabase: null };
  }

  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", authUser.id)
    .single();

  if (user?.role !== "admin") {
    return { error: "Not authorized", supabase: null };
  }

  return { supabase, error: null };
}

export async function getBanners() {
  const { supabase, error: authError } = await checkAdmin();
  if (authError) return { error: authError, data: null };

  const { data, error } = await supabase!
    .from("banners")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message, data: null };
  }

  return { data, error: null };
}

export async function createBanner(data: z.infer<typeof bannerSchema>) {
  const { supabase, error: authError } = await checkAdmin();
  if (authError) return { error: authError };

  const validation = bannerSchema.safeParse(data);
  if (!validation.success) {
    return { error: validation.error.errors[0].message };
  }

  const { error } = await supabase!.from("banners").insert({
    title: data.title,
    body: data.body,
    href: data.href || null,
    enabled: data.enabled,
    position: data.position,
    group_slugs: data.group_slugs,
    starts_at: data.starts_at || null,
    ends_at: data.ends_at || null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/pulse");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateBanner(data: z.infer<typeof bannerSchema>) {
  const { supabase, error: authError } = await checkAdmin();
  if (authError) return { error: authError };

  const validation = bannerSchema.safeParse(data);
  if (!validation.success) {
    return { error: validation.error.errors[0].message };
  }

  if (!data.id) {
    return { error: "Banner ID is required" };
  }

  const { error } = await supabase!
    .from("banners")
    .update({
      title: data.title,
      body: data.body,
      href: data.href || null,
      enabled: data.enabled,
      position: data.position,
      group_slugs: data.group_slugs,
      starts_at: data.starts_at || null,
      ends_at: data.ends_at || null,
    })
    .eq("id", data.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/pulse");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteBanner(id: string) {
  const { supabase, error: authError } = await checkAdmin();
  if (authError) return { error: authError };

  const { error } = await supabase!.from("banners").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/pulse");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function getActiveBanners(position: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("banners")
    .select("*")
    .eq("enabled", true)
    .or(`position.eq.${position},position.eq.both`)
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message, data: null };
  }

  // Filter by time window on the client side (RLS handles visibility)
  const now = new Date();
  const activeBanners = (data || []).filter((banner) => {
    if (banner.starts_at && new Date(banner.starts_at) > now) {
      return false;
    }
    if (banner.ends_at && new Date(banner.ends_at) < now) {
      return false;
    }
    return true;
  });

  return { data: activeBanners, error: null };
}
