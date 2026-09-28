"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export interface Document {
  id: string;
  slug: string;
  title: string;
  body: string | null;
  cover_url: string | null;
  video_url: string | null;
  attachments: Array<{ name: string; url: string; type: string }>;
  is_published: boolean;
  locked_message: string | null;
  visibility: "show_locked" | "hide";
  created_by: string | null;
  created_at: string;
  updated_at: string;
  group_ids?: string[];
}

export interface DocumentWithAccess extends Document {
  can_edit: boolean;
  groups?: Array<{ id: string; name: string; slug: string }>;
}

/**
 * Get a document by slug with access information
 */
export async function getDocumentBySlug(
  slug: string
): Promise<DocumentWithAccess | null> {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Get user's role
  const { data: userData } = await adminClient
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = userData?.role === "admin";

  // Get document (admins use admin client to bypass RLS)
  const client = isAdmin ? adminClient : supabase;
  const { data: document, error } = await client
    .from("documents")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !document) {
    return null;
  }

  // Get associated groups
  const { data: documentGroups } = await adminClient
    .from("document_groups")
    .select(
      `
      group_id,
      access_groups (
        id,
        name,
        slug
      )
    `
    )
    .eq("document_id", document.id);

  const groups =
    documentGroups?.map((dg: any) => dg.access_groups).filter(Boolean) || [];

  return {
    ...document,
    attachments: document.attachments || [],
    can_edit: isAdmin,
    groups,
  };
}

/**
 * Get all documents visible to the current user
 */
export async function getVisibleDocuments(): Promise<DocumentWithAccess[]> {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  // Get user's role
  const { data: userData } = await adminClient
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = userData?.role === "admin";

  // Get documents (RLS will filter based on access)
  const client = isAdmin ? adminClient : supabase;
  const { data: documents, error } = await client
    .from("documents")
    .select("*")
    .order("title");

  if (error || !documents) {
    return [];
  }

  return documents.map((doc) => ({
    ...doc,
    attachments: doc.attachments || [],
    can_edit: isAdmin,
  }));
}

/**
 * Create a new document (admin only)
 */
export async function createDocument(data: {
  slug: string;
  title: string;
  body?: string;
  cover_url?: string;
  video_url?: string;
  attachments?: Array<{ name: string; url: string; type: string }>;
  is_published?: boolean;
  locked_message?: string;
  visibility?: "show_locked" | "hide";
  group_ids?: string[];
}): Promise<{ success: boolean; error?: string; document?: Document }> {
  const adminClient = createAdminClient();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Check if user is admin
  const { data: userData } = await adminClient
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userData?.role !== "admin") {
    return { success: false, error: "Not authorized" };
  }

  // Create document
  const { data: document, error: docError } = await adminClient
    .from("documents")
    .insert({
      slug: data.slug,
      title: data.title,
      body: data.body || "",
      cover_url: data.cover_url || null,
      video_url: data.video_url || null,
      attachments: data.attachments || [],
      is_published: data.is_published ?? false,
      locked_message: data.locked_message || null,
      visibility: data.visibility || "show_locked",
      created_by: user.id,
    })
    .select()
    .single();

  if (docError || !document) {
    return { success: false, error: docError?.message || "Failed to create document" };
  }

  // Link groups if provided
  if (data.group_ids && data.group_ids.length > 0) {
    const groupLinks = data.group_ids.map((groupId) => ({
      document_id: document.id,
      group_id: groupId,
    }));

    await adminClient.from("document_groups").insert(groupLinks);
  }

  revalidatePath("/resources");
  revalidatePath(`/resources/${data.slug}`);

  return { success: true, document };
}

/**
 * Update a document (admin only)
 */
export async function updateDocument(
  id: string,
  data: {
    title?: string;
    body?: string;
    cover_url?: string;
    video_url?: string;
    attachments?: Array<{ name: string; url: string; type: string }>;
    is_published?: boolean;
    locked_message?: string;
    visibility?: "show_locked" | "hide";
    group_ids?: string[];
  }
): Promise<{ success: boolean; error?: string }> {
  const adminClient = createAdminClient();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Check if user is admin
  const { data: userData } = await adminClient
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userData?.role !== "admin") {
    return { success: false, error: "Not authorized" };
  }

  // Get document slug for revalidation
  const { data: existingDoc } = await adminClient
    .from("documents")
    .select("slug")
    .eq("id", id)
    .single();

  // Update document
  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.body !== undefined) updateData.body = data.body;
  if (data.cover_url !== undefined) updateData.cover_url = data.cover_url || null;
  if (data.video_url !== undefined) updateData.video_url = data.video_url || null;
  if (data.attachments !== undefined) updateData.attachments = data.attachments;
  if (data.is_published !== undefined) updateData.is_published = data.is_published;
  if (data.locked_message !== undefined) updateData.locked_message = data.locked_message || null;
  if (data.visibility !== undefined) updateData.visibility = data.visibility;

  const { error: updateError } = await adminClient
    .from("documents")
    .update(updateData)
    .eq("id", id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Update groups if provided
  if (data.group_ids !== undefined) {
    // Delete existing groups
    await adminClient.from("document_groups").delete().eq("document_id", id);

    // Insert new groups
    if (data.group_ids.length > 0) {
      const groupLinks = data.group_ids.map((groupId) => ({
        document_id: id,
        group_id: groupId,
      }));

      await adminClient.from("document_groups").insert(groupLinks);
    }
  }

  revalidatePath("/resources");
  if (existingDoc?.slug) {
    revalidatePath(`/resources/${existingDoc.slug}`);
  }

  return { success: true };
}

