import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MembersList } from "@/components/admin/MembersList";
import { requireAuth } from "@/lib/auth/require-auth";
import { getPreviewState } from "@/lib/preview/preview-helpers";
import { InviteMemberButton } from "@/components/admin/InviteMemberButton";
import { DownloadCSVButton } from "@/components/admin/DownloadCSVButton";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ 
    search?: string;
    role?: string;
    group?: string;
  }>;
}) {
  const { profile } = await requireAuth();
  
  const supabase = await createClient();
  const params = await searchParams;
  const previewState = await getPreviewState();
  const isAdmin = profile.role === 'admin';
  const showAdminActions = isAdmin && !previewState?.active;

  let users = [];
  let groups = [];

  if (isAdmin) {
    // Admins: use admin client to query users table with full data including email
    const adminClient = createAdminClient();
    let query = adminClient.from("users").select("*, group_members(group_id)");

    if (params.search) {
      query = query.or(
        `email.ilike.%${params.search}%,full_name.ilike.%${params.search}%`
      );
    }

    if (params.role && params.role !== 'all') {
      query = query.eq('role', params.role);
    }

    const { data: allUsers } = await query.order("created_at", { ascending: false });

    users = allUsers || [];

    if (params.group && params.group !== 'all') {
      users = users.filter(user => 
        user.group_members.some((gm: { group_id: string }) => gm.group_id === params.group)
      );
    }

    const { data: groupsData } = await adminClient
      .from("access_groups")
      .select("*")
      .order("name");

    groups = groupsData || [];
  } else {
    // Non-admins: query member_directory view (no email, but includes bio/headline/location)
    let query = supabase.from("member_directory").select("*");

    if (params.search) {
      query = query.or(
        `full_name.ilike.%${params.search}%`
      );
    }

    if (params.role && params.role !== 'all') {
      query = query.eq('role', params.role);
    }

    const { data: directoryUsers } = await query.order("created_at", { ascending: false });

    // Fetch all group memberships (filter system groups on frontend)
    const userIds = (directoryUsers || []).map((u: any) => u.id);
    const { data: allGroupMemberships } = await supabase
      .from("group_members")
      .select("user_id, group_id")
      .in("user_id", userIds);

    // Map group memberships to users
    users = (directoryUsers || []).map((user: any) => ({
      ...user,
      email: '', // No email for non-admins
      group_members: (allGroupMemberships || [])
        .filter((gm: any) => gm.user_id === user.id)
        .map((gm: any) => ({ group_id: gm.group_id }))
    }));
  }

  const nonSystemGroups = groups.filter(g => !g.is_system);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Members</h1>
        {showAdminActions && (
          <div className="flex gap-2">
            <DownloadCSVButton />
            <InviteMemberButton groups={nonSystemGroups} />
          </div>
        )}
      </div>
      <MembersList
        users={users}
        groups={groups}
        searchQuery={params.search || ""}
        roleFilter={params.role || "all"}
        groupFilter={params.group || "all"}
        isAdmin={showAdminActions}
      />
    </div>
  );
}
