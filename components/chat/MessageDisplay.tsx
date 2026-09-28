"use client";

import { useState } from "react";
import type { Message } from "@/lib/actions/messages";
import { updateMessage, deleteMessage, addReaction, removeReaction } from "@/lib/actions/messages";

interface MessageDisplayProps {
  message: Message;
  currentUserId: string;
  isAdmin: boolean;
  onDelete?: () => void;
}

const EMOJI_SET = ["👍", "❤️", "😂", "🎉", "🤔", "👀"];

export function MessageDisplay({ message, currentUserId, isAdmin, onDelete }: MessageDisplayProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(message.body);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOwner = message.user_id === currentUserId;
  const canDelete = isOwner || isAdmin;

  const handleEdit = async () => {
    if (editBody.trim() === message.body) {
      setIsEditing(false);
      return;
    }

    setIsSubmitting(true);
    const result = await updateMessage(message.id, editBody.trim());
    setIsSubmitting(false);

    if (result.success) {
      setIsEditing(false);
    } else {
      alert(result.error || "Failed to update message");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this message?")) return;

    const result = await deleteMessage(message.id);
    if (result.success) {
      onDelete?.();
    } else {
      alert(result.error || "Failed to delete message");
    }
  };

  const handleReaction = async (emoji: string) => {
    const existingReaction = message.reactions?.find(
      (r) => r.emoji === emoji && r.user_id === currentUserId
    );

    if (existingReaction) {
      await removeReaction(message.id, emoji);
    } else {
      await addReaction(message.id, emoji);
    }
    setShowEmojiPicker(false);
  };

  const reactionCounts = message.reactions?.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <div className="group py-2 px-4 hover:bg-gray-50">
      <div className="flex gap-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
            {message.users?.full_name?.charAt(0).toUpperCase() || "?"}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-gray-900">
              {message.users?.full_name || "Unknown User"}
            </span>
            <span className="text-xs text-gray-500 capitalize">
              {message.users?.role}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(message.created_at).toLocaleString()}
            </span>
            {message.edited_at && (
              <span className="text-xs text-gray-400 italic">(edited)</span>
            )}
          </div>

          {isEditing ? (
            <div className="mt-1">
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                disabled={isSubmitting}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleEdit}
                  disabled={isSubmitting}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditBody(message.body);
                  }}
                  disabled={isSubmitting}
                  className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-1 text-gray-900 whitespace-pre-wrap break-words">
              {message.body}
            </div>
          )}

          {message.reactions && message.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {Object.entries(reactionCounts).map(([emoji, count]) => {
                const hasReacted = message.reactions?.some(
                  (r) => r.emoji === emoji && r.user_id === currentUserId
                );
                return (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className={`px-2 py-1 text-sm rounded border ${
                      hasReacted
                        ? "bg-blue-100 border-blue-300"
                        : "bg-gray-100 border-gray-300 hover:bg-gray-200"
                    }`}
                  >
                    {emoji} {count}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Add reaction
              </button>
              {showEmojiPicker && (
                <div className="absolute left-0 mt-1 p-2 bg-white border border-gray-300 rounded shadow-lg z-10 flex gap-2">
                  {EMOJI_SET.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(emoji)}
                      className="text-xl hover:scale-125 transition-transform"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {isOwner && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Edit
              </button>
            )}

            {canDelete && (
              <button
                onClick={handleDelete}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
