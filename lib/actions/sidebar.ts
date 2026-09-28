"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Check if the current user is an admin
 * @returns supabase client, userId, and error
 */
async function checkAdmin() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return { error: "Not authenticated", supabase: null, userId: null };
  }

  const adminClient = createAdminClient();
  const { data: user } = await adminClient
    .from("users")
    .select("role")
    .eq("id", authUser.id)
    .single();

  if (user?.role !== "admin") {
    return { error: "Unauthorized", supabase: null, userId: null };
  }

  return { supabase, userId: authUser.id, error: null };
}

export interface SidebarItem {
  id: string;
  label: string;
  href: string;
  icon: string | null;
  position: number;
  enabled: boolean;
  group_slugs: string[];
  channel_type?: string;
  read_only?: boolean;
  description?: string;
  banner_image?: string | null;
}

export interface SidebarSection {
  id: string;
  name: string;
  position: number;
  collapsed_default: boolean;
  group_slugs: string[];
  items: SidebarItem[];
}

/**
 * Get sidebar sections with items, filtered by user's effective group membership
 */
export async function getSidebarSections(
  effectiveGroupSlugs: string[],
  isAdmin: boolean
): Promise<SidebarSection[]> {
  const supabase = await createClient();

  // Fetch all sections
  const { data: sections, error: sectionsError } = await supabase
    .from("sidebar_sections")
    .select("*")
    .order("position");

  if (sectionsError || !sections) {
    console.error("Error fetching sidebar sections:", sectionsError);
    return [];
  }

  // Fetch all items
  const { data: items, error: itemsError } = await supabase
    .from("sidebar_items")
    .select("*")
    .order("section_id, position");

  if (itemsError || !items) {
    console.error("Error fetching sidebar items:", itemsError);
    return [];
  }

  // Filter sections based on group access
  const filteredSections: SidebarSection[] = sections
    .filter((section) => {
      // Admin sees everything
      if (isAdmin) return true;

      // Empty group_slugs = everyone
      if (!section.group_slugs || section.group_slugs.length === 0) return true;

      // Check if user has any of the required groups
      return section.group_slugs.some((slug: string) =>
        effectiveGroupSlugs.includes(slug)
      );
    })
    .map((section) => {
      // Filter items for this section
      const sectionItems = items
        .filter((item) => item.section_id === section.id && item.enabled)
        .filter((item) => {
          // Admin sees all items
          if (isAdmin) return true;

          // Empty group_slugs = everyone who can see the section
          if (!item.group_slugs || item.group_slugs.length === 0) return true;

          // Check if user has any of the required groups
          return item.group_slugs.some((slug: string) =>
            effectiveGroupSlugs.includes(slug)
          );
        })
      .map((item) => ({
        id: item.id,
        label: item.label,
        href: item.href,
        icon: item.icon,
        position: item.position,
        enabled: item.enabled,
        group_slugs: item.group_slugs || [],
        channel_type: item.channel_type || 'threads',
        read_only: item.read_only || false,
        description: item.description || '',
        banner_image: item.banner_image || null,
      }));

      return {
        id: section.id,
        name: section.name,
        position: section.position,
        collapsed_default: section.collapsed_default,
        group_slugs: section.group_slugs || [],
        items: sectionItems,
      };
    })
    .filter((section) => section.items.length > 0); // Only show sections with visible items

  return filteredSections;
}

/**
 * Admin: Get all sidebar sections (for management UI)
 */
export async function getAllSidebarSections(): Promise<SidebarSection[]> {
  const adminClient = createAdminClient();

  const { data: sections, error: sectionsError } = await adminClient
    .from("sidebar_sections")
    .select("*")
    .order("position");

  if (sectionsError || !sections) {
    throw new Error("Failed to fetch sidebar sections");
  }

  const { data: items, error: itemsError } = await adminClient
    .from("sidebar_items")
    .select("*")
    .order("section_id, position");

  if (itemsError || !items) {
    throw new Error("Failed to fetch sidebar items");
  }

  return sections.map((section) => ({
    id: section.id,
    name: section.name,
    position: section.position,
    collapsed_default: section.collapsed_default,
    group_slugs: section.group_slugs || [],
    items: items
      .filter((item) => item.section_id === section.id)
      .map((item) => ({
        id: item.id,
        label: item.label,
        href: item.href,
        icon: item.icon,
        position: item.position,
        enabled: item.enabled,
        group_slugs: item.group_slugs || [],
        channel_type: item.channel_type || 'threads',
        read_only: item.read_only || false,
        description: item.description || '',
        banner_image: item.banner_image || null,
      })),
  }));
}

/**
 * Admin: Create a new sidebar section
 */
