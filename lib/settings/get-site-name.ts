import { createClient } from "@/lib/supabase/server";

export async function getSiteName(): Promise<string> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "site_name")
      .single();

    if (data?.value) {
      return data.value as string;
    }
  } catch (error) {
    console.error("Failed to fetch site name:", error);
  }

  return process.env.NEXT_PUBLIC_SITE_NAME || "Community Platform";
}
