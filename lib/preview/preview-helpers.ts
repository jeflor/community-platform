import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export interface PreviewState {
  active: boolean;
  groupSlugs: string[];
}

const PREVIEW_COOKIE_NAME = "admin_preview_state";

/**
 * Get the current preview state from the cookie (server-side)
 */
export async function getPreviewState(): Promise<PreviewState | null> {
  const cookieStore = await cookies();
  const previewCookie = cookieStore.get(PREVIEW_COOKIE_NAME);
  
  if (!previewCookie) {
    return null;
  }

  try {
    const state = JSON.parse(previewCookie.value) as PreviewState;
    if (state.active && Array.isArray(state.groupSlugs)) {
      return state;
    }
  } catch (error) {
    console.error("Failed to parse preview cookie:", error);
  }

  return null;
}

/**
 * Check if preview mode is currently active
 */
export async function isPreviewing(): Promise<boolean> {
  const state = await getPreviewState();
  return state?.active ?? false;
}

/**
 * Get the effective group slugs for a user, considering preview mode
 * If previewing, returns the preview groups instead of actual groups
 */
export async function getEffectiveGroupSlugs(
  userId: string,
  isAdmin: boolean
): Promise<string[]> {
  // Check if preview is active
  const previewState = await getPreviewState();
  
  if (previewState?.active && isAdmin) {
    // Return preview groups (including auto-added dependencies)
    return expandGroupSlugs(previewState.groupSlugs);
  }

  // Normal mode: fetch actual user groups
  const adminClient = createAdminClient();
  const { data: userGroups } = await adminClient
    .from("group_members")
    .select("group_id, access_groups(slug)")
    .eq("user_id", userId);
  
  return userGroups
    ?.map(g => {
      const group = g.access_groups as unknown as { slug: string | null };
      return group?.slug;
    })
    .filter((slug): slug is string => slug !== null) || [];
}

/**
 * Expand group slugs to include dependencies
 * Rule: paid-students automatically includes free-members
 */
function expandGroupSlugs(slugs: string[]): string[] {
  const expanded = new Set(slugs);
  
  // If paid-students is included, also include free-members
  if (expanded.has("paid-students")) {
    expanded.add("free-members");
  }
  
  return Array.from(expanded);
}

/**
 * Get the effective role for navigation/UI purposes
 * When previewing, treat as non-admin for content filtering
 */
export function getEffectiveRole(actualRole: string, isPreviewing: boolean): string {
  if (isPreviewing && actualRole === "admin") {
    return "client"; // Treat as regular user for nav filtering
  }
  return actualRole;
}

/**
 * Fetch all access groups for the preview selector
 */
export async function getAccessGroups() {
  const adminClient = createAdminClient();
  const { data: groups, error } = await adminClient
    .from("access_groups")
    .select("id, name, slug")
    .order("name");
  
  if (error) {
    console.error("Failed to fetch access groups:", error);
    return [];
  }
  
  return groups || [];
}
