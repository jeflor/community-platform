"use client";

import { useState } from "react";
import Link from "next/link";
import {
  createEventComment,
  updateEventComment,
  deleteEventComment,
  toggleEventCommentReaction,
  type EventComment,
} from "@/lib/actions/events";

interface EventCommentsProps {
  eventId: string;
  initialComments: EventComment[];
  currentUserId: string;
  currentUserRole: string;
  canComment: boolean;
}

export function EventComments({
  eventId,
  initialComments,
  currentUserId,
  currentUserRole,
  canComment,
}: EventCommentsProps) {
  const [comments, setComments] = useState<EventComment[]>(initialComments);
  const [newCommentBody, setNewCommentBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600)
      return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const refreshComments = () => {
    // Trigger a page refresh to get updated comments
    window.location.reload();
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentBody.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const result = await createEventComment(eventId, newCommentBody);

    if (result.success) {
      setNewCommentBody("");
      refreshComments();
    } else {
      alert(result.error || "Failed to post comment");
    }
    setIsSubmitting(false);
  };

  const handleEditComment = async (commentId: string) => {
    if (!editingBody.trim()) return;

    const result = await updateEventComment(commentId, editingBody);
    if (result.success) {
      setEditingCommentId(null);
      setEditingBody("");
      refreshComments();
    } else {
      alert(result.error || "Failed to update comment");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    const result = await deleteEventComment(commentId);
    if (result.success) {
      refreshComments();
    } else {
      alert(result.error || "Failed to delete comment");
    }
  };

  const handleToggleReaction = async (commentId: string, emoji: string) => {
    const result = await toggleEventCommentReaction(commentId, emoji);
    if (result.success) {
      refreshComments();
    } else if (result.error) {
      alert(result.error || "Failed to toggle reaction");
    }
  };

  const getEmojiDisplay = (emojiName: string): string => {
    const emojiMap: Record<string, string> = {
      heart: "❤️",
      thumbs_up: "👍",
      laugh: "😂",
      clap: "👏",
    };
    return emojiMap[emojiName] || emojiName;
  };

  const isAdmin = currentUserRole === "admin";

  return (
    <div className="border-t border-gray-200 pt-6 mt-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Discussion ({comments.length})
      </h3>

      {/* Comment Form */}
      {canComment && (
        <form onSubmit={handleAddComment} className="mb-6">
          <textarea
            value={newCommentBody}
            onChange={(e) => setNewCommentBody(e.target.value)}
            placeholder="Add a comment..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={3}
          />
          <div className="mt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !newCommentBody.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition text-sm font-medium"
            >
              {isSubmitting ? "Posting..." : "Post Comment"}
            </button>
          </div>
        </form>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            No comments yet. {canComment && "Be the first to share your thoughts!"}
          </p>
        ) : (
          comments.map((comment) => {
            const isOwnComment = currentUserId === comment.user_id;
            const canDelete = isOwnComment || isAdmin;
            const isEditing = editingCommentId === comment.id;

            return (
              <div key={comment.id} className="flex gap-3">
                {/* Avatar */}
                <Link
                  href={`/dashboard/members/${comment.user.id}`}
                  className="flex-shrink-0"
                >
                  {comment.user.avatar_url ? (
                    <img
                      src={comment.user.avatar_url}
                      alt={comment.user.full_name || "User"}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                      {(comment.user.full_name || comment.user.email)?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                </Link>

                {/* Comment Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Link
                      href={`/dashboard/members/${comment.user.id}`}
                      className="text-sm font-semibold text-gray-900 hover:text-blue-600"
                    >
                      {comment.user.full_name || comment.user.email}
                    </Link>
                    <span className="text-xs text-gray-500">
                      {formatRelativeTime(comment.created_at)}
                    </span>
                    {comment.updated_at !== comment.created_at && (
                      <span className="text-xs text-gray-400 italic">
                        (edited)
                      </span>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        value={editingBody}
                        onChange={(e) => setEditingBody(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditComment(comment.id)}
                          className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingCommentId(null);
                            setEditingBody("");
                          }}
                          className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                        {comment.body}
                      </p>

                      {/* Reaction chips */}
                      {comment.reactions && comment.reactions.some((r) => r.count > 0) && (
                        <div className="flex items-center gap-1 mt-2">
                          {comment.reactions
                            .filter((r) => r.count > 0)
                            .map((reaction) => (
                              <button
                                key={reaction.emoji}
                                onClick={() => handleToggleReaction(comment.id, reaction.emoji)}
                                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition ${
                                  reaction.userReacted
                                    ? "bg-blue-100 text-blue-700 border border-blue-300"
                                    : "bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
                                }`}
                              >
                                <span className="text-xs">{getEmojiDisplay(reaction.emoji)}</span>
                                <span className="text-xs font-medium">
                                  {reaction.count}
                                </span>
                              </button>
                            ))}
                        </div>
                      )}

                      {/* Emoji picker */}
                      <div className="flex items-center gap-1 mt-1.5">
                        {["heart", "thumbs_up", "laugh", "clap"].map((emoji) => {
                          const reaction = comment.reactions?.find(
                            (r) => r.emoji === emoji
                          );
                          return (
                            <button
                              key={emoji}
                              onClick={() => handleToggleReaction(comment.id, emoji)}
                              className={`p-0.5 text-base hover:scale-110 transition ${
                                reaction?.userReacted
                                  ? "opacity-100"
                                  : "opacity-40 hover:opacity-100"
                              }`}
                              title={`React with ${emoji.replace("_", " ")}`}
                            >
                              {getEmojiDisplay(emoji)}
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-3 mt-2">{isOwnComment && (
                          <button
                            onClick={() => {
                              setEditingCommentId(comment.id);
                              setEditingBody(comment.body);
                            }}
                            className="text-xs text-gray-500 hover:text-blue-600"
                          >
                            Edit
                          </button>
                        )}

                        {canDelete && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-xs text-gray-500 hover:text-red-600"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
