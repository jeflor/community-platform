"use client";

import { useState } from "react";
import { updateCourse } from "@/lib/actions/courses";

interface Course {
  id: string;
  title: string;
  section: string;
  position: number;
}

interface RearrangeCoursesModalProps {
  courses: Course[];
  sections: string[];
  onClose: () => void;
}

export function RearrangeCoursesModal({
  courses,
  sections,
  onClose,
}: RearrangeCoursesModalProps) {
  const [coursesBySection, setCoursesBySection] = useState(() => {
    const grouped: Record<string, Course[]> = {};
    sections.forEach((section) => {
      grouped[section] = courses
        .filter((c) => c.section === section)
        .sort((a, b) => a.position - b.position);
    });
    return grouped;
  });
  const [draggedCourse, setDraggedCourse] = useState<Course | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleDragStart = (course: Course) => {
    setDraggedCourse(course);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (section: string, targetIndex: number) => {
    if (!draggedCourse) return;

    setCoursesBySection((prev) => {
      const newState = { ...prev };
      const oldSection = draggedCourse.section;

      // Remove from old position
      newState[oldSection] = newState[oldSection].filter(
        (c) => c.id !== draggedCourse.id
      );

      // Add to new position
      const updatedCourse = { ...draggedCourse, section };
      newState[section] = [...newState[section]];
      newState[section].splice(targetIndex, 0, updatedCourse);

      return newState;
    });

    setDraggedCourse(null);
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const updates = Object.entries(coursesBySection).flatMap(
        ([section, sectionCourses]) =>
          sectionCourses.map((course, index) =>
            updateCourse(course.id, {
              section,
              position: index,
            })
          )
      );

      await Promise.all(updates);
      window.location.reload();
    } catch (error) {
      console.error("Error saving course positions:", error);
      alert("Failed to save changes");
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900">Rearrange Courses</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          Drag and drop courses to reorder them within sections or move them between sections.
        </p>

        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section} className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">{section}</h4>
              <div
                className="space-y-2 min-h-[50px]"
                onDragOver={handleDragOver}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(section, coursesBySection[section].length);
                }}
              >
                {coursesBySection[section].map((course, index) => (
                  <div
                    key={course.id}
                    draggable
                    onDragStart={() => handleDragStart(course)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDrop(section, index);
                    }}
                    className="bg-gray-50 border border-gray-200 rounded p-3 cursor-move hover:bg-gray-100 transition"
                  >
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-5 h-5 text-gray-400"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path d="M4 8h16M4 16h16"></path>
                      </svg>
                      <span className="text-sm font-medium text-gray-900">
                        {course.title}
                      </span>
                    </div>
                  </div>
                ))}
                {coursesBySection[section].length === 0 && (
                  <div className="text-sm text-gray-400 text-center py-4">
                    Drop courses here
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-6 mt-6 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
