import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAccessGroups } from "@/lib/preview/preview-helpers";

export default async function SettingsPage() {
  await requireAdmin();
  
  const supabase = await createClient();
  
  const { data: settings } = await supabase
    .from("site_settings")
    .select("*")
    .in("key", [
      "site_name",
      "site_tagline",
      "support_email",
      "direct_messaging_enabled",
      "show_powered_by",
      "sidebar_defaults",
      "member_defaults",
      "nav_items",
      "locked_message_enabled",
      "locked_message_text",
      "locked_messages",
      "theme"
    ]);

  const settingsMap = settings?.reduce(
    (acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    },
    {} as Record<string, unknown>
  ) || {};

  // Fetch access groups for Banners tab
  const availableGroups = await getAccessGroups();

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Settings</h1>
      <p className="text-gray-600 mb-6">
        Manage your community&apos;s brand, settings, app, and subscription.
      </p>

      {/* Quick Links to Settings Sections */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <a
          href="/dashboard/settings/people"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">People</h3>
              <p className="text-sm text-gray-600">
                Manage members, roles, permissions, and onboarding.
              </p>
            </div>
          </div>
        </a>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-4">Site Settings</h2>
      <SettingsForm 
        settings={settingsMap}
        availableGroups={availableGroups}
      />
    </div>
  );
}
