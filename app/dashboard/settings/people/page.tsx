import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";
import { PeopleSettings } from "@/components/admin/PeopleSettings";

export default async function PeopleSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireAdmin();
  
  const supabase = await createClient();
  const adminClient = createAdminClient();
  const params = await searchParams;
  
  // Fetch members (completed profiles)
  const { data: members } = await adminClient
    .from("users")
    .select("*, group_members(group_id)")
    .order("created_at", { ascending: false });

  // Fetch access groups
  const { data: groups } = await adminClient
    .from("access_groups")
    .select("*, group_members(count)")
    .order("name");

  // Fetch site settings for onboarding
  const { data: onboardingSettings } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "onboarding")
    .single();

  // Fetch leads (users with incomplete profiles based on ProfileNudge rule)
  // Profile is incomplete if: no full_name OR (no headline AND no bio)
  const { data: allUsers } = await adminClient
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });
  
  const leads = allUsers?.filter(user => 
    !user.full_name || 
    ((!user.headline || user.headline.trim() === "") && (!user.bio || user.bio.trim() === ""))
  ) || [];

  // Fetch signup links
  const { data: signupLinks } = await adminClient
    .from("signup_links")
    .select("*, access_groups(name)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">People</h1>
        <p className="text-gray-600 mt-1">
          Manage members, roles, permissions, and onboarding.
        </p>
      </div>
      
      <PeopleSettings
        initialTab={params.tab || "members"}
        members={members || []}
        groups={groups || []}
        leads={leads || []}
        signupLinks={signupLinks || []}
        onboardingSettings={onboardingSettings?.value || null}
      />
    </div>
  );
}
