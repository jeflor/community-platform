"use client";

import { useState } from "react";
import { createSection } from "@/lib/actions/courses";

interface CreateSectionModalProps {
  existingSections: string[];
  onClose: () => void;
}

export function CreateSectionModal({ existingSections, onClose }: CreateSectionModalProps) {
  const [sectionName, setSectionName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sectionName.trim()) {
      alert("Section name is required");
      return;
    }

    if (existingSections.includes(sectionName.trim())) {
      alert("Section already exists");
      return;
    }

    setIsSubmitting(true);

    try {
      await createSection(sectionName.trim());
      window.location.reload();
    } catch (error) {
      console.error("Error creating section:", error);
      alert("Failed to create section");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900">Create Section</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Section Name *
            </label>
            <input
              type="text"
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
              placeholder="e.g., Advanced Training"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
            />
          </div>

          {existingSections.length > 0 && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Existing sections:</p>
              <div className="flex flex-wrap gap-1">
                {existingSections.map((section) => (
                  <span
                    key={section}
                    className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                  >
                    {section}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Section"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
