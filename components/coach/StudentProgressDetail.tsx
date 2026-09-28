"use client";

import { DetailedCourseProgress } from "@/lib/actions/coach";
import { formatDate } from "@/lib/utils/date";

interface StudentProgressDetailProps {
  studentName: string;
  studentEmail: string;
  courseProgress: DetailedCourseProgress[];
}

export function StudentProgressDetail({
  studentName,
  studentEmail,
  courseProgress,
}: StudentProgressDetailProps) {
  if (courseProgress.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8">
        <div className="text-center text-gray-500">
          <p className="text-lg font-medium">Not enrolled in any courses</p>
          <p className="text-sm mt-1">
            This student has not been enrolled in any courses yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {courseProgress.map((course) => {
        const totalLessons = course.modules.reduce(
          (sum, module) => sum + module.lessons.length,
          0
        );
        const completedLessons = course.modules.reduce(
          (sum, module) =>
            sum + module.lessons.filter((l) => l.is_completed).length,
          0
        );
        const percentComplete =
          totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

        return (
          <div key={course.course_id} className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {course.course_title}
              </h3>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>
                  {completedLessons}/{totalLessons} lessons completed
                </span>
                <span className="font-medium text-blue-600">
                  {percentComplete}%
                </span>
              </div>
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${percentComplete}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {course.modules.map((module) => {
                const moduleCompletedCount = module.lessons.filter(
                  (l) => l.is_completed
                ).length;

                return (
                  <div key={module.module_id} className="p-6">
                    <h4 className="font-semibold text-gray-900 mb-3">
                      {module.module_title}
                      <span className="ml-2 text-sm font-normal text-gray-600">
                        ({moduleCompletedCount}/{module.lessons.length})
                      </span>
                    </h4>
                    <ul className="space-y-2">
                      {module.lessons.map((lesson) => (
                        <li
                          key={lesson.lesson_id}
                          className="flex items-start gap-3"
                        >
                          <div className="flex-shrink-0 mt-1">
                            {lesson.is_completed ? (
                              <svg
                                className="w-5 h-5 text-green-600"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            ) : (
                              <svg
                                className="w-5 h-5 text-gray-400"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1">
                            <span
                              className={`text-sm ${
                                lesson.is_completed
                                  ? "text-gray-900 font-medium"
                                  : "text-gray-600"
                              }`}
                            >
                              {lesson.lesson_title}
                            </span>
                            {lesson.completed_at && (
                              <span className="ml-2 text-xs text-gray-500">
                                Completed {formatDate(lesson.completed_at)}
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
