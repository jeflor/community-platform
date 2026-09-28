"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type LessonCommentReaction = {
  emoji: string;
  count: number;
  userReacted: boolean;
};

export type LessonComment = {
  id: string;
  lesson_id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    profile_name: string;
    avatar_url: string | null;
  };
  reactions?: LessonCommentReaction[];
};

// Get comments for a lesson
export async function getLessonComments(
  lessonId: string,
  currentUserId?: string
): Promise<LessonComment[]> {
  const supabase = await createClient();

  // Get current user if not provided
  let userId = currentUserId;
  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id;
  }

  const { data: comments, error } = await supabase
    .from("lesson_comments")
    .select(
      `
      id,
      lesson_id,
      user_id,
      body,
      created_at,
      updated_at,
      users:user_id (
        id,
        profile_name,
        avatar_url
      )
    `
    )
    .eq("lesson_id", lessonId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching lesson comments:", error);
    return [];
  }

  // Fetch reactions for all comments
  const commentsWithReactions = await Promise.all(
    (comments || []).map(async (comment: any) => {
      const { data: reactions } = await supabase
        .from("lesson_comment_reactions")
        .select("emoji, user_id")
        .eq("comment_id", comment.id);

      const reactionEmojis = ["heart", "thumbs_up", "laugh", "clap"];
      const aggregatedReactions = reactionEmojis.map((emoji) => {
        const emojiReactions = reactions?.filter((r) => r.emoji === emoji) || [];
        return {
          emoji,
          count: emojiReactions.length,
          userReacted: emojiReactions.some((r) => r.user_id === userId),
        };
      });

      return {
        id: comment.id,
        lesson_id: comment.lesson_id,
        user_id: comment.user_id,
        body: comment.body,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        user: comment.users
          ? {
              id: comment.users.id,
              profile_name: comment.users.profile_name || "Unknown User",
              avatar_url: comment.users.avatar_url || null,
            }
          : undefined,
        reactions: aggregatedReactions,
      };
    })
  );

  return commentsWithReactions;
}

// Create a comment
export async function createLessonComment(lessonId: string, body: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("lesson_comments")
    .insert({
      lesson_id: lessonId,
      user_id: user.id,
      body: body.trim(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating lesson comment:", error);
    throw new Error("Failed to create comment");
  }

  revalidatePath("/courses/[slug]/lessons/[lessonId]");
  return data;
}

// Update a comment
export async function updateLessonComment(commentId: string, body: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { error } = await supabase
    .from("lesson_comments")
    .update({
      body: body.trim(),
    })
    .eq("id", commentId)
    .eq("user_id", user.id); // RLS will also enforce this

  if (error) {
    console.error("Error updating lesson comment:", error);
    throw new Error("Failed to update comment");
  }

  revalidatePath("/courses/[slug]/lessons/[lessonId]");
}

// Delete a comment
export async function deleteLessonComment(commentId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  // RLS policies will handle authorization (own comment or admin)
  const { error } = await supabase
    .from("lesson_comments")
    .delete()
    .eq("id", commentId);

  if (error) {
    console.error("Error deleting lesson comment:", error);
    throw new Error("Failed to delete comment");
  }

  revalidatePath("/courses/[slug]/lessons/[lessonId]");
}

// Toggle a reaction on a lesson comment
export async function toggleLessonCommentReaction(commentId: string, emoji: string) {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Check if reaction already exists
  const { data: existingReaction } = await supabase
    .from("lesson_comment_reactions")
    .select("id")
    .eq("comment_id", commentId)
    .eq("user_id", user.id)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existingReaction) {
    // Remove reaction
    const { error } = await supabase
      .from("lesson_comment_reactions")
      .delete()
      .eq("id", existingReaction.id);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/courses/[slug]/lessons/[lessonId]");
    return { success: true, action: "removed" };
  } else {
    // Add reaction
    const { error } = await supabase
      .from("lesson_comment_reactions")
      .insert({
        comment_id: commentId,
        user_id: user.id,
        emoji,
      });

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/courses/[slug]/lessons/[lessonId]");
    return { success: true, action: "added" };
  }
}
