import Link from "next/link";

interface PulseRightRailProps {
  nextLesson: {
    lessonId: string;
    title: string;
    courseTitle: string;
    courseSlug: string;
  } | null;
}

export function PulseRightRail({ nextLesson }: PulseRightRailProps) {
  return (
    <div className="hidden lg:block w-80 flex-shrink-0 space-y-6">
      {nextLesson && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-3">
            <svg
              className="w-5 h-5 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <h3 className="font-semibold text-gray-900">Next Lesson</h3>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">{nextLesson.courseTitle}</p>
            <p className="font-medium text-gray-900">{nextLesson.title}</p>
            <Link
              href={`/courses/${nextLesson.courseSlug}/lessons/${nextLesson.lessonId}`}
              className="inline-block mt-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
            >
              Continue Learning
            </Link>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-900 mb-2">
          The Official Community
        </h3>
        <p className="text-sm text-gray-700 leading-relaxed">
          A place for members, coaches, and students to learn together.
          Educational only — not investment or legal advice.
        </p>
      </div>
    </div>
  );
}
