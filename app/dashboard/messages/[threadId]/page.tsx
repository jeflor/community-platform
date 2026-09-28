import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDMThreads, getDMThread } from "@/lib/actions/dm";
import { DMInboxList } from "@/components/dm/DMInboxList";
import { DMThreadView } from "@/components/dm/DMThreadView";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Get user role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userData) {
    redirect("/auth/login");
  }

  const isAdmin = userData.role === "admin";
  const isTeamMember = userData.role === "admin" || userData.role === "coach";

  const { threadId } = await params;

  // Get thread details
  const thread = await getDMThread(threadId);

  if (!thread) {
    redirect("/dashboard/messages");
  }

  // Verify access (clients can only access their own thread)
  if (!isTeamMember && thread.client_id !== user.id) {
    redirect("/dashboard/messages");
  }

  // Get all threads for the inbox list
  const threads = await getDMThreads();

  // Determine the display name for the thread
  let otherPartyName: string;
  if (isTeamMember) {
    // Team members see the client's name
    otherPartyName = thread.client?.full_name || thread.client?.email || "Unknown User";
  } else {
    // Clients see "Team" or "The Team"
    otherPartyName = "The Team";
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex">
      {/* Show inbox list only on larger screens or for team members */}
      <div className={`${isTeamMember ? "w-full max-w-md" : "hidden"} md:block md:w-full md:max-w-md`}>
        <DMInboxList
          threads={threads}
          currentThreadId={threadId}
          isTeamMember={isTeamMember}
        />
      </div>
      
      {/* Thread view */}
      <div className="flex-1">
        <DMThreadView
          threadId={threadId}
          currentUserId={user.id}
          isAdmin={isAdmin}
          otherPartyName={otherPartyName}
        />
      </div>
    </div>
  );
}
