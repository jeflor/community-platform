import { createClient } from "@/lib/supabase/server";
import { GroupsList } from "@/components/admin/GroupsList";
import { requireAdmin } from "@/lib/auth/require-admin";

export default async function GroupsPage() {
  await requireAdmin();
  
  const supabase = await createClient();

  const { data: groups } = await supabase
    .from("access_groups")
    .select("*, group_members(count)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Groups</h1>
      <GroupsList groups={groups || []} />
    </div>
  );
}
