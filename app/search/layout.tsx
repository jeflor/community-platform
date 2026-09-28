import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/AppShell";
import { getSiteName } from "@/lib/settings/get-site-name";
import { getEffectiveGroupSlugs, getPreviewState, getAccessGroups } from "@/lib/preview/preview-helpers";
import { PreviewBanner } from "@/components/preview/PreviewBanner";
import { getSidebarSections } from "@/lib/actions/sidebar";
import { getActiveUsers } from "@/lib/actions/users";
import { getThemeSettings } from "@/lib/settings/get-theme";
import { getTopNavSettings } from "@/lib/settings/get-top-nav";
import type { User as AuthUser } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

async function ensureUserProfile(authUser: AuthUser) {
  const adminClient = createAdminClient();

  let { data: user } = await adminClient
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

  await adminClient.from("users").upsert(profileData, { onConflict: "id" });

  const { data: reselectedUser } = await adminClient
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  return { user: reselectedUser, error: null };
}

export default async function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/auth/login");
  }

  const { user } = await ensureUserProfile(authUser);
  if (!user) {
    redirect("/auth/login");
  }

  const siteName = await getSiteName();
  const isAdmin = user.role === "admin";
  const previewState = await getPreviewState();
  const effectiveGroupSlugs = await getEffectiveGroupSlugs(user.id, isAdmin);
  const sidebarSections = await getSidebarSections(effectiveGroupSlugs, isAdmin);
  const activeUsers = await getActiveUsers();
  const theme = await getThemeSettings();
  const topNavItems = await getTopNavSettings();
  const availableGroups = isAdmin ? await getAccessGroups() : [];

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
        availableGroups={availableGroups}
        topNavItems={topNavItems}
        userGroupSlugs={effectiveGroupSlugs}
      >
        {children}
      </AppShell>
    </>
  );
}
