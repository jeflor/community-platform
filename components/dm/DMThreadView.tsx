"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { getDMMessages, markDMMessagesAsRead, type DMMessage } from "@/lib/actions/dm";
import { DMMessageDisplay } from "./DMMessageDisplay";
import { DMMessageInput } from "./DMMessageInput";

interface DMThreadViewProps {
  threadId: string;
  currentUserId: string;
  isAdmin: boolean;
  otherPartyName: string;
}

export function DMThreadView({
  threadId,
  currentUserId,
  isAdmin,
  otherPartyName,
}: DMThreadViewProps) {
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadMessages = async () => {
    setIsLoading(true);
    const data = await getDMMessages(threadId, 50);
    setMessages(data);
    setIsLoading(false);
    setTimeout(scrollToBottom, 100);
    
    // Mark messages as read
    await markDMMessagesAsRead(threadId);
  };

  useEffect(() => {
    loadMessages();

    const channel = supabase
      .channel(`dm:${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dm_messages",
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            loadMessages();
          } else if (payload.eventType === "DELETE") {
            setMessages((prev) => prev.filter((msg) => msg.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full">
      <div className="border-b border-gray-200 p-4 bg-white shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          {otherPartyName}
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          {messages.length > 0 ? `${messages.length} message${messages.length === 1 ? "" : "s"}` : "Direct message conversation"}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <div className="text-gray-500 text-sm">Loading messages...</div>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full p-6">
            <div className="text-center text-gray-500 max-w-sm">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-lg font-semibold text-gray-700 mb-1">No messages yet</p>
              <p className="text-sm text-gray-500">
                Send a message below to start the conversation with {otherPartyName}
              </p>
            </div>
          </div>
        ) : (
          <div className="py-4">
            {messages.map((message) => (
              <DMMessageDisplay
                key={message.id}
                message={message}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                onDelete={loadMessages}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <DMMessageInput threadId={threadId} onSuccess={loadMessages} />
    </div>
  );
}
