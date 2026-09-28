"use client";

import { useState, useEffect } from "react";
import type { DocumentComment } from "@/lib/actions/documents";
import {
  getDocumentComments,
  createDocumentComment,
  updateDocumentComment,
  deleteDocumentComment,
  toggleDocumentCommentReaction,
} from "@/lib/actions/documents";

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  }
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  }
  if (diffInSeconds < 2592000) {
    const weeks = Math.floor(diffInSeconds / 604800);
    return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  }
  if (diffInSeconds < 31536000) {
    const months = Math.floor(diffInSeconds / 2592000);
    return `${months} month${months > 1 ? "s" : ""} ago`;
  }
  const years = Math.floor(diffInSeconds / 31536000);
  return `${years} year${years > 1 ? "s" : ""} ago`;
}

interface DocumentCommentsProps {
  documentId: string;
  isAdmin: boolean;
  currentUserId: string;
  readOnly?: boolean;
}

export function DocumentComments({
  documentId,
  isAdmin,
  currentUserId,
  readOnly = false,
}: DocumentCommentsProps) {
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [documentId]);

  async function loadComments() {
    setLoading(true);
    const fetchedComments = await getDocumentComments(documentId);
    setComments(fetchedComments);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    const result = await createDocumentComment(documentId, newComment);
    
    if (result.success && result.comment) {
      setComments([...comments, result.comment]);
      setNewComment("");
    } else {
      alert(result.error || "Failed to post comment");
    }
    setSubmitting(false);
  }

  async function handleEdit(commentId: string, body: string) {
    if (!body.trim() || submitting) return;

    setSubmitting(true);
    const result = await updateDocumentComment(commentId, body);
    
    if (result.success) {
      setComments(
        comments.map((c) =>
          c.id === commentId ? { ...c, body, updated_at: new Date().toISOString() } : c
        )
      );
      setEditingId(null);
      setEditBody("");
    } else {
      alert(result.error || "Failed to update comment");
    }
    setSubmitting(false);
  }

  async function handleDelete(commentId: string) {
    if (!confirm("Delete this comment?")) return;

    setSubmitting(true);
    const result = await deleteDocumentComment(commentId);
    
    if (result.success) {
      setComments(comments.filter((c) => c.id !== commentId));
    } else {
      alert(result.error || "Failed to delete comment");
    }
    setSubmitting(false);
  }

  function startEdit(comment: DocumentComment) {
    setEditingId(comment.id);
    setEditBody(comment.body);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditBody("");
  }

  async function handleToggleReaction(commentId: string, emoji: string) {
    const result = await toggleDocumentCommentReaction(commentId, emoji);
    if (result.success) {
      loadComments();
    } else if (result.error) {
      alert(result.error || "Failed to toggle reaction");
    }
  }

  function getEmojiDisplay(emojiName: string): string {
    const emojiMap: Record<string, string> = {
      heart: "❤️",
      thumbs_up: "👍",
      laugh: "😂",
      clap: "👏",
    };
    return emojiMap[emojiName] || emojiName;
  }

  if (loading) {
    return (
      <div className="mt-8 border-t border-gray-200 pt-6">
        <p className="text-gray-500">Loading comments...</p>
      </div>
    );
  }

  return (
    <div className="mt-8 border-t border-gray-200 pt-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Discussion</h2>

      {/* Comments list */}
      {comments.length === 0 && !readOnly ? (
        <p className="text-gray-500 text-sm mb-6">Ask a question or leave a note.</p>
      ) : comments.length === 0 && readOnly ? (
        <p className="text-gray-500 text-sm mb-6">No comments yet.</p>
      ) : (
        <div className="space-y-4 mb-6">
          {comments.map((comment) => {
            const isOwner = comment.user_id === currentUserId;
            const canDelete = isOwner || isAdmin;

            return (
              <div key={comment.id} className="flex gap-3">
                {/* Avatar */}
                <a
                  href={`/dashboard/members/${comment.user_id}`}
                  className="flex-shrink-0"
                >
                  {comment.user?.avatar_url ? (
                    <img
                      src={comment.user.avatar_url}
                      alt={comment.user.full_name || "User"}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-sm font-medium">
                      {(comment.user?.full_name?.[0] || "?").toUpperCase()}
                    </div>
                  )}
                </a>

                {/* Comment content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <a
                      href={`/dashboard/members/${comment.user_id}`}
                      className="font-medium text-gray-900 hover:text-blue-600"
                    >
                      {comment.user?.full_name || "Unknown"}
                    </a>
                    <span className="text-sm text-gray-500">
                      {formatRelativeTime(new Date(comment.created_at))}
                    </span>
                  </div>

                  {editingId === comment.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                        rows={3}
                        disabled={submitting}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(comment.id, editBody)}
                          disabled={submitting || !editBody.trim()}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          disabled={submitting}
                          className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-gray-700 whitespace-pre-wrap break-words">
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

                      {(isOwner || canDelete) && (
                        <div className="flex gap-3 mt-2">
                          {isOwner && (
                            <button
                              onClick={() => startEdit(comment)}
                              disabled={submitting}
                              className="text-sm text-gray-500 hover:text-blue-600 disabled:opacity-50"
                            >
                              Edit
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(comment.id)}
                              disabled={submitting}
                              className="text-sm text-gray-500 hover:text-red-600 disabled:opacity-50"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New comment form - hidden if read only */}
      {!readOnly && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
            rows={3}
            disabled={submitting}
          />
          <button
            type="submit"
            disabled={submitting || !newComment.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Posting..." : "Post Comment"}
          </button>
        </form>
      )}

      {/* Read-only notice */}
      {readOnly && (
        <div className="text-sm text-gray-500 italic">
          This channel is read-only. New comments are disabled.
        </div>
      )}
    </div>
  );
}
