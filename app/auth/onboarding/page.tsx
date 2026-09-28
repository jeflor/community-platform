import { Suspense } from "react";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/auth/OnboardingForm";
import { getThemeSettings } from "@/lib/settings/get-theme";
import { getSiteName } from "@/lib/settings/get-site-name";
import { createClient } from "@/lib/supabase/server";

interface OnboardingSettings {
  enabled: boolean;
  questions: Array<{
    id: string;
    text: string;
    required: boolean;
    include_in_bio: boolean;
    private: boolean;
  }>;
  profile_picture_required: boolean;
  code_of_conduct_slug: string | null;
}

async function getOnboardingSettings(): Promise<OnboardingSettings> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "onboarding")
      .single();

    if (data?.value) {
      return data.value as OnboardingSettings;
    }
  } catch (error) {
    console.error("Failed to fetch onboarding settings:", error);
  }

  // Return default settings if not found
  return {
    enabled: true,
    questions: [],
    profile_picture_required: false,
    code_of_conduct_slug: null,
  };
}

export default async function OnboardingPage() {
  const supabase = await createClient();
  
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/auth/login");
  }

  // Check if user has already completed onboarding
  const { data: userData } = await supabase
    .from("users")
    .select("onboarding_completed")
    .eq("id", user.id)
    .single();

  if (userData?.onboarding_completed) {
    redirect("/dashboard");
  }

  const theme = await getThemeSettings();
  const siteName = await getSiteName();
  const settings = await getOnboardingSettings();

  // If onboarding is disabled, mark as complete and redirect
  if (!settings.enabled) {
    await supabase
      .from("users")
      .update({ onboarding_completed: true })
      .eq("id", user.id);
    redirect("/dashboard");
  }

  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <OnboardingForm theme={theme} siteName={siteName} settings={settings} />
    </Suspense>
  );
}
