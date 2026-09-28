"use client";

import { useState } from "react";
import { LessonEditOverlay } from "./LessonEditOverlay";
import type { Lesson } from "@/lib/actions/courses";
import Link from "next/link";

interface LessonAdminOverlayProps {
  lesson: Lesson;
}

export function LessonAdminOverlay({ lesson }: LessonAdminOverlayProps) {
  const [showEditLesson, setShowEditLesson] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowEditLesson(true)}
          className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium border border-blue-300 rounded-lg hover:bg-blue-50 transition inline-flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
          </svg>
          Edit Lesson
        </button>
        <Link
          href="/dashboard/courses"
          className="text-xs text-gray-600 hover:text-gray-800 underline"
        >
          Full manager
        </Link>
      </div>

      {showEditLesson && (
        <LessonEditOverlay 
          lesson={lesson}
          onClose={() => setShowEditLesson(false)}
        />
      )}
    </>
  );
}
