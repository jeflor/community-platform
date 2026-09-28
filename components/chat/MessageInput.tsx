"use client";

import { useState, useRef, useEffect } from "react";
import { createMessage } from "@/lib/actions/messages";

interface MessageInputProps {
  channelId: string;
  parentId?: string | null;
  placeholder?: string;
  onSuccess?: () => void;
  mentionableUsers?: Array<{ id: string; email: string; full_name: string | null }>;
}

export function MessageInput({
  channelId,
  parentId = null,
  placeholder = "Type a message...",
  onSuccess,
  mentionableUsers = [],
}: MessageInputProps) {
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [mentionPosition, setMentionPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const result = await createMessage(channelId, body.trim(), parentId);
    setIsSubmitting(false);

    if (result.success) {
      setBody("");
      onSuccess?.();
    } else {
      alert(result.error || "Failed to send message");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setBody(value);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtSign = textBeforeCursor.lastIndexOf("@");

    if (lastAtSign !== -1 && lastAtSign === cursorPos - 1) {
      setShowMentions(true);
      setMentionPosition(lastAtSign);
      setMentionFilter("");
    } else if (lastAtSign !== -1 && showMentions) {
      const filter = textBeforeCursor.substring(lastAtSign + 1);
      if (/^\w*$/.test(filter)) {
        setMentionFilter(filter);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (user: { email: string; full_name: string | null }) => {
    const beforeMention = body.substring(0, mentionPosition);
    const afterMention = body.substring(mentionPosition + mentionFilter.length + 1);
    const username = user.email.split("@")[0];
    setBody(`${beforeMention}@${username} ${afterMention}`);
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  const filteredUsers = mentionableUsers.filter((user) => {
    const username = user.email.split("@")[0];
    const name = user.full_name || user.email;
    return (
      username.toLowerCase().includes(mentionFilter.toLowerCase()) ||
      name.toLowerCase().includes(mentionFilter.toLowerCase())
    );
  });

  return (
    <form onSubmit={handleSubmit} className="relative">
      <textarea
        ref={textareaRef}
        value={body}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isSubmitting}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 resize-none"
        rows={3}
      />

      {showMentions && filteredUsers.length > 0 && (
        <div className="absolute bottom-full mb-2 left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
          {filteredUsers.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => insertMention(user)}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold">
                {user.full_name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-medium text-gray-900">{user.full_name || user.email}</div>
                <div className="text-xs text-gray-500">@{user.email.split("@")[0]}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center mt-2">
        <span className="text-xs text-gray-500">
          Press Enter to send, Shift+Enter for new line
        </span>
        <button
          type="submit"
          disabled={!body.trim() || isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Sending..." : "Send"}
        </button>
      </div>
    </form>
  );
}
