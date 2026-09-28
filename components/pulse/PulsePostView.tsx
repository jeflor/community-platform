"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  updatePulsePost,
  deletePulsePost,
  createPulseComment,
  deletePulseComment,
  togglePulseReaction,
  togglePulseCommentReaction,
  togglePulsePin,
  searchMembers,
  deletePulseAttachment,
} from "@/lib/actions/pulse";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface PulseComment {
  id: string;
  body: string;
  created_at: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    role: string;
    avatar_url: string | null;
  };
  reactions: PulseReaction[];
}

interface PulseReaction {
  emoji: string;
  count: number;
  userReacted: boolean;
}

interface PulseAttachment {
  id: string;
  storage_path: string;
  content_type: string;
  created_at: string;
}

interface PulsePost {
  id: string;
  body: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  is_pinned: boolean;
  user: {
    id: string;
    full_name: string;
    email: string;
    role: string;
    avatar_url: string | null;
  };
  comments: PulseComment[];
  reactions: PulseReaction[];
  attachments?: PulseAttachment[];
}

interface MentionSuggestion {
  id: string;
  full_name: string;
  avatar_url: string | null;
  headline: string | null;
}

interface PulsePostViewProps {
  post: PulsePost;
  currentUserId: string;
  currentUserRole: string | null;
}

