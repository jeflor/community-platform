"use client";

import { useState } from "react";
import { CreateCourseModal } from "./CreateCourseModal";
import { CreateSectionModal } from "./CreateSectionModal";
import { RearrangeCoursesModal } from "./RearrangeCoursesModal";
import Link from "next/link";

interface AdminActionsProps {
  courses: any[];
  sections: string[];
}

export function AdminActions({ courses, sections }: AdminActionsProps) {
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [showCreateSection, setShowCreateSection] = useState(false);
  const [showRearrange, setShowRearrange] = useState(false);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setShowRearrange(true)}
          className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
        >
          Rearrange
        </button>
        <button
          onClick={() => setShowCreateSection(true)}
          className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
        >
          Create Section
        </button>
        <button
          onClick={() => setShowCreateCourse(true)}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Create Course
        </button>
        <Link
          href="/dashboard/courses"
          className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
        >
          Manage
        </Link>
      </div>

      {showCreateCourse && (
        <CreateCourseModal
          sections={sections}
          onClose={() => setShowCreateCourse(false)}
        />
      )}

      {showCreateSection && (
        <CreateSectionModal
          existingSections={sections}
          onClose={() => setShowCreateSection(false)}
        />
      )}

      {showRearrange && (
        <RearrangeCoursesModal
          courses={courses}
          sections={sections}
          onClose={() => setShowRearrange(false)}
        />
      )}
    </>
  );
}
