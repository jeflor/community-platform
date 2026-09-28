"use client";

import { useState, useEffect } from "react";
import { createCourse } from "@/lib/actions/courses";

interface CreateCourseModalProps {
  sections: string[];
  onClose: () => void;
}

export function CreateCourseModal({ sections, onClose }: CreateCourseModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    section: sections[0] || "Video Training Courses",
    description: "",
    banner_url: "",
    banner_mode: "text" as "image" | "text",
    locked_message: "",
    is_published: false,
    group_ids: [] as string[],
  });

  useEffect(() => {
    fetch("/api/groups")
      .then((res) => res.json())
      .then((data) => setGroups(data.groups || []))
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await createCourse(formData);
      window.location.reload();
    } catch (error) {
      console.error("Error creating course:", error);
      alert("Failed to create course");
      setIsSubmitting(false);
    }
  };

  const toggleGroup = (groupId: string) => {
    setFormData((prev) => ({
      ...prev,
      group_ids: prev.group_ids.includes(groupId)
        ? prev.group_ids.filter((id) => id !== groupId)
        : [...prev.group_ids, groupId],
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900">Create Course</h3>
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
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Slug *
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              required
              placeholder="my-course-slug"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Section *
            </label>
            <select
              value={formData.section}
              onChange={(e) => setFormData({ ...formData, section: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
            >
              {sections.map((section) => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Banner URL
            </label>
            <input
              type="url"
              value={formData.banner_url}
              onChange={(e) => setFormData({ ...formData, banner_url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Banner Mode
            </label>
            <select
              value={formData.banner_mode}
              onChange={(e) => setFormData({ ...formData, banner_mode: e.target.value as "image" | "text" })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
            >
              <option value="text">Title Text (gradient background, no image)</option>
              <option value="image">Image Only (show banner_url, no title overlay)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Choose "Image Only" if your banner image already contains the course title
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Locked Message
            </label>
            <textarea
              value={formData.locked_message}
              onChange={(e) => setFormData({ ...formData, locked_message: e.target.value })}
              rows={2}
              placeholder="This course is available to premium members"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Groups
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
              {groups.map((group) => (
                <label key={group.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.group_ids.includes(group.id)}
                    onChange={() => toggleGroup(group.id)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-900">{group.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_published}
                onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-900">Published</span>
            </label>
          </div>

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
              {isSubmitting ? "Creating..." : "Create Course"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
