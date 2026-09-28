import { createClient } from "@/lib/supabase/server";

export async function getSupportEmail(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "support_email")
      .single();

    if (data?.value && typeof data.value === "string" && data.value.trim() !== "") {
      return data.value as string;
    }
  } catch (error) {
    console.error("Failed to fetch support email:", error);
  }

  return null;
}
