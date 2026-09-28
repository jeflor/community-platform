"use client";

import { useState } from "react";
import { createModule } from "@/lib/actions/courses";
import { useRouter } from "next/navigation";

interface ModuleCreateOverlayProps {
  courseId: string;
  moduleCount: number;
  onClose: () => void;
}

export function ModuleCreateOverlay({ courseId, moduleCount, onClose }: ModuleCreateOverlayProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [moduleForm, setModuleForm] = useState({
    title: "",
    description: "",
    position: moduleCount,
  });

  async function handleModuleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      await createModule({
        course_id: courseId,
        ...moduleForm,
      });
      router.refresh();
      onClose();
    } catch (error) {
      console.error("Error saving module:", error);
      alert("Failed to save module");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900">Add Module</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleModuleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Title
            </label>
            <input
              type="text"
              value={moduleForm.title}
              onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Description
            </label>
            <textarea
              value={moduleForm.description}
              onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
            />
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
              {isLoading ? "Creating..." : "Create Module"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
