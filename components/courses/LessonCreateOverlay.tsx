"use client";

import { useState } from "react";
import { createLesson } from "@/lib/actions/courses";
import { useRouter } from "next/navigation";
import { SimpleRichTextEditor } from "../documents/SimpleRichTextEditor";

interface LessonCreateOverlayProps {
  moduleId: string;
  moduleName: string;
  lessonCount: number;
  onClose: () => void;
}

export function LessonCreateOverlay({ moduleId, moduleName, lessonCount, onClose }: LessonCreateOverlayProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [lessonForm, setLessonForm] = useState({
    title: "",
    body: "",
    video_url: "",
    attachments: [] as { name: string; url: string; type: string }[],
    position: lessonCount,
    unlock_at: "",
  });

  async function handleLessonSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const lessonData = {
        ...lessonForm,
        unlock_at: lessonForm.unlock_at ? new Date(lessonForm.unlock_at).toISOString() : null,
      };

      await createLesson({
        module_id: moduleId,
        ...lessonData,
      });
      router.refresh();
      onClose();
    } catch (error) {
      console.error("Error saving lesson:", error);
      alert("Failed to save lesson");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900">Add Lesson to {moduleName}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleLessonSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Title
            </label>
            <input
              type="text"
              value={lessonForm.title}
              onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Body (Rich Text)
            </label>
            <SimpleRichTextEditor
              value={lessonForm.body}
              onChange={(value) => setLessonForm({ ...lessonForm, body: value })}
              placeholder="Enter lesson content with HTML formatting..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Video URL (YouTube/Vimeo/Loom)
            </label>
            <input
              type="url"
              value={lessonForm.video_url}
              onChange={(e) => setLessonForm({ ...lessonForm, video_url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Unlock At (Optional)
            </label>
            <input
              type="datetime-local"
              value={lessonForm.unlock_at}
              onChange={(e) => setLessonForm({ ...lessonForm, unlock_at: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
            />
            <p className="text-xs text-gray-500 mt-1">
              When set, lesson will be locked until this date/time. Leave empty for immediate access.
            </p>
            {lessonForm.unlock_at && (
              <button
                type="button"
                onClick={() => setLessonForm({ ...lessonForm, unlock_at: "" })}
                className="text-xs text-blue-600 hover:text-blue-700 mt-1"
              >
                Clear unlock date
              </button>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? "Creating..." : "Create Lesson"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
