"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createLessonComment,
  updateLessonComment,
  deleteLessonComment,
  toggleLessonCommentReaction,
  type LessonComment,
} from "@/lib/actions/lessons";

type LessonCommentsProps = {
  lessonId: string;
  initialComments: LessonComment[];
  currentUserId: string;
  isAdmin: boolean;
};

export default function LessonComments({
  lessonId,
  initialComments,
  currentUserId,
  isAdmin,
}: LessonCommentsProps) {
  const router = useRouter();
  const [comments, setComments] = useState(initialComments);
  const [newCommentBody, setNewCommentBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentBody.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createLessonComment(lessonId, newCommentBody);
      setNewCommentBody("");
      router.refresh();
    } catch (error) {
      console.error("Failed to post comment:", error);
      alert("Failed to post comment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditComment = (comment: LessonComment) => {
    setEditingCommentId(comment.id);
    setEditingBody(comment.body);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingBody("");
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editingBody.trim()) return;

    try {
      await updateLessonComment(commentId, editingBody);
      setEditingCommentId(null);
      setEditingBody("");
      router.refresh();
    } catch (error) {
      console.error("Failed to update comment:", error);
      alert("Failed to update comment. Please try again.");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    try {
      await deleteLessonComment(commentId);
      router.refresh();
    } catch (error) {
      console.error("Failed to delete comment:", error);
      alert("Failed to delete comment. Please try again.");
    }
  };

  const handleToggleCommentReaction = async (commentId: string, emoji: string) => {
    try {
      const result = await toggleLessonCommentReaction(commentId, emoji);
      if (result.success) {
        router.refresh();
      } else if (result.error) {
        console.error("Failed to toggle reaction:", result.error);
      }
    } catch (error) {
      console.error("Failed to toggle reaction:", error);
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

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-xl font-bold text-gray-900 mb-4">Discussion</h3>

      {/* Comment List */}
      {comments.length === 0 ? (
        <p className="text-gray-500 text-sm mb-6">Start the discussion.</p>
      ) : (
        <div className="space-y-4 mb-6">
          {comments.map((comment) => {
            const isOwnComment = comment.user_id === currentUserId;
            const canDelete = isOwnComment || isAdmin;
            const isEditing = editingCommentId === comment.id;

            return (
              <div key={comment.id} className="flex gap-3">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {comment.user?.avatar_url ? (
                    <img
                      src={comment.user.avatar_url}
                      alt={comment.user.profile_name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm">
                        {comment.user?.profile_name.charAt(0).toUpperCase() ||
                          "?"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Comment Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <Link
                      href={`/dashboard/members/${comment.user_id}`}
                      className="font-semibold text-gray-900 hover:text-blue-600 transition"
                    >
                      {comment.user?.profile_name || "Unknown User"}
                    </Link>
                    <span className="text-xs text-gray-500">
                      {formatRelativeTime(comment.created_at)}
                      {comment.updated_at !== comment.created_at && " (edited)"}
                    </span>
                  </div>

                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        value={editingBody}
                        onChange={(e) => setEditingBody(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(comment.id)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-gray-700 text-sm whitespace-pre-wrap break-words">
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
                                onClick={() => handleToggleCommentReaction(comment.id, reaction.emoji)}
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
                              onClick={() => handleToggleCommentReaction(comment.id, emoji)}
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

                      {/* Actions */}
                      {(isOwnComment || canDelete) && (
                        <div className="flex gap-3 mt-2">
                          {isOwnComment && (
                            <button
                              onClick={() => handleEditComment(comment)}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                            >
                              Edit
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-xs text-red-600 hover:text-red-700 font-medium"
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

      {/* New Comment Form */}
      <form onSubmit={handleSubmitComment} className="space-y-3">
        <textarea
          value={newCommentBody}
          onChange={(e) => setNewCommentBody(e.target.value)}
          placeholder="Add to the discussion..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={3}
          disabled={isSubmitting}
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!newCommentBody.trim() || isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
          >
            {isSubmitting ? "Posting..." : "Post Comment"}
          </button>
        </div>
      </form>
    </div>
  );
}
