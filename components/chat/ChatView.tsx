"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { getMessages, type Message } from "@/lib/actions/messages";
import { MessageDisplay } from "./MessageDisplay";
import { MessageInput } from "./MessageInput";

interface ChatViewProps {
  channelId: string;
  currentUserId: string;
  isAdmin: boolean;
  mentionableUsers: Array<{ id: string; email: string; full_name: string | null }>;
}

export function ChatView({
  channelId,
  currentUserId,
  isAdmin,
  mentionableUsers,
}: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadMessages = async () => {
    setIsLoading(true);
    const data = await getMessages(channelId, 50);
    setMessages(data);
    setIsLoading(false);
    setTimeout(scrollToBottom, 100);
  };

  useEffect(() => {
    loadMessages();

    const channel = supabase
      .channel(`chat:${channelId}`)
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
            loadMessages();
          } else if (payload.eventType === "UPDATE") {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === payload.new.id
                  ? { ...msg, body: payload.new.body, edited_at: payload.new.edited_at }
                  : msg
              )
            );
          } else if (payload.eventType === "DELETE") {
            setMessages((prev) => prev.filter((msg) => msg.id !== payload.old.id));
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
          loadMessages();
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
            <div className="text-gray-500">Loading messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <p className="text-lg font-medium">No messages yet</p>
              <p className="text-sm mt-1">Be the first to send a message!</p>
            </div>
          </div>
        ) : (
          <div>
            {messages.map((message) => (
              <MessageDisplay
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

      <div className="border-t border-gray-200 p-4 bg-white">
        <MessageInput
          channelId={channelId}
          onSuccess={loadMessages}
          mentionableUsers={mentionableUsers}
        />
      </div>
    </div>
  );
}
