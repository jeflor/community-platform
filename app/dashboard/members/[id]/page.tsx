import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth/require-auth";
import { getMemberProfile, canSendDMToMember } from "@/lib/actions/members";
import { getOrCreateThreadForClient } from "@/lib/actions/dm";
import { MemberProfileHeader } from "@/components/members/MemberProfileHeader";
import { MemberMessageButton } from "@/components/members/MemberMessageButton";
import { MemberGroupManagement } from "@/components/members/MemberGroupManagement";
import { createClient } from "@/lib/supabase/server";

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { profile: currentUser } = await requireAuth();
  const { id } = await params;

  const member = await getMemberProfile(id);

  if (!member) {
    notFound();
  }

  const canMessage = await canSendDMToMember(id);
  const isAdmin = currentUser.role === "admin";

  // Fetch all groups for admin group management
  let allGroups: { id: string; name: string; slug: string }[] = [];
  if (isAdmin) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("access_groups")
      .select("id, name, slug")
      .order("name");
    allGroups = data || [];
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow">
        {/* Profile Header */}
        <MemberProfileHeader 
          member={member} 
          isAdmin={isAdmin}
          currentUserId={currentUser.id}
        />

        {/* Admin Group Management */}
        {isAdmin && (
          <div className="px-6 pb-6 border-t border-gray-200 pt-6">
            <MemberGroupManagement
              userId={id}
              memberGroups={member.group_members}
              availableGroups={allGroups}
            />
          </div>
        )}

        {/* Message Button */}
        {canMessage && id !== currentUser.id && (
          <div className="px-6 pb-6">
            <MemberMessageButton
              memberId={id}
              memberName={member.full_name || member.email}
              currentUserRole={currentUser.role}
            />
          </div>
        )}
      </div>
    </div>
  );
}
