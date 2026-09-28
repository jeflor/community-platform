"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  createPulsePost,
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
  comments?: PulseComment[];
  reactions?: PulseReaction[];
  attachments?: PulseAttachment[];
}

interface MentionSuggestion {
  id: string;
  full_name: string;
  avatar_url: string | null;
  headline: string | null;
}

export function PulseFeed() {
  const [posts, setPosts] = useState<PulsePost[]>([]);
  const [newPostBody, setNewPostBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [showCommentsForPost, setShowCommentsForPost] = useState<string | null>(
    null
  );
  const [commentBodies, setCommentBodies] = useState<Record<string, string>>(
    {}
  );
  const [mentionSuggestions, setMentionSuggestions] = useState<MentionSuggestion[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionSearching, setMentionSearching] = useState(false);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [mentionInputType, setMentionInputType] = useState<"post" | string | null>(null);
  const [cursorPosition, setCursorPosition] = useState<number>(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const commentInputRefs = useRef<Record<string, HTMLInputElement>>({});
  const mentionDropdownRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  useEffect(() => {
    loadCurrentUser();
    loadPosts();
  }, []);

  const loadCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
      setCurrentUserRole(userData?.role || null);
    }
  };

  const loadPosts = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("pulse_posts")
      .select(`
        id,
        body,
        created_at,
        updated_at,
        user_id,
        is_pinned,
        user:user_id (
          id,
          full_name,
          email,
          role,
          avatar_url
        )
      `)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      const postsWithCommentsAndReactions = await Promise.all(
        data.map(async (post: any) => {
          const { data: comments } = await supabase
            .from("pulse_comments")
            .select(`
              id,
              body,
              created_at,
              user:user_id (
                id,
                full_name,
                email,
                role,
                avatar_url
              )
            `)
            .eq("post_id", post.id)
            .order("created_at", { ascending: true });

          const { data: reactions } = await supabase
            .from("pulse_reactions")
            .select("emoji, user_id")
            .eq("post_id", post.id);

          const { data: attachments } = await supabase
            .from("pulse_attachments")
            .select("id, storage_path, content_type, created_at")
            .eq("post_id", post.id)
            .order("created_at", { ascending: true });

          const reactionEmojis = ["heart", "thumbs_up", "laugh", "clap"];
          const aggregatedReactions = reactionEmojis.map((emoji) => {
            const emojiReactions = reactions?.filter((r) => r.emoji === emoji) || [];
            return {
              emoji,
              count: emojiReactions.length,
              userReacted: emojiReactions.some((r) => r.user_id === currentUserId),
            };
          });

          const commentsWithReactions = await Promise.all(
            (comments || []).map(async (comment: any) => {
              const { data: commentReactions } = await supabase
                .from("pulse_comment_reactions")
                .select("emoji, user_id")
                .eq("comment_id", comment.id);

              const aggregatedCommentReactions = reactionEmojis.map((emoji) => {
                const emojiReactions = commentReactions?.filter((r) => r.emoji === emoji) || [];
                return {
                  emoji,
                  count: emojiReactions.length,
                  userReacted: emojiReactions.some((r) => r.user_id === currentUserId),
                };
              });

              return {
                id: comment.id,
                body: comment.body,
                created_at: comment.created_at,
                user: {
                  id: comment.user.id,
                  full_name: comment.user.full_name || comment.user.email,
                  email: comment.user.email,
                  role: comment.user.role,
                  avatar_url: comment.user.avatar_url,
                },
                reactions: aggregatedCommentReactions,
              };
            })
          );

          return {
            id: post.id,
            body: post.body,
            created_at: post.created_at,
            updated_at: post.updated_at,
            user_id: post.user_id,
            is_pinned: post.is_pinned,
            user: {
              id: post.user.id,
              full_name: post.user.full_name || post.user.email,
              email: post.user.email,
              role: post.user.role,
              avatar_url: post.user.avatar_url,
            },
            comments: commentsWithReactions,
            reactions: aggregatedReactions,
            attachments: attachments || [],
          };
        })
      );
      setPosts(postsWithCommentsAndReactions);
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostBody.trim() && selectedFiles.length === 0) return;

    setIsSubmitting(true);
    setUploadError("");
    
    const formData = new FormData();
    formData.append("body", newPostBody);
    formData.append("fileCount", selectedFiles.length.toString());
    
    selectedFiles.forEach((file, index) => {
      formData.append(`file_${index}`, file);
    });

    const result = await createPulsePost(formData);

    if (result.success) {
      setNewPostBody("");
      setSelectedFiles([]);
      setUploadError("");
      loadPosts();
    } else {
      setUploadError(result.error || "Failed to create post. Please try again.");
    }

    setIsSubmitting(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadError("");
    
    const validFiles: File[] = [];
    let errorMessage = "";
    
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        errorMessage = `${file.name} is not an image file. Only images are supported.`;
        break;
      }
      if (file.size > 10 * 1024 * 1024) {
        errorMessage = `${file.name} is larger than 10MB. Please choose a smaller file.`;
        break;
      }
      validFiles.push(file);
    }

    if (errorMessage) {
      setUploadError(errorMessage);
    } else if (validFiles.length > 0) {
      setSelectedFiles([...selectedFiles, ...validFiles]);
    }
    
    e.target.value = "";
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
    setUploadError("");
  };

  const handleRemoveAttachment = async (attachmentId: string) => {
    if (!confirm("Remove this image?")) return;
    const result = await deletePulseAttachment(attachmentId);
    if (result.success) {
      loadPosts();
    }
  };

  const handleEdit = async (postId: string) => {
    if (!editingBody.trim()) return;
    const result = await updatePulsePost(postId, editingBody);
    if (result.success) {
      setEditingPostId(null);
      setEditingBody("");
      loadPosts();
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    const result = await deletePulsePost(postId);
    if (result.success) {
      loadPosts();
    }
  };

  const handleAddComment = async (postId: string) => {
    const body = commentBodies[postId];
    if (!body?.trim()) return;

    const result = await createPulseComment(postId, body);
    if (result.success) {
      setCommentBodies({ ...commentBodies, [postId]: "" });
      loadPosts();
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    const result = await deletePulseComment(commentId);
    if (result.success) {
      loadPosts();
    }
  };

  const handleToggleReaction = async (postId: string, emoji: string) => {
    const result = await togglePulseReaction(postId, emoji);
    if (result.success) {
      loadPosts();
    }
  };

  const handleToggleCommentReaction = async (commentId: string, emoji: string) => {
    const result = await togglePulseCommentReaction(commentId, emoji);
    if (result.success) {
      loadPosts();
    }
  };

  const handleTogglePin = async (postId: string) => {
    const result = await togglePulsePin(postId);
    if (result.success) {
      loadPosts();
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
        <span key={`mention-${match.index}`} className="font-semibold text-blue-900">
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

  const handleMentionSearch = async (query: string, inputType: "post" | string) => {
    if (query.length < 2) {
      setShowMentions(false);
      setMentionSearching(false);
      return;
    }

    setMentionSearching(true);
    setShowMentions(true);
    setMentionInputType(inputType);
    
    const members = await searchMembers(query);
    setMentionSuggestions(members);
    setMentionQuery(query);
    setSelectedMentionIndex(0);
    setMentionSearching(false);
  };

  const insertMention = (member: MentionSuggestion) => {
    const firstName = member.full_name.split(" ")[0];
    
    if (mentionInputType === "post") {
      const textarea = textareaRef.current;
      if (!textarea) return;
      
      const text = newPostBody;
      const atIndex = text.lastIndexOf("@", cursorPosition);
      const before = text.substring(0, atIndex);
      const after = text.substring(cursorPosition);
      const newText = `${before}@${firstName} ${after}`;
      
      setNewPostBody(newText);
      setShowMentions(false);
      
      setTimeout(() => {
        const newCursorPos = atIndex + firstName.length + 2;
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    } else if (mentionInputType && mentionInputType !== "post") {
      const postId = mentionInputType;
      const input = commentInputRefs.current[postId];
      if (!input) return;
      
      const text = commentBodies[postId] || "";
      const atIndex = text.lastIndexOf("@");
      const before = text.substring(0, atIndex);
      const after = text.substring(input.selectionStart || text.length);
      const newText = `${before}@${firstName} ${after}`;
      
      setCommentBodies({ ...commentBodies, [postId]: newText });
      setShowMentions(false);
      
      setTimeout(() => {
        const newCursorPos = atIndex + firstName.length + 2;
        input.focus();
        input.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };

  const handlePostTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    setNewPostBody(value);
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

  const handleCommentInputChange = (postId: string, value: string, cursorPos: number) => {
    setCommentBodies({ ...commentBodies, [postId]: value });
    
    const textUpToCursor = value.substring(0, cursorPos);
    const atIndex = textUpToCursor.lastIndexOf("@");
    
    if (atIndex !== -1 && atIndex >= textUpToCursor.length - 20) {
      const query = textUpToCursor.substring(atIndex + 1);
      if (!query.includes(" ") && query.length >= 2) {
        handleMentionSearch(query, postId);
      } else if (query.includes(" ") || query.length === 0) {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const handleMentionKeyDown = (e: React.KeyboardEvent) => {
    if (!showMentions || mentionSuggestions.length === 0 || mentionSearching) return;
    
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

  const renderAvatar = (user: { full_name: string; avatar_url: string | null }, size: "sm" | "md" = "md") => {
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
    
    const gradient = size === "sm" 
      ? "bg-gradient-to-br from-green-500 to-teal-500"
      : "bg-gradient-to-br from-blue-500 to-purple-500";
    
    return (
      <div className={`${sizeClasses} ${gradient} text-white rounded-full flex items-center justify-center font-medium flex-shrink-0`}>
        {initials}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Composer Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={newPostBody}
              onChange={handlePostTextareaChange}
              onKeyDown={handleMentionKeyDown}
              placeholder="Share an update, ask a question, or start a discussion..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-900 placeholder:text-gray-500"
              rows={4}
            />
            {showMentions && mentionInputType === "post" && (
              <div
                ref={mentionDropdownRef}
                className="absolute z-10 bg-white border border-gray-300 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto"
                style={{ minWidth: "250px" }}
              >
                {mentionSearching ? (
                  <div className="px-4 py-3 text-sm text-gray-500 text-center">
                    Searching members...
                  </div>
                ) : mentionSuggestions.length > 0 ? (
                  mentionSuggestions.map((member, index) => (
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
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-500 text-center">
                    No members found
                  </div>
                )}
              </div>
            )}
          </div>
          
          {uploadError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-800">{uploadError}</p>
            </div>
          )}
          
          {selectedFiles.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="relative">
                  <img
                    src={URL.createObjectURL(file)}
                    alt="Upload preview"
                    className="h-24 w-24 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <input
                type="file"
                id="pulse-image-upload"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                disabled={isSubmitting}
              />
              <label
                htmlFor="pulse-image-upload"
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Add Images
              </label>
            </div>
            <button
              type="submit"
              disabled={isSubmitting || (!newPostBody.trim() && selectedFiles.length === 0)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {isSubmitting ? "Posting..." : "Post"}
            </button>
          </div>
        </form>
      </div>

      {/* Welcome Card - Only show when there are no posts */}
      {posts.length === 0 && !isLoading && (
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg shadow p-8 text-center">
          <div className="max-w-md mx-auto">
            <div className="text-5xl mb-4">💬</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              Start the Conversation
            </h2>
            <p className="text-gray-600 mb-4">
              This is your community pulse. Share updates, ask questions, celebrate wins, or connect with other members.
            </p>
            <p className="text-sm text-gray-500">
              Your post will be the first one in the feed!
            </p>
          </div>
        </div>
      )}

      {/* Posts Feed */}
      {isLoading ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-500 mt-3">Loading posts...</p>
        </div>
      ) : posts.length > 0 ? (
        <div className="space-y-4">
          {posts.map((post) => {
            const isOwnPost = currentUserId === post.user_id;
            const canDelete = isOwnPost || currentUserRole === "admin";
            const isEditing = editingPostId === post.id;
            const showComments = showCommentsForPost === post.id;

            return (
              <div key={post.id} className="bg-white rounded-lg shadow p-6">
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
                      <Link 
                        href={`/pulse/${post.id}`}
                        className="text-xs text-gray-500 hover:text-blue-600"
                      >
                        {formatRelativeTime(post.created_at)}
                      </Link>
                      {post.updated_at !== post.created_at && (
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-900 placeholder:text-gray-500"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(post.id)}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingPostId(null);
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
                                  onClick={() =>
                                    handleToggleReaction(post.id, reaction.emoji)
                                  }
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
                          <button
                            onClick={() =>
                              setShowCommentsForPost(
                                showComments ? null : post.id
                              )
                            }
                            className="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                              />
                            </svg>
                            {post.comments && post.comments.length > 0
                              ? `${post.comments.length} ${post.comments.length === 1 ? "comment" : "comments"}`
                              : "Comment"}
                          </button>

                          <div className="flex items-center gap-1">
                            {["heart", "thumbs_up", "laugh", "clap"].map(
                              (emoji) => {
                                const reaction = post.reactions?.find(
                                  (r) => r.emoji === emoji
                                );
                                return (
                                  <button
                                    key={emoji}
                                    onClick={() =>
                                      handleToggleReaction(post.id, emoji)
                                    }
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
                              }
                            )}
                          </div>

                          {isOwnPost && (
                            <button
                              onClick={() => {
                                setEditingPostId(post.id);
                                setEditingBody(post.body);
                              }}
                              className="text-sm text-gray-500 hover:text-blue-600"
                            >
                              Edit
                            </button>
                          )}

                          {currentUserRole === "admin" && (
                            <button
                              onClick={() => handleTogglePin(post.id)}
                              className="text-sm text-gray-500 hover:text-blue-600"
                            >
                              {post.is_pinned ? "Unpin" : "Pin"}
                            </button>
                          )}

                          {canDelete && (
                            <button
                              onClick={() => handleDelete(post.id)}
                              className="text-sm text-gray-500 hover:text-red-600"
                            >
                              Delete
                            </button>
                          )}
                        </div>

                        {showComments && (
                          <div className="mt-4 pl-4 border-l-2 border-gray-200 space-y-3">
                            {post.comments &&
                              post.comments.map((comment) => {
                                const isOwnComment =
                                  currentUserId === comment.user.id;
                                const canDeleteComment =
                                  isOwnComment || currentUserRole === "admin";

                                return (
                                  <div
                                    key={comment.id}
                                    className="flex gap-3"
                                  >
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
                                          {formatRelativeTime(
                                            comment.created_at
                                          )}
                                        </span>
                                        {canDeleteComment && (
                                          <button
                                            onClick={() =>
                                              handleDeleteComment(comment.id)
                                            }
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

                            <div className="flex gap-3 pt-2">
                              <div className="w-8 h-8 bg-gray-300 rounded-full flex-shrink-0"></div>
                              <div className="flex-1 relative">
                                <div className="flex gap-2">
                                  <input
                                    ref={(el) => {
                                      if (el) commentInputRefs.current[post.id] = el;
                                    }}
                                    type="text"
                                    value={commentBodies[post.id] || ""}
                                    onChange={(e) =>
                                      handleCommentInputChange(
                                        post.id,
                                        e.target.value,
                                        e.target.selectionStart || 0
                                      )
                                    }
                                    onKeyDown={(e) => {
                                      handleMentionKeyDown(e);
                                      if (e.key === "Enter" && !e.shiftKey && !showMentions) {
                                        e.preventDefault();
                                        handleAddComment(post.id);
                                      }
                                    }}
                                    placeholder="Add a comment..."
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-500"
                                  />
                                  <button
                                    onClick={() => handleAddComment(post.id)}
                                    disabled={!commentBodies[post.id]?.trim()}
                                    className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                  >
                                    Post
                                  </button>
                                </div>
                                {showMentions && mentionInputType === post.id && (
                                  <div
                                    className="absolute z-10 bg-white border border-gray-300 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto"
                                    style={{ minWidth: "250px" }}
                                  >
                                    {mentionSearching ? (
                                      <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                        Searching members...
                                      </div>
                                    ) : mentionSuggestions.length > 0 ? (
                                      mentionSuggestions.map((member, index) => (
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
                                      ))
                                    ) : (
                                      <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                        No members found
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
