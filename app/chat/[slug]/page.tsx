import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getChannel, getUsersInChannel } from "@/lib/actions/channels";
import { ChatView } from "@/components/chat/ChatView";
import { ThreadView } from "@/components/chat/ThreadView";

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: userProfile } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (!userProfile) {
    redirect("/auth/login");
  }

  const channel = await getChannel(slug);

  if (!channel) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Channel Not Found</h1>
          <p className="text-gray-600">
            The channel you're looking for doesn't exist or you don't have access to it.
          </p>
        </div>
      </div>
    );
  }

  const mentionableUsers = await getUsersInChannel(channel.id);

  const isAdmin = userProfile.role === "admin";

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-gray-200 px-6 py-4 bg-white">
        <h1 className="text-2xl font-bold text-gray-900">
          {channel.type === "chat" ? "#" : "💬"} {channel.name}
        </h1>
        {channel.description && (
          <p className="text-sm text-gray-600 mt-1">{channel.description}</p>
        )}
      </div>

      {channel.type === "chat" ? (
        <ChatView
          channelId={channel.id}
          currentUserId={userProfile.id}
          isAdmin={isAdmin}
          mentionableUsers={mentionableUsers}
        />
      ) : (
        <ThreadView
          channelId={channel.id}
          currentUserId={userProfile.id}
          isAdmin={isAdmin}
          mentionableUsers={mentionableUsers}
        />
      )}
    </div>
  );
}
