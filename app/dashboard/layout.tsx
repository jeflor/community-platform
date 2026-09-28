import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppShell } from "@/components/shell/AppShell";
import { getSiteName } from "@/lib/settings/get-site-name";
import { getEffectiveGroupSlugs, getEffectiveRole, getPreviewState, getAccessGroups } from "@/lib/preview/preview-helpers";
import { getUnreadDMCount } from "@/lib/actions/dm";
import { PreviewBanner } from "@/components/preview/PreviewBanner";
import { getSidebarSections } from "@/lib/actions/sidebar";
import { getActiveUsers } from "@/lib/actions/users";
import { getThemeSettings } from "@/lib/settings/get-theme";
import { getTopNavSettings } from "@/lib/settings/get-top-nav";
import { getActiveBanners } from "@/lib/actions/banners";
import { CommunityBanner } from "@/components/banners/CommunityBanner";
import type { User as AuthUser } from "@supabase/supabase-js";

async function ensureUserProfile(authUser: AuthUser) {
  const adminClient = createAdminClient();

  let { data: user, error: selectError } = await adminClient
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (user) {
    return { user, error: null };
  }

  const profileData = {
    id: authUser.id,
    email: authUser.email!,
    full_name: authUser.user_metadata?.full_name || authUser.email,
    role: "client",
    sidebar_width: 240,
  };

  const { error: upsertError } = await adminClient
    .from("users")
    .upsert(profileData, { onConflict: "id" });

  if (upsertError) {
    return { user: null, error: upsertError };
  }

  const { data: reselectedUser, error: reselectError } = await adminClient
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (reselectError || !reselectedUser) {
    return { user: null, error: reselectError };
  }

  return { user: reselectedUser, error: null };
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/auth/login");
  }

  const { user, error } = await ensureUserProfile(authUser);

  if (!user || error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
          <h1 className="mb-4 text-2xl font-bold text-red-600">
            Profile Setup Error
          </h1>
          <p className="mb-4 text-gray-700">
            We couldn't set up your user profile. Please contact support.
          </p>
          {error && (
            <div className="rounded bg-red-50 p-4 text-sm text-red-800">
              <p className="font-semibold">Error details:</p>
              <p className="mt-1">{error.message}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const siteName = await getSiteName();
  
  // Get effective group slugs and role (considering preview mode)
  const isAdmin = user.role === "admin";
  const previewState = await getPreviewState();
  const effectiveGroupSlugs = await getEffectiveGroupSlugs(user.id, isAdmin);
  const effectiveRole = getEffectiveRole(user.role, previewState?.active ?? false);
  
  // Fetch data for AppShell
  const sidebarSections = await getSidebarSections(effectiveGroupSlugs, isAdmin);
  const activeUsers = await getActiveUsers();
  const theme = await getThemeSettings();
  const topNavItems = await getTopNavSettings();
  const availableGroups = isAdmin ? await getAccessGroups() : [];
  
  // Get unread DM count
  const unreadDMCount = await getUnreadDMCount();
  
  // Get active banners for home position
  const bannersResult = await getActiveBanners("home");
  const banners = bannersResult.data || [];

  return (
    <>
      {previewState?.active && isAdmin && (
        <PreviewBanner
          currentGroupSlugs={previewState.groupSlugs}
          availableGroups={availableGroups}
        />
      )}
      <AppShell
        initialWidth={user.sidebar_width}
        user={{
          id: user.id,
          full_name: user.full_name || user.email,
          email: user.email,
          role: user.role,
          avatar_url: user.avatar_url,
        }}
        siteName={siteName}
        sections={sidebarSections}
        activeUsers={activeUsers}
        theme={theme}
        isPreviewing={previewState?.active ?? false}
        unreadDMCount={unreadDMCount}
        availableGroups={availableGroups}
        topNavItems={topNavItems}
        userGroupSlugs={effectiveGroupSlugs}
      >
        {banners.length > 0 && <CommunityBanner banners={banners} />}
        {children}
      </AppShell>
    </>
  );
}
