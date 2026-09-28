import { createClient } from "@/lib/supabase/server";

export interface NavItem {
  id: string;
  enabled: boolean;
  label: string;
  href: string;
  group_slugs: string[];
  is_custom: boolean;
}

export async function getNavItems(): Promise<NavItem[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "nav_items")
      .single();

    if (data?.value && Array.isArray(data.value)) {
      return data.value as NavItem[];
    }
  } catch (error) {
    console.error("Failed to fetch nav items:", error);
  }

  return [];
}

export async function getFilteredNavItems(userRole: string, userGroupSlugs: string[]): Promise<NavItem[]> {
  const allItems = await getNavItems();
  
  // Admins see all enabled items
  if (userRole === "admin") {
    return allItems.filter(item => item.enabled);
  }

  // Filter by group membership
  return allItems.filter(item => {
    if (!item.enabled) return false;
    
    // If no group restrictions, show to all authenticated users
    if (!item.group_slugs || item.group_slugs.length === 0) {
      return true;
    }

    // Check if user is in any of the required groups
    return item.group_slugs.some(slug => userGroupSlugs.includes(slug));
  });
}
