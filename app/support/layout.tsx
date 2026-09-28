import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppShell } from "@/components/shell/AppShell";
import { getSiteName } from "@/lib/settings/get-site-name";
import { getEffectiveGroupSlugs, getPreviewState, getAccessGroups } from "@/lib/preview/preview-helpers";
import { PreviewBanner } from "@/components/preview/PreviewBanner";
import { getSidebarSections } from "@/lib/actions/sidebar";
import { getActiveUsers } from "@/lib/actions/users";
import { getThemeSettings } from "@/lib/settings/get-theme";
import { getTopNavSettings } from "@/lib/settings/get-top-nav";

export default async function SupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/auth/login");
  }

  const adminClient = createAdminClient();
  const { data: user } = await adminClient
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

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
