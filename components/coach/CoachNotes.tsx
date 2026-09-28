"use client";

import { useState } from "react";
import { CoachNote } from "@/lib/actions/coach-notes";
import { createCoachNote, updateCoachNote, deleteCoachNote } from "@/lib/actions/coach-notes";

interface CoachNotesProps {
  studentId: string;
  initialNotes: CoachNote[];
  currentUserId: string;
  isAdmin: boolean;
}

export function CoachNotes({ studentId, initialNotes, currentUserId, isAdmin }: CoachNotesProps) {
  const [notes, setNotes] = useState<CoachNote[]>(initialNotes);
  const [newNoteBody, setNewNoteBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteBody.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const result = await createCoachNote(studentId, newNoteBody);
    
    if (result.success) {
      setNewNoteBody("");
      window.location.reload();
    } else {
      alert(result.error || "Failed to create note");
    }
    setIsSubmitting(false);
  };

  const handleStartEdit = (note: CoachNote) => {
    setEditingNoteId(note.id);
    setEditBody(note.body);
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditBody("");
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!editBody.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const result = await updateCoachNote(noteId, editBody);
    
    if (result.success) {
      setEditingNoteId(null);
      setEditBody("");
      window.location.reload();
    } else {
      alert(result.error || "Failed to update note");
    }
    setIsSubmitting(false);
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;

    setIsSubmitting(true);
    const result = await deleteCoachNote(noteId);
    
    if (result.success) {
      window.location.reload();
    } else {
      alert(result.error || "Failed to delete note");
    }
    setIsSubmitting(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } else if (diffInHours < 168) {
      return date.toLocaleDateString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" });
    } else {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-900">Coach Notes</h2>
        <p className="text-sm text-gray-600 mt-1">Private notes visible only to assigned coaches and admins</p>
      </div>

      <div className="p-6 space-y-6">
        {/* New Note Form */}
        <form onSubmit={handleCreateNote} className="space-y-3">
          <textarea
            value={newNoteBody}
            onChange={(e) => setNewNoteBody(e.target.value)}
            placeholder="Add a private note about this student..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            disabled={isSubmitting}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!newNoteBody.trim() || isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition font-medium"
            >
              {isSubmitting ? "Adding..." : "Add Note"}
            </button>
          </div>
        </form>

        {/* Notes List */}
        <div className="space-y-4">
          {notes.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No notes yet. Add a note to track progress and observations.</p>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {note.author.avatar_url ? (
                      <img
                        src={note.author.avatar_url}
                        alt={note.author.full_name || note.author.email}
                        className="w-8 h-8 rounded-full flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-600 flex-shrink-0">
                        {(note.author.full_name || note.author.email)[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-medium text-gray-900">
                          {note.author.full_name || note.author.email}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(note.created_at)}
                          {note.updated_at !== note.created_at && " (edited)"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions - only show if user is author or admin */}
                  {(note.author_id === currentUserId || isAdmin) && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {note.author_id === currentUserId && editingNoteId !== note.id && (
                        <button
                          onClick={() => handleStartEdit(note)}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                          disabled={isSubmitting}
                        >
                          Edit
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="text-sm text-red-600 hover:text-red-700 font-medium"
                        disabled={isSubmitting}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {/* Note Body - editable or static */}
                {editingNoteId === note.id ? (
                  <div className="space-y-2 ml-11">
                    <textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      disabled={isSubmitting}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateNote(note.id)}
                        disabled={!editBody.trim() || isSubmitting}
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition font-medium"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={isSubmitting}
                        className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 disabled:cursor-not-allowed transition font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="ml-11 text-gray-700 whitespace-pre-wrap break-words">
                    {note.body}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
