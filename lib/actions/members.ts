"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";

export interface MemberProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  headline: string | null;
  location: string | null;
  role: "admin" | "coach" | "client";
  is_active: boolean;
  last_seen: string | null;
  created_at: string;
  updated_at: string;
  group_members: {
    group_id: string;
    access_groups: {
      id: string;
      name: string;
      slug: string;
    };
  }[];
}

/**
 * Get a member's profile by ID.
 * - Signed-in users only
 * - Admins query users table directly (with email)
 * - Non-admins query member_directory view (without email)
 * - Returns null if user is inactive (unless viewer is admin)
 * - Returns null if user doesn't exist
 */
export async function getMemberProfile(
  memberId: string
): Promise<MemberProfile | null> {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile) {
    return null;
  }

  const isAdmin = currentProfile.role === "admin";

  if (isAdmin) {
    // Admins use admin client to see all users including inactive
    const adminClient = createAdminClient();
    
    const { data: member, error } = await adminClient
      .from("users")
      .select(
        `
        *,
        group_members(
          group_id,
          access_groups(id, name, slug)
        )
      `
      )
      .eq("id", memberId)
      .single();

    if (error || !member) {
      return null;
    }

    return member as MemberProfile;
  } else {
    // Non-admins use member_directory view (no email, only active members)
    const supabase = await createClient();
    
    const { data: member, error } = await supabase
      .from("member_directory")
      .select("*")
      .eq("id", memberId)
      .single();

    if (error || !member) {
      return null;
    }

    // Fetch visible group memberships for non-admins (non-system groups only)
    const { data: groupData } = await supabase
      .from("group_members")
      .select(`
        group_id,
        access_groups(id, name, slug)
      `)
      .eq("user_id", memberId);

    // Filter out system groups (everyone, team)
    const visibleGroups = (groupData || []).filter(
      (gm: any) => !["everyone", "team"].includes(gm.access_groups?.slug)
    );

    // Add required fields for compatibility
    return {
      ...member,
      email: '', // No email for non-admins
      updated_at: member.created_at || new Date().toISOString(),
      group_members: visibleGroups
    } as MemberProfile;
  }
}

/**
 * Check if the current user can send a DM to the target member.
 * DMs are client-to-team only (clients can message admins/coaches, and vice versa).
 */
export async function canSendDMToMember(
  targetMemberId: string
): Promise<boolean> {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile || !currentProfile.is_active) {
    return false;
  }

  const supabase = await createClient();

  const { data: targetMember } = await supabase
    .from("users")
    .select("role, is_active")
    .eq("id", targetMemberId)
    .single();

  if (!targetMember || !targetMember.is_active) {
    return false;
  }

  const currentIsTeam = ["admin", "coach"].includes(currentProfile.role);
  const targetIsTeam = ["admin", "coach"].includes(targetMember.role);

  // Client can message team, or team can message client
  return (currentIsTeam && !targetIsTeam) || (!currentIsTeam && targetIsTeam);
}