/**
 * Delete a document (admin only)
 */
export async function deleteDocument(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const adminClient = createAdminClient();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Check if user is admin
  const { data: userData } = await adminClient
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userData?.role !== "admin") {
    return { success: false, error: "Not authorized" };
  }

  const { error } = await adminClient.from("documents").delete().eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/resources");

  return { success: true };
}

/**
 * Get all access groups (for admin UI)
 */
export async function getAccessGroups(): Promise<
  Array<{ id: string; name: string; slug: string }>
> {
  const adminClient = createAdminClient();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  // Check if user is admin
  const { data: userData } = await adminClient
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userData?.role !== "admin") {
    return [];
  }

  const { data: groups } = await adminClient
    .from("access_groups")
    .select("id, name, slug")
    .order("name");

  return groups || [];
}

/**
 * Upload a file to Supabase Storage (admin only)
 * Returns the public URL of the uploaded file
 */
export async function uploadDocumentAsset(
  documentId: string,
  file: File,
  type: "cover" | "attachment"
): Promise<{ success: boolean; url?: string; error?: string }> {
  const adminClient = createAdminClient();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Check if user is admin
  const { data: userData } = await adminClient
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userData?.role !== "admin") {
    return { success: false, error: "Not authorized" };
  }

  // Generate file path: document-assets/{documentId}/{type}/{timestamp}_{filename}
  const timestamp = Date.now();
  const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const filePath = `${documentId}/${type}/${timestamp}_${sanitizedFilename}`;

  // Upload to storage (using admin client for service role)
  const { error: uploadError } = await adminClient.storage
    .from("document-assets")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    return { success: false, error: uploadError.message };
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = adminClient.storage.from("document-assets").getPublicUrl(filePath);

  return { success: true, url: publicUrl };
}

/**
 * Check if a document is read-only based on matching sidebar item
 * Uses admin client to ensure RLS doesn't hide the flag
 */
async function isDocumentReadOnly(documentId: string): Promise<boolean> {
  const adminClient = createAdminClient();

  // Get document slug
  const { data: doc } = await adminClient
    .from("documents")
    .select("slug")
    .eq("id", documentId)
    .single();

  if (!doc?.slug) {
    return false;
  }

  // Look up sidebar item matching this document
  const { data: item } = await adminClient
    .from("sidebar_items")
    .select("read_only")
    .eq("href", `/resources/${doc.slug}`)
    .maybeSingle();

  return item?.read_only === true;
}

/**
 * Comment types
 */
export type DocumentCommentReaction = {
  emoji: string;
  count: number;
  userReacted: boolean;
};

export interface DocumentComment {
  id: string;
  document_id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  reactions?: DocumentCommentReaction[];
}

/**
 * Get comments for a document
 */
export async function getDocumentComments(
  documentId: string
): Promise<DocumentComment[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data: comments } = await supabase
    .from("document_comments")
    .select(
      `
      id,
      document_id,
      user_id,
      body,
      created_at,
      updated_at,
      user:user_id (
        id,
        full_name,
        avatar_url
      )
    `
    )
    .eq("document_id", documentId)
    .order("created_at", { ascending: true });

  if (!comments) return [];

  // Fetch reactions for all comments
  const commentsWithReactions = await Promise.all(
    comments.map(async (comment: any) => {
      const { data: reactions } = await supabase
        .from("document_comment_reactions")
        .select("emoji, user_id")
        .eq("comment_id", comment.id);

      const reactionEmojis = ["heart", "thumbs_up", "laugh", "clap"];
      const aggregatedReactions = reactionEmojis.map((emoji) => {
        const emojiReactions = reactions?.filter((r) => r.emoji === emoji) || [];
        return {
          emoji,
          count: emojiReactions.length,
          userReacted: emojiReactions.some((r) => r.user_id === user.id),
        };
      });

      return {
        id: comment.id,
        document_id: comment.document_id,
        user_id: comment.user_id,
        body: comment.body,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        user: Array.isArray(comment.user) && comment.user.length > 0 
          ? comment.user[0] 
          : comment.user,
        reactions: aggregatedReactions,
      };
    })
  );

  return commentsWithReactions;
}

