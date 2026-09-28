import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getDMThreads,
  getOrCreateClientThread,
} from "@/lib/actions/dm";
import { DMInboxList } from "@/components/dm/DMInboxList";

export default async function MessagesPage() {
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

  const isTeamMember = userData.role === "admin" || userData.role === "coach";

  // For clients, get or create their thread and redirect to it
  if (!isTeamMember) {
    const result = await getOrCreateClientThread();
    if (result.success && result.threadId) {
      redirect(`/dashboard/messages/${result.threadId}`);
    }
  }

  // For team members, show inbox list
  const threads = await getDMThreads();

  return (
    <div className="h-[calc(100vh-8rem)] flex">
      <div className="w-full max-w-md">
        <DMInboxList
          threads={threads}
          isTeamMember={isTeamMember}
        />
      </div>
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500 max-w-sm px-6">
          <svg
            className="w-20 h-20 mx-auto mb-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <p className="text-xl font-semibold text-gray-700 mb-2">No conversation selected</p>
          <p className="text-sm text-gray-500">
            Select a conversation from the list to view and send messages
          </p>
        </div>
      </div>
    </div>
  );
}
