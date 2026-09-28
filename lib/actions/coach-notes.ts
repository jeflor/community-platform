"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface CoachNote {
  id: string;
  student_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  author: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

/**
 * Get all coach notes for a student
 */
export async function getCoachNotes(
  studentId: string
): Promise<CoachNote[]> {
  try {
    const supabase = await createClient();

    const { data: notes, error } = await supabase
      .from("coach_notes")
      .select(
        `
        id,
        student_id,
        author_id,
        body,
        created_at,
        updated_at,
        author:users!coach_notes_author_id_fkey(full_name, email, avatar_url)
      `
      )
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching coach notes:", error);
      return [];
    }

    return (notes || []).map((note) => ({
      ...note,
      author: Array.isArray(note.author) ? note.author[0] : note.author,
    })) as CoachNote[];
  } catch (error) {
    console.error("Error fetching coach notes:", error);
    return [];
  }
}

/**
 * Create a new coach note
 */
export async function createCoachNote(
  studentId: string,
  body: string
): Promise<{ success: boolean; error?: string; noteId?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data: note, error } = await supabase
      .from("coach_notes")
      .insert({
        student_id: studentId,
        author_id: user.id,
        body: body.trim(),
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating coach note:", error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/dashboard/coaches/${studentId}`);

    return { success: true, noteId: note.id };
  } catch (error) {
    console.error("Error creating coach note:", error);
    return { success: false, error: "Failed to create note" };
  }
}

/**
 * Update a coach note
 */
export async function updateCoachNote(
  noteId: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("coach_notes")
      .update({
        body: body.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", noteId);

    if (error) {
      console.error("Error updating coach note:", error);
      return { success: false, error: error.message };
    }

    // Revalidate all coach pages since we don't have studentId here
    revalidatePath("/dashboard/coaches/[studentId]", "page");

    return { success: true };
  } catch (error) {
    console.error("Error updating coach note:", error);
    return { success: false, error: "Failed to update note" };
  }
}

/**
 * Delete a coach note
 */
export async function deleteCoachNote(
  noteId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("coach_notes")
      .delete()
      .eq("id", noteId);

    if (error) {
      console.error("Error deleting coach note:", error);
      return { success: false, error: error.message };
    }

    // Revalidate all coach pages since we don't have studentId here
    revalidatePath("/dashboard/coaches/[studentId]", "page");

    return { success: true };
  } catch (error) {
    console.error("Error deleting coach note:", error);
    return { success: false, error: "Failed to delete note" };
  }
}
