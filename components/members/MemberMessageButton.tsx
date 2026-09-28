"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  getOrCreateClientThread,
  getOrCreateThreadForClient,
} from "@/lib/actions/dm";

interface MemberMessageButtonProps {
  memberId: string;
  memberName: string;
  currentUserRole: "admin" | "coach" | "client";
}

export function MemberMessageButton({
  memberId,
  memberName,
  currentUserRole,
}: MemberMessageButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleMessageClick = async () => {
    setLoading(true);

    try {
      // Clients message the team, team members get/create thread for the client
      if (currentUserRole === "client") {
        // Client messaging a team member - get or create client's own thread
        const result = await getOrCreateClientThread();
        if (result.success && result.threadId) {
          router.push(`/dashboard/messages/${result.threadId}`);
        } else {
          console.error("Failed to create thread:", result.error);
          // Fallback to messages page
          router.push("/dashboard/messages");
        }
      } else {
        // Team member messaging a client - get or create thread for that client
        const result = await getOrCreateThreadForClient(memberId);
        if (result.success && result.threadId) {
          router.push(`/dashboard/messages/${result.threadId}`);
        } else {
          console.error("Failed to create thread:", result.error);
          // Fallback to messages page
          router.push("/dashboard/messages");
        }
      }
    } catch (error) {
      console.error("Error handling message:", error);
      // Fallback to messages page
      router.push("/dashboard/messages");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleMessageClick}
      disabled={loading}
      className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      {loading ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span>Loading...</span>
        </>
      ) : (
        <>
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span>Message {memberName.split(" ")[0]}</span>
        </>
      )}
    </button>
  );
}
