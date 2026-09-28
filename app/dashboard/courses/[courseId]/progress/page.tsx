import { requireAdmin } from "@/lib/auth/require-admin";
import { getCourseById, getCourseUserProgress } from "@/lib/actions/courses";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function CourseProgressPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  await requireAdmin();

  const { courseId } = await params;
  const course = await getCourseById(courseId);

  if (!course) {
    notFound();
  }

  const progressData = await getCourseUserProgress(courseId);

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/dashboard/courses"
          className="text-blue-600 hover:text-blue-700 text-sm"
        >
          ← Back to Courses
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          User Progress: {course.title}
        </h1>
        <p className="text-gray-600">
          Track student progress and completion rates for this course.
        </p>
      </div>

      {/* Progress Table */}
      {progressData.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Last Lesson
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Enrolled
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {progressData.map((progress) => (
                  <tr key={progress.user_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {progress.profile_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {progress.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-center gap-2">
                        <div className="text-sm font-semibold text-gray-900">
                          {progress.percent_complete}%
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 max-w-[120px]">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              progress.percent_complete === 100
                                ? "bg-green-600"
                                : "bg-blue-600"
                            }`}
                            style={{ width: `${progress.percent_complete}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-500">
                          {progress.completed_lessons}/{progress.total_lessons} lessons
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {progress.last_lesson_title ? (
                        <div className="text-sm">
                          <div className="text-gray-900 mb-1">
                            {progress.last_lesson_title}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(progress.last_lesson_date).toLocaleDateString()}
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400">
                          No progress yet
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {new Date(progress.enrolled_at).toLocaleDateString()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary Stats */}
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm font-semibold text-gray-700">
                  Total Enrolled
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {progressData.length}
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-700">
                  Completed
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {progressData.filter(p => p.percent_complete === 100).length}
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-700">
                  Average Progress
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {progressData.length > 0
                    ? Math.round(
                        progressData.reduce((sum, p) => sum + p.percent_complete, 0) /
                          progressData.length
                      )
                    : 0}%
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">
            No students enrolled in this course yet.
          </p>
        </div>
      )}
    </div>
  );
}
