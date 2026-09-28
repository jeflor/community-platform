import { Suspense } from "react";
import { SignupForm } from "@/components/auth/SignupForm";
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

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const theme = await getThemeSettings();
  const siteName = await getSiteName();
  const siteTagline = await getSiteTagline();
  const params = await searchParams;

  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <SignupForm 
        theme={theme} 
        siteName={siteName} 
        siteTagline={siteTagline}
        signupToken={params.token}
      />
    </Suspense>
  );
}
