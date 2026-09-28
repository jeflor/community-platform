import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccountSettings } from "@/components/account/AccountSettings";
import { getThemeSettings } from "@/lib/settings/get-theme";

async function getNotificationPrefs(userId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("notification_prefs")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return {
      dm_email: true,
      mention_email: true,
      event_reminder_email: true,
      weekly_digest_email: true,
    };
  }

  return data;
}

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (!profile) {
    redirect("/auth/login");
  }

  const notificationPrefs = await getNotificationPrefs(authUser.id);
  const theme = await getThemeSettings();

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Account Settings</h1>
      <AccountSettings
        user={{
          id: profile.id,
          full_name: profile.full_name || "",
          email: profile.email,
          avatar_url: profile.avatar_url || "",
          bio: profile.bio,
          headline: profile.headline,
          location: profile.location,
        }}
        notificationPrefs={{
          dm_email: notificationPrefs.dm_email,
          mention_email: notificationPrefs.mention_email,
          event_reminder_email: notificationPrefs.event_reminder_email,
          weekly_digest_email: notificationPrefs.weekly_digest_email,
        }}
        theme={theme}
      />
    </div>
  );
}
