"use client";

import { DMMessage } from "@/lib/actions/dm";
import { formatDistanceToNow } from "@/lib/utils/date";

interface DMMessageDisplayProps {
  message: DMMessage;
  currentUserId: string;
  isAdmin: boolean;
  onDelete?: () => void;
}

export function DMMessageDisplay({
  message,
  currentUserId,
  isAdmin,
  onDelete,
}: DMMessageDisplayProps) {
  const isOwnMessage = message.user_id === currentUserId;
  const canDelete = isOwnMessage || isAdmin;

  const handleDelete = async () => {
    if (!confirm("Delete this message?")) return;
    
    const { deleteDMMessage } = await import("@/lib/actions/dm");
    const result = await deleteDMMessage(message.id);
    
    if (result.success) {
      onDelete?.();
    } else {
      alert(result.error || "Failed to delete message");
    }
  };

  return (
    <div
      className={`px-4 py-3 hover:bg-white/50 group transition-colors ${
        isOwnMessage ? "bg-white" : ""
      }`}
    >
      <div className="flex items-start gap-3 max-w-4xl">
        <div className="flex-shrink-0">
          {message.users?.avatar_url ? (
            <img
              src={message.users.avatar_url}
              alt={message.users.full_name || message.users.email}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-sm font-semibold text-white">
              {(message.users?.full_name || message.users?.email || "?")[0].toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-semibold text-sm text-gray-900">
              {message.users?.full_name || message.users?.email || "Unknown"}
            </span>
            {message.users?.role && message.users.role !== "member" && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  message.users.role === "admin"
                    ? "bg-purple-100 text-purple-700"
                    : message.users.role === "coach"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {message.users.role}
              </span>
            )}
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(message.created_at)}
            </span>
          </div>
          <div className="mt-1 text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
            {message.body}
          </div>
        </div>
        {canDelete && (
          <button
            onClick={handleDelete}
            className="opacity-0 group-hover:opacity-100 transition text-red-600 hover:text-red-700 text-xs px-2 py-1 rounded hover:bg-red-50"
            title="Delete message"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
