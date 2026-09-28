"use client";

import { useState } from "react";
import { CourseEditOverlay } from "./CourseEditOverlay";
import { ModuleCreateOverlay } from "./ModuleCreateOverlay";
import { LessonCreateOverlay } from "./LessonCreateOverlay";
import type { CourseWithGroups } from "@/lib/actions/courses";
import Link from "next/link";

interface CourseAdminOverlaysProps {
  course: CourseWithGroups;
  modules: any[];
}

export function CourseAdminOverlays({ course, modules }: CourseAdminOverlaysProps) {
  const [showEditCourse, setShowEditCourse] = useState(false);
  const [showAddModule, setShowAddModule] = useState(false);
  const [activeAddLesson, setActiveAddLesson] = useState<{ moduleId: string; moduleName: string; lessonCount: number } | null>(null);

  return (
    <>
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowEditCourse(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
          >
            ✏️ Edit Course Info
          </button>
          <button
            onClick={() => setShowAddModule(true)}
            className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition"
          >
            ➕ Add Module
          </button>
          <div className="px-3 py-1.5 bg-white text-sm rounded-lg border border-gray-300">
            {course.is_published ? (
              <span className="text-green-700">✅ Published</span>
            ) : (
              <span className="text-gray-600">📝 Draft</span>
            )}
          </div>
          <Link
            href="/dashboard/courses"
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 underline"
          >
            Open full manager
          </Link>
          <span className="text-sm text-gray-600 ml-auto">
            Admin controls (members don&apos;t see this)
          </span>
        </div>

        {/* Per-module add lesson buttons */}
        {modules.length > 0 && (
          <div className="mt-3 pt-3 border-t border-blue-200">
            <p className="text-xs font-medium text-gray-700 mb-2">Add lessons to modules:</p>
            <div className="flex flex-wrap gap-2">
              {modules.map((module: any) => (
                <button
                  key={module.id}
                  onClick={() => setActiveAddLesson({
                    moduleId: module.id,
                    moduleName: module.title,
                    lessonCount: module.lessons.length
                  })}
                  className="px-3 py-1 text-xs bg-white text-gray-700 rounded border border-gray-300 hover:bg-gray-50 transition inline-flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M12 4v16m8-8H4"></path>
                  </svg>
                  {module.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {showEditCourse && (
        <CourseEditOverlay 
          course={course}
          onClose={() => setShowEditCourse(false)}
        />
      )}

      {showAddModule && (
        <ModuleCreateOverlay 
          courseId={course.id}
          moduleCount={modules.length}
          onClose={() => setShowAddModule(false)}
        />
      )}

      {activeAddLesson && (
        <LessonCreateOverlay 
          moduleId={activeAddLesson.moduleId}
          moduleName={activeAddLesson.moduleName}
          lessonCount={activeAddLesson.lessonCount}
          onClose={() => setActiveAddLesson(null)}
        />
      )}
    </>
  );
}