/**
 * Create a comment on a document
 */
export async function createDocumentComment(
  documentId: string,
  body: string
): Promise<{ success: boolean; error?: string; comment?: DocumentComment }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Check if document is read-only
  const readOnly = await isDocumentReadOnly(documentId);
  if (readOnly) {
    return { success: false, error: "This channel is read-only" };
  }

  if (!body.trim()) {
    return { success: false, error: "Comment cannot be empty" };
  }

  const { data: comment, error } = await supabase
    .from("document_comments")
    .insert({
      document_id: documentId,
      user_id: user.id,
      body: body.trim(),
    })
    .select(
      `
      id,
      document_id,
      user_id,
      body,
      created_at,
      updated_at,
      user:user_id (
        id,
        full_name,
        avatar_url
      )
    `
    )
    .single();

  if (error || !comment) {
    return { success: false, error: error?.message || "Failed to create comment" };
  }

  const mappedComment: DocumentComment = {
    id: comment.id,
    document_id: comment.document_id,
    user_id: comment.user_id,
    body: comment.body,
    created_at: comment.created_at,
    updated_at: comment.updated_at,
    user: Array.isArray((comment as any).user) && (comment as any).user.length > 0 
      ? (comment as any).user[0] 
      : (comment as any).user,
  };

  return { success: true, comment: mappedComment };
}

/**
 * Update a comment
 */
export async function updateDocumentComment(
  commentId: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  if (!body.trim()) {
    return { success: false, error: "Comment cannot be empty" };
  }

  // Get document_id from comment to check read-only status
  const { data: comment } = await supabase
    .from("document_comments")
    .select("document_id")
    .eq("id", commentId)
    .eq("user_id", user.id)
    .single();

  if (!comment) {
    return { success: false, error: "Comment not found" };
  }

  // Check if document is read-only
  const readOnly = await isDocumentReadOnly(comment.document_id);
  if (readOnly) {
    return { success: false, error: "This channel is read-only" };
  }

  const { error } = await supabase
    .from("document_comments")
    .update({ body: body.trim() })
    .eq("id", commentId)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Delete a comment
 */
export async function deleteDocumentComment(
  commentId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Get document_id from comment to check read-only status
  const { data: comment } = await adminClient
    .from("document_comments")
    .select("document_id")
    .eq("id", commentId)
    .single();

  if (!comment) {
    return { success: false, error: "Comment not found" };
  }

  // Check if document is read-only (blocks even admins)
  const readOnly = await isDocumentReadOnly(comment.document_id);
  if (readOnly) {
    return { success: false, error: "This channel is read-only" };
  }

  // Check if user is admin
  const { data: userData } = await adminClient
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = userData?.role === "admin";

  // Use admin client if admin (can delete any), otherwise use user client (RLS enforces ownership)
  const client = isAdmin ? adminClient : supabase;
  const query = client.from("document_comments").delete().eq("id", commentId);

  // Non-admins can only delete their own
  if (!isAdmin) {
    query.eq("user_id", user.id);
  }

  const { error } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Toggle a reaction on a document comment
 */
export async function toggleDocumentCommentReaction(
  commentId: string,
  emoji: string
): Promise<{ success: boolean; action?: string; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Get document_id from comment to check read-only status
  const { data: comment } = await supabase
    .from("document_comments")
    .select("document_id")
    .eq("id", commentId)
    .single();

  if (!comment) {
    return { success: false, error: "Comment not found" };
  }

  // Check if document is read-only (no reactions in read-only channels)
  const readOnly = await isDocumentReadOnly(comment.document_id);
  if (readOnly) {
    return { success: false, error: "This channel is read-only" };
  }

  // Check if reaction already exists
  const { data: existingReaction } = await supabase
    .from("document_comment_reactions")
    .select("id")
    .eq("comment_id", commentId)
    .eq("user_id", user.id)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existingReaction) {
    // Remove reaction
    const { error } = await supabase
      .from("document_comment_reactions")
      .delete()
      .eq("id", existingReaction.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, action: "removed" };
  } else {
    // Add reaction
    const { error } = await supabase
      .from("document_comment_reactions")
      .insert({
        comment_id: commentId,
        user_id: user.id,
        emoji,
      });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, action: "added" };
  }
}
