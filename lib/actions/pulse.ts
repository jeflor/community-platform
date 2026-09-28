"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createPulsePost(formData: FormData) {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const body = formData.get("body") as string;
  const fileCount = parseInt(formData.get("fileCount") as string) || 0;

  if (!body?.trim() && fileCount === 0) {
    return { error: "Post cannot be empty" };
  }

  // Create the post first
  const { data: postData, error: postError } = await supabase
    .from("pulse_posts")
    .insert({
      user_id: user.id,
      body: body?.trim() || "",
    })
    .select()
    .single();

  if (postError) {
    return { error: postError.message };
  }

  // Upload files and create attachment records
  if (fileCount > 0) {
    const uploadedPaths: string[] = [];
    
    try {
      for (let i = 0; i < fileCount; i++) {
        const file = formData.get(`file_${i}`) as File;
        if (!file) continue;

        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}_${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("pulse-assets")
          .upload(fileName, file, {
            contentType: file.type,
          });

        if (uploadError) throw uploadError;

        uploadedPaths.push(fileName);

        const { error: attachError } = await supabase
          .from("pulse_attachments")
          .insert({
            post_id: postData.id,
            storage_path: fileName,
            content_type: file.type,
          });

        if (attachError) throw attachError;
      }
    } catch (error: any) {
      // Clean up uploaded files on error
      if (uploadedPaths.length > 0) {
        await supabase.storage.from("pulse-assets").remove(uploadedPaths);
      }
      // Delete the post
      await supabase.from("pulse_posts").delete().eq("id", postData.id);
      return { error: error.message || "Failed to upload attachments" };
    }
  }

  revalidatePath("/pulse");
  return { success: true };
}

export async function updatePulsePost(postId: string, body: string) {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (!body.trim()) {
    return { error: "Post body cannot be empty" };
  }

  const { error } = await supabase
    .from("pulse_posts")
    .update({ body: body.trim(), updated_at: new Date().toISOString() })
    .eq("id", postId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/pulse");
  return { success: true };
}

export async function deletePulsePost(postId: string) {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Check if user is admin
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = userData?.role === "admin";

  // Delete if own post or admin
  const query = supabase.from("pulse_posts").delete().eq("id", postId);
  
  if (!isAdmin) {
    query.eq("user_id", user.id);
  }

  const { error } = await query;

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/pulse");
  return { success: true };
}

export async function createPulseComment(postId: string, body: string) {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (!body.trim()) {
    return { error: "Comment body cannot be empty" };
  }

  const { error } = await supabase.from("pulse_comments").insert({
    post_id: postId,
    user_id: user.id,
    body: body.trim(),
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/pulse");
  return { success: true };
}

export async function deletePulseComment(commentId: string) {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Check if user is admin
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = userData?.role === "admin";

  // Delete if own comment or admin
  const query = supabase.from("pulse_comments").delete().eq("id", commentId);
  
  if (!isAdmin) {
    query.eq("user_id", user.id);
  }

  const { error } = await query;

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/pulse");
  return { success: true };
}

export async function deletePulseAttachment(attachmentId: string) {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: attachment } = await supabase
    .from("pulse_attachments")
    .select("storage_path, post_id")
    .eq("id", attachmentId)
    .single();

  if (!attachment) {
    return { error: "Attachment not found" };
  }

  const { error: deleteError } = await supabase
    .from("pulse_attachments")
    .delete()
    .eq("id", attachmentId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  await supabase.storage
    .from("pulse-assets")
    .remove([attachment.storage_path]);

  revalidatePath("/pulse");
  return { success: true };
}

export async function searchMembers(query: string) {
  if (!query.trim() || query.length < 2) {
    return [];
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const searchTerm = `%${query}%`;

  const { data: members } = await supabase
    .from("member_directory")
    .select("id, full_name, avatar_url, headline")
    .or(`full_name.ilike.${searchTerm},headline.ilike.${searchTerm}`)
    .limit(8);

  return members || [];
}

export async function togglePulseReaction(postId: string, emoji: string) {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Check if reaction already exists
  const { data: existingReaction } = await supabase
    .from("pulse_reactions")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existingReaction) {
    // Remove reaction
    const { error } = await supabase
      .from("pulse_reactions")
      .delete()
      .eq("id", existingReaction.id);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/pulse");
    return { success: true, action: "removed" };
  } else {
    // Add reaction
    const { error } = await supabase
      .from("pulse_reactions")
      .insert({
        post_id: postId,
        user_id: user.id,
        emoji,
      });

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/pulse");
    return { success: true, action: "added" };
  }
}

export async function togglePulsePin(postId: string) {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Check if user is admin
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userData?.role !== "admin") {
    return { error: "Only admins can pin posts" };
  }

  // Get current pin status
  const { data: post } = await supabase
    .from("pulse_posts")
    .select("is_pinned")
    .eq("id", postId)
    .single();

  if (!post) {
    return { error: "Post not found" };
  }

  // Toggle pin status
  const { error } = await supabase
    .from("pulse_posts")
    .update({ is_pinned: !post.is_pinned })
    .eq("id", postId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/pulse");
  return { success: true, isPinned: !post.is_pinned };
}

export async function togglePulseCommentReaction(commentId: string, emoji: string) {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Check if reaction already exists
  const { data: existingReaction } = await supabase
    .from("pulse_comment_reactions")
    .select("id")
    .eq("comment_id", commentId)
    .eq("user_id", user.id)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existingReaction) {
    // Remove reaction
    const { error } = await supabase
      .from("pulse_comment_reactions")
      .delete()
      .eq("id", existingReaction.id);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/pulse");
    return { success: true, action: "removed" };
  } else {
    // Add reaction
    const { error } = await supabase
      .from("pulse_comment_reactions")
      .insert({
        comment_id: commentId,
        user_id: user.id,
        emoji,
      });

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/pulse");
    return { success: true, action: "added" };
  }
}