export function PulsePostView({
  post: initialPost,
  currentUserId,
  currentUserRole,
}: PulsePostViewProps) {
  const router = useRouter();
  const [post, setPost] = useState(initialPost);
  const [editingBody, setEditingBody] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [mentionSuggestions, setMentionSuggestions] = useState<
    MentionSuggestion[]
  >([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [mentionInputType, setMentionInputType] = useState<
    "post" | "comment" | null
  >(null);
  const [cursorPosition, setCursorPosition] = useState<number>(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const mentionDropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const isOwnPost = currentUserId === post.user_id;
  const canDelete = isOwnPost || currentUserRole === "admin";

  const refreshPost = () => {
    router.refresh();
  };

  const handleEdit = async () => {
    if (!editingBody.trim()) return;
    const result = await updatePulsePost(post.id, editingBody);
    if (result.success) {
      setIsEditing(false);
      setEditingBody("");
      refreshPost();
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    const result = await deletePulsePost(post.id);
    if (result.success) {
      router.push("/pulse");
    }
  };

  const handleAddComment = async () => {
    if (!commentBody.trim()) return;
    const result = await createPulseComment(post.id, commentBody);
    if (result.success) {
      setCommentBody("");
      refreshPost();
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    const result = await deletePulseComment(commentId);
    if (result.success) {
      refreshPost();
    }
  };

  const handleToggleReaction = async (emoji: string) => {
    const result = await togglePulseReaction(post.id, emoji);
    if (result.success) {
      refreshPost();
    }
  };

  const handleToggleCommentReaction = async (commentId: string, emoji: string) => {
    const result = await togglePulseCommentReaction(commentId, emoji);
    if (result.success) {
      refreshPost();
    }
  };

  const handleTogglePin = async () => {
    const result = await togglePulsePin(post.id);
    if (result.success) {
      refreshPost();
    }
  };

  const handleRemoveAttachment = async (attachmentId: string) => {
    if (!confirm("Remove this image?")) return;
    const result = await deletePulseAttachment(attachmentId);
    if (result.success) {
      refreshPost();
    }
  };

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

  const renderTextWithMentions = (text: string) => {
    const mentionPattern = /@(\w+)/g;
    const parts: (string | React.ReactElement)[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionPattern.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      parts.push(
        <span
          key={`mention-${match.index}`}
          className="font-semibold text-blue-900"
        >
          {match[0]}
        </span>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
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

  const handleMentionSearch = async (
    query: string,
    inputType: "post" | "comment"
  ) => {
    if (query.length < 2) {
      setShowMentions(false);
      return;
    }

    const members = await searchMembers(query);
    if (members.length > 0) {
      setMentionSuggestions(members);
      setMentionQuery(query);
      setShowMentions(true);
      setMentionInputType(inputType);
      setSelectedMentionIndex(0);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (member: MentionSuggestion) => {
    const firstName = member.full_name.split(" ")[0];

    if (mentionInputType === "post") {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const text = editingBody;
      const atIndex = text.lastIndexOf("@", cursorPosition);
      const before = text.substring(0, atIndex);
      const after = text.substring(cursorPosition);
      const newText = `${before}@${firstName} ${after}`;

      setEditingBody(newText);
      setShowMentions(false);

      setTimeout(() => {
        const newCursorPos = atIndex + firstName.length + 2;
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    } else if (mentionInputType === "comment") {
      const input = commentInputRef.current;
      if (!input) return;

      const text = commentBody;
      const atIndex = text.lastIndexOf("@");
      const before = text.substring(0, atIndex);
      const after = text.substring(input.selectionStart || text.length);
      const newText = `${before}@${firstName} ${after}`;

      setCommentBody(newText);
      setShowMentions(false);

      setTimeout(() => {
        const newCursorPos = atIndex + firstName.length + 2;
        input.focus();
        input.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;

    setEditingBody(value);
    setCursorPosition(cursorPos);

    const textUpToCursor = value.substring(0, cursorPos);
    const atIndex = textUpToCursor.lastIndexOf("@");

    if (atIndex !== -1 && atIndex >= textUpToCursor.length - 20) {
      const query = textUpToCursor.substring(atIndex + 1);
      if (!query.includes(" ") && query.length >= 2) {
        handleMentionSearch(query, "post");
      } else if (query.includes(" ") || query.length === 0) {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const handleCommentInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;

    setCommentBody(value);

    const textUpToCursor = value.substring(0, cursorPos);
    const atIndex = textUpToCursor.lastIndexOf("@");

    if (atIndex !== -1 && atIndex >= textUpToCursor.length - 20) {
      const query = textUpToCursor.substring(atIndex + 1);
      if (!query.includes(" ") && query.length >= 2) {
        handleMentionSearch(query, "comment");
      } else if (query.includes(" ") || query.length === 0) {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const handleMentionKeyDown = (e: React.KeyboardEvent) => {
    if (!showMentions || mentionSuggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedMentionIndex((prev) =>
        prev < mentionSuggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedMentionIndex((prev) =>
        prev > 0 ? prev - 1 : mentionSuggestions.length - 1
      );
    } else if (e.key === "Enter" && showMentions) {
      e.preventDefault();
      insertMention(mentionSuggestions[selectedMentionIndex]);
    } else if (e.key === "Escape") {
      setShowMentions(false);
    }
  };

  const renderAvatar = (
    user: { full_name: string; avatar_url: string | null },
    size: "sm" | "md" = "md"
  ) => {
    const sizeClasses = size === "sm" ? "w-8 h-8 text-xs" : "w-12 h-12 text-sm";
    const initials = user.full_name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    if (user.avatar_url) {
      return (
        <img
          src={user.avatar_url}
          alt={user.full_name}
          className={`${sizeClasses} rounded-full object-cover flex-shrink-0`}
        />
      );
    }

    const gradient =
      size === "sm"
        ? "bg-gradient-to-br from-green-500 to-teal-500"
        : "bg-gradient-to-br from-blue-500 to-purple-500";

    return (
      <div
        className={`${sizeClasses} ${gradient} text-white rounded-full flex items-center justify-center font-medium flex-shrink-0`}
      >
        {initials}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Main Post Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex gap-4">
          <Link href={`/dashboard/members/${post.user.id}`}>
            {renderAvatar(post.user, "md")}
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Link
                href={`/dashboard/members/${post.user.id}`}
                className="font-semibold text-gray-900 hover:text-blue-600"
              >
                {post.user.full_name}
              </Link>
              <span className="text-xs text-gray-500 capitalize">
                {post.user.role}
              </span>
              {post.is_pinned && (
                <>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    📌 Pinned
                  </span>
                </>
              )}
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-500">
                {formatRelativeTime(post.created_at)}
              </span>
              {post.updated_at !== post.created_at && (
                <span className="text-xs text-gray-400 italic">(edited)</span>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    value={editingBody}
                  onChange={handleTextareaChange}
                  onKeyDown={handleMentionKeyDown}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-900 placeholder:text-gray-500"
                  rows={3}
                  />
                  {showMentions &&
                    mentionInputType === "post" &&
                    mentionSuggestions.length > 0 && (
                      <div
                        ref={mentionDropdownRef}
                        className="absolute z-10 bg-white border border-gray-300 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto"
                        style={{ minWidth: "200px" }}
                      >
                        {mentionSuggestions.map((member, index) => (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => insertMention(member)}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 ${
                              index === selectedMentionIndex ? "bg-blue-50" : ""
                            }`}
                          >
                            {renderAvatar(member, "sm")}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {member.full_name}
                              </div>
                              {member.headline && (
                                <div className="text-xs text-gray-500 truncate">
                                  {member.headline}
                                </div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleEdit}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditingBody("");
                    }}
                    className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-gray-700 whitespace-pre-wrap break-words">
                  {renderTextWithMentions(post.body)}
                </p>

                {post.attachments && post.attachments.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {post.attachments.map((attachment) => {
                      const publicUrl = supabase.storage
                        .from("pulse-assets")
                        .getPublicUrl(attachment.storage_path).data.publicUrl;
                      return (
                        <div key={attachment.id} className="relative group">
                          <img
                            src={publicUrl}
                            alt="Attached image"
                            className="max-w-md w-full rounded-lg border border-gray-200"
                          />
                          {(isOwnPost || currentUserRole === "admin") && (
                            <button
                              onClick={() => handleRemoveAttachment(attachment.id)}
                              className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {post.reactions && post.reactions.some((r) => r.count > 0) && (
                  <div className="flex items-center gap-2 mt-3">
                    {post.reactions
                      .filter((r) => r.count > 0)
                      .map((reaction) => (
                        <button
                          key={reaction.emoji}
                          onClick={() => handleToggleReaction(reaction.emoji)}
                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm transition ${
                            reaction.userReacted
                              ? "bg-blue-100 text-blue-700 border border-blue-300"
                              : "bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
                          }`}
                        >
                          <span>{getEmojiDisplay(reaction.emoji)}</span>
                          <span className="text-xs font-medium">
                            {reaction.count}
                          </span>
                        </button>
                      ))}
                  </div>
                )}

                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1">
                    {["heart", "thumbs_up", "laugh", "clap"].map((emoji) => {
                      const reaction = post.reactions?.find(
                        (r) => r.emoji === emoji
                      );
                      return (
                        <button
                          key={emoji}
                          onClick={() => handleToggleReaction(emoji)}
                          className={`p-1 text-lg hover:scale-110 transition ${
                            reaction?.userReacted
                              ? "opacity-100"
                              : "opacity-50 hover:opacity-100"
                          }`}
                          title={`React with ${emoji.replace("_", " ")}`}
                        >
                          {getEmojiDisplay(emoji)}
                        </button>
                      );
                    })}
                  </div>

                  {isOwnPost && (
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setEditingBody(post.body);
                      }}
                      className="text-sm text-gray-500 hover:text-blue-600"
                    >
                      Edit
                    </button>
                  )}

                  {currentUserRole === "admin" && (
                    <button
                      onClick={handleTogglePin}
                      className="text-sm text-gray-500 hover:text-blue-600"
                    >
                      {post.is_pinned ? "Unpin" : "Pin"}
                    </button>
                  )}

                  {canDelete && (
                    <button
                      onClick={handleDelete}
                      className="text-sm text-gray-500 hover:text-red-600"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Comments Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Comments ({post.comments.length})
        </h2>

        <div className="space-y-4">
          {post.comments.map((comment) => {
            const isOwnComment = currentUserId === comment.user.id;
            const canDeleteComment =
              isOwnComment || currentUserRole === "admin";

            return (
              <div key={comment.id} className="flex gap-3">
                <Link href={`/dashboard/members/${comment.user.id}`}>
                  {renderAvatar(comment.user, "sm")}
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link
                      href={`/dashboard/members/${comment.user.id}`}
                      className="text-sm font-semibold text-gray-900 hover:text-blue-600"
                    >
                      {comment.user.full_name}
                    </Link>
                    <span className="text-xs text-gray-500">
                      {formatRelativeTime(comment.created_at)}
                    </span>
                    {canDeleteComment && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-xs text-gray-400 hover:text-red-600"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 break-words">
                    {renderTextWithMentions(comment.body)}
                  </p>

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
                </div>
              </div>
            );
          })}

          {/* Comment Composer */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex-shrink-0"></div>
            <div className="flex-1 relative">
              <div className="flex gap-2">
                <input
                  ref={commentInputRef}
                  type="text"
                  value={commentBody}
                  onChange={handleCommentInputChange}
                  onKeyDown={(e) => {
                    handleMentionKeyDown(e);
                    if (e.key === "Enter" && !e.shiftKey && !showMentions) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                  placeholder="Add a comment..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-500"
                />
                <button
                  onClick={handleAddComment}
                  disabled={!commentBody.trim()}
                  className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Post
                </button>
              </div>
              {showMentions &&
                mentionInputType === "comment" &&
                mentionSuggestions.length > 0 && (
                  <div
                    className="absolute z-10 bg-white border border-gray-300 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto"
                    style={{ minWidth: "200px" }}
                  >
                    {mentionSuggestions.map((member, index) => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => insertMention(member)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 ${
                          index === selectedMentionIndex ? "bg-blue-50" : ""
                        }`}
                      >
                        {renderAvatar(member, "sm")}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {member.full_name}
                          </div>
                          {member.headline && (
                            <div className="text-xs text-gray-500 truncate">
                              {member.headline}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
