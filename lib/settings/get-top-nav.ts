import { createClient } from "@/lib/supabase/server";

export interface TopNavItem {
  key: string;
  label: string;
  href: string;
  icon: string;
  enabled: boolean;
  group_slugs: string[];
}

const DEFAULT_TOP_NAV: TopNavItem[] = [
  { key: "pulse", label: "Pulse", href: "/pulse", icon: "📰", enabled: true, group_slugs: [] },
  { key: "video-courses", label: "Video Courses", href: "/courses", icon: "🎓", enabled: true, group_slugs: [] },
  { key: "resources", label: "Resources", href: "/resources", icon: "📚", enabled: true, group_slugs: [] },
  { key: "events", label: "Events", href: "/dashboard/events", icon: "📅", enabled: true, group_slugs: [] },
  { key: "members", label: "Members", href: "/dashboard/members", icon: "👥", enabled: true, group_slugs: [] },
  { key: "students", label: "Students", href: "/dashboard/coaches", icon: "🎓", enabled: true, group_slugs: ["admin", "coach"] },
  { key: "support", label: "Support", href: "/support", icon: "💬", enabled: true, group_slugs: [] },
];

export async function getTopNavSettings(): Promise<TopNavItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "top_nav")
    .single();

  if (error || !data?.value) {
    return DEFAULT_TOP_NAV;
  }

  // JSONB column returns parsed object/array directly
  if (Array.isArray(data.value)) {
    return data.value as TopNavItem[];
  }

  // Fallback for string (shouldn't happen with JSONB, but handle it)
  if (typeof data.value === "string") {
    try {
      const parsed = JSON.parse(data.value);
      return Array.isArray(parsed) ? parsed : DEFAULT_TOP_NAV;
    } catch {
      return DEFAULT_TOP_NAV;
    }
  }

  return DEFAULT_TOP_NAV;
}

/**
 * Filter top nav items based on user's role and group memberships
 * For admins not previewing: show all enabled items
 * For others: filter by enabled, group_slugs (empty = everyone)
 */
export function filterTopNavForUser(
  items: TopNavItem[],
  userRole: string,
  userGroupSlugs: string[],
  isPreviewing: boolean
): TopNavItem[] {
  const isAdmin = userRole === "admin";

  // Admins see all enabled items unless previewing
  if (isAdmin && !isPreviewing) {
    return items.filter((item) => item.enabled);
  }

  // Members and previewing admins see items based on group_slugs
  return items.filter((item) => {
    if (!item.enabled) return false;

    // Empty group_slugs = visible to everyone
    if (item.group_slugs.length === 0) return true;

    // Check if user has role-based access (admin/coach)
    if (item.group_slugs.includes(userRole)) return true;

    // Check if user is in any of the required groups
    return item.group_slugs.some((slug) => userGroupSlugs.includes(slug));
  });
}
