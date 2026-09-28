import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { getThemeSettings } from "@/lib/settings/get-theme";
import { getSiteName } from "@/lib/settings/get-site-name";
import { createClient } from "@/lib/supabase/server";

async function getSiteTagline(): Promise<string> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "site_tagline")
      .single();

    if (data?.value) {
      return data.value as string;
    }
  } catch (error) {
    console.error("Failed to fetch site tagline:", error);
  }

  return "";
}

export default async function LoginPage() {
  const theme = await getThemeSettings();
  const siteName = await getSiteName();
  const siteTagline = await getSiteTagline();

  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <LoginForm theme={theme} siteName={siteName} siteTagline={siteTagline} />
    </Suspense>
  );
}
