"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getMessages, getReplies, type Message } from "@/lib/actions/messages";
import { MessageDisplay } from "./MessageDisplay";
import { MessageInput } from "./MessageInput";

interface ThreadViewProps {
  channelId: string;
  currentUserId: string;
  isAdmin: boolean;
  mentionableUsers: Array<{ id: string; email: string; full_name: string | null }>;
}

export function ThreadView({
  channelId,
  currentUserId,
  isAdmin,
  mentionableUsers,
}: ThreadViewProps) {
  const [threads, setThreads] = useState<Message[]>([]);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [threadReplies, setThreadReplies] = useState<Record<string, Message[]>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  const loadThreads = async () => {
    setIsLoading(true);
    const data = await getMessages(channelId, 50);
    setThreads(data);
    setIsLoading(false);
  };

  const loadReplies = async (threadId: string) => {
    const replies = await getReplies(threadId);
    setThreadReplies((prev) => ({ ...prev, [threadId]: replies }));
  };

  const toggleThread = async (threadId: string) => {
    const newExpanded = new Set(expandedThreads);
    if (newExpanded.has(threadId)) {
      newExpanded.delete(threadId);
    } else {
      newExpanded.add(threadId);
      if (!threadReplies[threadId]) {
        await loadReplies(threadId);
      }
    }
    setExpandedThreads(newExpanded);
  };

  useEffect(() => {
    loadThreads();

    const channel = supabase
      .channel(`thread:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            if (!payload.new.parent_id) {
              loadThreads();
            } else {
              const parentId = payload.new.parent_id;
              if (expandedThreads.has(parentId)) {
                loadReplies(parentId);
              }
            }
          } else if (payload.eventType === "UPDATE") {
            if (!payload.new.parent_id) {
              setThreads((prev) =>
                prev.map((msg) =>
                  msg.id === payload.new.id
                    ? { ...msg, body: payload.new.body, edited_at: payload.new.edited_at }
                    : msg
                )
              );
            } else {
              const parentId = payload.new.parent_id;
              if (threadReplies[parentId]) {
                setThreadReplies((prev) => ({
                  ...prev,
                  [parentId]: prev[parentId].map((msg) =>
                    msg.id === payload.new.id
                      ? { ...msg, body: payload.new.body, edited_at: payload.new.edited_at }
                      : msg
                  ),
                }));
              }
            }
          } else if (payload.eventType === "DELETE") {
            setThreads((prev) => prev.filter((msg) => msg.id !== payload.old.id));
            Object.keys(threadReplies).forEach((parentId) => {
              setThreadReplies((prev) => ({
                ...prev,
                [parentId]: prev[parentId].filter((msg) => msg.id !== payload.old.id),
              }));
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reactions",
        },
        () => {
          loadThreads();
          expandedThreads.forEach((threadId) => {
            loadReplies(threadId);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading threads...</div>
          </div>
        ) : threads.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <p className="text-lg font-medium">No threads yet</p>
              <p className="text-sm mt-1">Start a new discussion below!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {threads.map((thread) => {
              const isExpanded = expandedThreads.has(thread.id);
              const replies = threadReplies[thread.id] || [];
              const replyCount = replies.length;

              return (
                <div key={thread.id} className="border border-gray-200 rounded-lg bg-white">
                  <MessageDisplay
                    message={thread}
                    currentUserId={currentUserId}
                    isAdmin={isAdmin}
                    onDelete={loadThreads}
                  />

                  <div className="px-4 pb-2">
                    <button
                      onClick={() => toggleThread(thread.id)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {isExpanded
                        ? "Hide replies"
                        : replyCount > 0
                        ? `Show ${replyCount} ${replyCount === 1 ? "reply" : "replies"}`
                        : "Reply"}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-gray-50">
                      <div className="pl-12">
                        {replies.map((reply) => (
                          <MessageDisplay
                            key={reply.id}
                            message={reply}
                            currentUserId={currentUserId}
                            isAdmin={isAdmin}
                            onDelete={() => loadReplies(thread.id)}
                          />
                        ))}
                      </div>

                      {replyingTo === thread.id ? (
                        <div className="p-4">
                          <MessageInput
                            channelId={channelId}
                            parentId={thread.id}
                            placeholder="Write a reply..."
                            onSuccess={() => {
                              loadReplies(thread.id);
                              setReplyingTo(null);
                            }}
                            mentionableUsers={mentionableUsers}
                          />
                          <button
                            onClick={() => setReplyingTo(null)}
                            className="mt-2 text-sm text-gray-600 hover:text-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="p-4">
                          <button
                            onClick={() => setReplyingTo(thread.id)}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Add a reply
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 p-4 bg-white">
        <MessageInput
          channelId={channelId}
          onSuccess={loadThreads}
          mentionableUsers={mentionableUsers}
          placeholder="Start a new thread..."
        />
      </div>
    </div>
  );
}