export async function createSidebarSection(data: {
  name: string;
  position: number;
  collapsed_default: boolean;
  group_slugs: string[];
}): Promise<{ success: boolean; error?: string; sectionId?: string }> {
  const { error: authError } = await checkAdmin();
  if (authError) {
    return { success: false, error: authError };
  }

  const adminClient = createAdminClient();

  const { data: section, error } = await adminClient
    .from("sidebar_sections")
    .insert(data)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, sectionId: section.id };
}

/**
 * Admin: Update a sidebar section
 */
export async function updateSidebarSection(
  id: string,
  data: Partial<{
    name: string;
    position: number;
    collapsed_default: boolean;
    group_slugs: string[];
  }>
): Promise<{ success: boolean; error?: string }> {
  const { error: authError } = await checkAdmin();
  if (authError) {
    return { success: false, error: authError };
  }

  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("sidebar_sections")
    .update(data)
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Admin: Delete a sidebar section
 */
export async function deleteSidebarSection(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const { error: authError } = await checkAdmin();
  if (authError) {
    return { success: false, error: authError };
  }

  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("sidebar_sections")
    .delete()
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Admin: Create a new sidebar item
 */
export async function createSidebarItem(data: {
  section_id: string;
  label: string;
  href: string;
  icon?: string;
  position: number;
  enabled: boolean;
  group_slugs: string[];
  channel_type?: string;
  read_only?: boolean;
  description?: string;
  banner_image?: string;
}): Promise<{ success: boolean; error?: string; itemId?: string }> {
  const { error: authError } = await checkAdmin();
  if (authError) {
    return { success: false, error: authError };
  }

  const adminClient = createAdminClient();

  const { data: item, error } = await adminClient
    .from("sidebar_items")
    .insert(data)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Auto-create a document if href is /resources/<slug>
  if (data.href.startsWith("/resources/") && !data.href.includes("/", 11)) {
    const slug = data.href.substring(11); // Remove "/resources/"
    
    if (slug) {
      // Check if document already exists
      const { data: existingDoc } = await adminClient
        .from("documents")
        .select("id")
        .eq("slug", slug)
        .single();

      if (!existingDoc) {
        // Create draft document
        const { data: newDoc } = await adminClient
          .from("documents")
          .insert({
            slug,
            title: data.label,
            body: "",
            is_published: true, // Published so title shows, but body is empty
          })
          .select()
          .single();

        // Link to groups if item has group restrictions
        if (newDoc && data.group_slugs && data.group_slugs.length > 0) {
          const { data: groups } = await adminClient
            .from("access_groups")
            .select("id")
            .in("slug", data.group_slugs);

          if (groups && groups.length > 0) {
            const groupLinks = groups.map((group) => ({
              document_id: newDoc.id,
              group_id: group.id,
            }));

            await adminClient.from("document_groups").insert(groupLinks);
          }
        }
      }
    }
  }

  return { success: true, itemId: item.id };
}

/**
 * Admin: Update a sidebar item
 */
export async function updateSidebarItem(
  id: string,
  data: Partial<{
    label: string;
    href: string;
    icon: string | null;
    position: number;
    enabled: boolean;
    group_slugs: string[];
    channel_type: string;
    read_only: boolean;
    description: string;
    banner_image: string | null;
  }>
): Promise<{ success: boolean; error?: string }> {
  const { error: authError } = await checkAdmin();
  if (authError) {
    return { success: false, error: authError };
  }

  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("sidebar_items")
    .update(data)
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Admin: Delete a sidebar item
 */
export async function deleteSidebarItem(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const { error: authError } = await checkAdmin();
  if (authError) {
    return { success: false, error: authError };
  }

  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("sidebar_items")
    .delete()
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Admin: Reorder sidebar sections
 */
export async function reorderSidebarSections(
  sectionIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const { error: authError } = await checkAdmin();
  if (authError) {
    return { success: false, error: authError };
  }

  const adminClient = createAdminClient();

  // Update each section's position
  const updates = sectionIds.map((id, index) =>
    adminClient.from("sidebar_sections").update({ position: index }).eq("id", id)
  );

  try {
    await Promise.all(updates);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reorder sections",
    };
  }
}

/**
 * Admin: Reorder sidebar items within a section
 */
export async function reorderSidebarItems(
  itemIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const { error: authError } = await checkAdmin();
  if (authError) {
    return { success: false, error: authError };
  }

  const adminClient = createAdminClient();

  // Update each item's position
  const updates = itemIds.map((id, index) =>
    adminClient.from("sidebar_items").update({ position: index }).eq("id", id)
  );

  try {
    await Promise.all(updates);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reorder items",
    };
  }
}

/**
 * Admin: Move an item to a different section and reorder
 */
export async function moveSidebarItem(
  itemId: string,
  newSectionId: string,
  newPosition: number
): Promise<{ success: boolean; error?: string }> {
  const { error: authError } = await checkAdmin();
  if (authError) {
    return { success: false, error: authError };
  }

  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("sidebar_items")
    .update({ section_id: newSectionId, position: newPosition })
    .eq("id", itemId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
