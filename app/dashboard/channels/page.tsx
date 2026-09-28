import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { ChannelsManager } from "@/components/admin/ChannelsManager";

export default async function ChannelsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  await requireAdmin();

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        Channel Management
      </h1>
      <ChannelsManager />
    </div>
  );
}
