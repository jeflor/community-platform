"use client";

import { useState, useEffect } from "react";
import { updateCourse, type CourseWithGroups } from "@/lib/actions/courses";
import { useRouter } from "next/navigation";

interface CourseEditOverlayProps {
  course: CourseWithGroups;
  onClose: () => void;
}

export function CourseEditOverlay({ course, onClose }: CourseEditOverlayProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [courseForm, setCourseForm] = useState({
    title: course.title,
    slug: course.slug,
    description: course.description || "",
    banner_url: course.banner_url || "",
    banner_mode: course.banner_mode || "text",
    is_published: course.is_published,
    locked_message: course.locked_message || "",
    visibility: course.visibility,
    position: course.position,
    section: course.section || "Video Training Courses",
    sequential: course.sequential || false,
    group_ids: course.groups.map((g) => g.id),
  });

  useEffect(() => {
    fetch("/api/groups")
      .then((res) => res.json())
      .then((data) => setGroups(data.groups || []))
      .catch(console.error);
  }, []);

  async function handleCourseSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      await updateCourse(course.id, courseForm);
      router.refresh();
      onClose();
    } catch (error) {
      console.error("Error saving course:", error);
      alert("Failed to save course");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900">Edit Course Info</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleCourseSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Title
            </label>
            <input
              type="text"
              value={courseForm.title}
              onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Slug
            </label>
            <input
              type="text"
              value={courseForm.slug}
              onChange={(e) => setCourseForm({ ...courseForm, slug: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Description
            </label>
            <textarea
              value={courseForm.description}
              onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
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
              value={courseForm.banner_url}
              onChange={(e) => setCourseForm({ ...courseForm, banner_url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
            />
            <p className="text-xs text-gray-500 mt-1">
              Recommended: 16:9 aspect ratio (e.g., 1280x720)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Banner Mode
            </label>
            <select
              value={courseForm.banner_mode}
              onChange={(e) => setCourseForm({ ...courseForm, banner_mode: e.target.value as "image" | "text" })}
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
              Section
            </label>
            <input
              type="text"
              value={courseForm.section}
              onChange={(e) => setCourseForm({ ...courseForm, section: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              placeholder="Video Training Courses"
            />
            <p className="text-xs text-gray-500 mt-1">
              Group courses into sections in the catalog
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Locked Message
            </label>
            <textarea
              value={courseForm.locked_message}
              onChange={(e) => setCourseForm({ ...courseForm, locked_message: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Visibility
            </label>
            <select
              value={courseForm.visibility}
              onChange={(e) => setCourseForm({ ...courseForm, visibility: e.target.value as "show_locked" | "hide" })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
            >
              <option value="show_locked">Show as Locked</option>
              <option value="hide">Hide</option>
            </select>
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
                    checked={courseForm.group_ids.includes(group.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setCourseForm({
                          ...courseForm,
                          group_ids: [...courseForm.group_ids, group.id],
                        });
                      } else {
                        setCourseForm({
                          ...courseForm,
                          group_ids: courseForm.group_ids.filter((id) => id !== group.id),
                        });
                      }
                    }}
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
                checked={courseForm.is_published}
                onChange={(e) => setCourseForm({ ...courseForm, is_published: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-900">Published</span>
            </label>
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={courseForm.sequential}
                onChange={(e) => setCourseForm({ ...courseForm, sequential: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-900">Sequential (lock lessons until prior lessons are completed)</span>
            </label>
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
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
