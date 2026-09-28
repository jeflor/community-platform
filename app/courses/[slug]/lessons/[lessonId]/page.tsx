import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import {
  getCourseBySlug,
  getLessonById,
  getNextLesson,
  getPreviousLesson,
  markLessonComplete,
  unmarkLessonComplete,
} from "@/lib/actions/courses";
import { getPreviewState } from "@/lib/preview/preview-helpers";
import Link from "next/link";
import LessonPlayer from "@/components/courses/LessonPlayer";
import { LessonAdminOverlay } from "@/components/courses/LessonAdminOverlay";

// Helper function to format duration
function formatDuration(seconds: number | null): string | null {
  if (!seconds) return null;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  } else {
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  }
}

export default async function LessonPlayerPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>;
}) {
  const { slug, lessonId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const course = await getCourseBySlug(slug);
  if (!course || !course.is_enrolled) {
    notFound();
  }

  const lesson = await getLessonById(lessonId);
  if (!lesson) {
    notFound();
  }

  // Verify lesson belongs to this course
  const lessonModule = course.modules.find((m: any) =>
    m.lessons.some((l: any) => l.id === lessonId)
  );
  if (!lessonModule) {
    notFound();
  }

  // Check if lesson is locked
  const isLocked = lesson.is_locked || false;

  const nextLesson = await getNextLesson(course.id, lessonId);
  const previousLesson = await getPreviousLesson(course.id, lessonId);

  // Check if user is admin
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = userData?.role === "admin";
  const previewState = await getPreviewState();
  const showAdminControls = isAdmin && !previewState?.active;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumbs */}
        <div className="px-4 py-4 text-sm text-gray-600">
          <Link href="/courses" className="hover:text-blue-600">
            Video Courses
          </Link>
          <span className="mx-2">/</span>
          <Link href={`/courses/${slug}`} className="hover:text-blue-600">
            {course.title}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{lesson.title}</span>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 px-4 pb-8">
          {/* Main Content */}
          <div className="flex-1">
            {/* Locked State */}
            {isLocked && (
              <div className="mb-6 p-8 bg-gray-50 border-2 border-gray-300 rounded-lg text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-200 rounded-full mb-4">
                  <svg
                    className="w-8 h-8 text-gray-600"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Lesson Locked
                </h2>
                {lesson.unlock_at && new Date(lesson.unlock_at) > new Date() ? (
                  <p className="text-gray-600 mb-4">
                    This lesson will be available on{" "}
                    <strong>
                      {new Date(lesson.unlock_at).toLocaleString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        timeZoneName: "short",
                      })}
                    </strong>
                  </p>
                ) : (
                  <p className="text-gray-600 mb-4">
                    Complete the previous lessons to unlock this one.
                  </p>
                )}
                <Link
                  href={`/courses/${slug}`}
                  className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Back to Course
                </Link>
              </div>
            )}

            {/* Video Player */}
            {!isLocked && lesson.video_url && (
              <div className="mb-6">
                <LessonPlayer
                  lessonId={lesson.id}
                  videoUrl={lesson.video_url}
                  title={lesson.title}
                  initialWatchedSeconds={lesson.watched_seconds || 0}
                />
              </div>
            )}

            {/* Lesson Title */}
            {!isLocked && (
              <div className="mb-6">
                <div className="flex items-start justify-between gap-4">
                  <h1 className="text-3xl font-bold text-gray-900 flex-1">
                    {lesson.title}
                  </h1>
                  {showAdminControls && (
                    <LessonAdminOverlay lesson={lesson} />
                  )}
                </div>
              </div>
            )}


            {/* Lesson Body */}
            {!isLocked && lesson.body && (
              <div className="prose prose-sm max-w-none mb-6 bg-white p-6 rounded-lg shadow-sm border border-gray-200 prose-headings:text-gray-900">
                <div
                  className="text-gray-700"
                  dangerouslySetInnerHTML={{ __html: lesson.body }}
                />
              </div>
            )}

            {/* Mark as Complete Button */}
            {!isLocked && (
              <div className="mb-6 flex justify-center">
                <form
                  action={async () => {
                    "use server";
                    if (lesson.is_completed) {
                      await unmarkLessonComplete(lesson.id);
                    } else {
                      await markLessonComplete(lesson.id);
                    }
                  }}
                >
                  <button
                    type="submit"
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition ${
                      lesson.is_completed
                        ? "bg-green-600 text-white hover:bg-green-700"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    {lesson.is_completed ? (
                      <>
                        Completed
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M5 13l4 4L19 7"></path>
                        </svg>
                      </>
                    ) : (
                      "Mark as Complete"
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* Next Lesson CTA */}
            {!isLocked && nextLesson && (
              <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">
                  Nicely done! Let's keep it up!
                </p>
                <p className="font-semibold text-gray-900 mb-3">
                  {nextLesson.title}
                </p>
                <Link
                  href={`/courses/${slug}/lessons/${nextLesson.id}`}
                  className="inline-block px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition font-medium"
                >
                  Next Lesson →
                </Link>
              </div>
            )}

            {!isLocked && !nextLesson && lesson.is_completed && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                <p className="text-lg font-semibold text-green-800 mb-2">
                  🎉 Course Complete!
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Congratulations on completing all lessons!
                </p>
                <Link
                  href={`/courses/${slug}`}
                  className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  Back to Course
                </Link>
              </div>
            )}
          </div>

          {/* Right Sidebar - All Lessons */}
          <div className="lg:w-80 bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:sticky lg:top-4 h-fit max-h-[calc(100vh-2rem)] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              All Lessons
            </h2>

            <div className="space-y-4">
              {course.modules.map((module: any, moduleIndex: number) => (
                <div key={module.id}>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    {module.title}
                  </h3>
                  <div className="space-y-1">
                    {module.lessons.map((l: any) => {
                      const isCurrent = l.id === lessonId;
                      const lessonIsLocked = l.is_locked || false;
                      const hasWatchProgress = l.watched_seconds > 0 && !l.is_completed;
                      return (
                        <div key={l.id} className="relative">
                          <Link
                            href={`/courses/${slug}/lessons/${l.id}`}
                            className={`flex items-center gap-3 p-2 rounded-lg transition ${
                              isCurrent
                                ? "bg-blue-50 border border-blue-200"
                                : lessonIsLocked
                                ? "opacity-60 cursor-not-allowed"
                                : "hover:bg-gray-50"
                            }`}
                          >
                            {/* Completion/Lock Indicator */}
                            {lessonIsLocked ? (
                              <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                                <svg
                                  className="w-4 h-4 text-gray-400"
                                  fill="none"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                                </svg>
                              </div>
                            ) : (
                              <div
                                className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                  l.is_completed
                                    ? "bg-green-500 border-green-500"
                                    : "border-gray-300"
                                }`}
                              >
                                {l.is_completed && (
                                  <svg
                                    className="w-3 h-3 text-white"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path d="M5 13l4 4L19 7"></path>
                                  </svg>
                                )}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <span
                                  className={`text-sm truncate ${
                                    isCurrent
                                      ? "font-semibold text-blue-900"
                                      : lessonIsLocked
                                      ? "text-gray-500"
                                      : "text-gray-700"
                                  }`}
                                >
                                  {l.title}
                                </span>
                                {hasWatchProgress && (
                                  <span className="text-xs text-blue-600 font-medium flex-shrink-0">
                                    Resume
                                  </span>
                                )}
                              </div>
                              {l.duration_seconds && (
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {formatDuration(l.duration_seconds)}
                                </div>
                              )}
                            </div>
                          </Link>
                          {hasWatchProgress && l.video_url && (
                            <div className="absolute bottom-0 left-10 right-2 h-0.5 bg-gray-200">
                              <div
                                className="h-full bg-blue-600 transition-all"
                                style={{ width: "30%" }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* Mobile: All Lessons Collapsible */}
        <div className="lg:hidden px-4 pb-8">
          <details className="bg-white rounded-lg shadow-sm border border-gray-200">
            <summary className="px-6 py-4 cursor-pointer font-semibold text-gray-900">
              All Lessons
            </summary>
            <div className="px-6 pb-6 space-y-4">
              {course.modules.map((module: any) => (
                <div key={module.id}>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    {module.title}
                  </h3>
                  <div className="space-y-1">
                    {module.lessons.map((l: any) => {
                      const isCurrent = l.id === lessonId;
                      const lessonIsLocked = l.is_locked || false;
                      const hasWatchProgress = l.watched_seconds > 0 && !l.is_completed;
                      return (
                        <div key={l.id} className="relative">
                          <Link
                            href={`/courses/${slug}/lessons/${l.id}`}
                            className={`flex items-center gap-3 p-2 rounded-lg transition ${
                              isCurrent
                                ? "bg-blue-50 border border-blue-200"
                                : lessonIsLocked
                                ? "opacity-60 cursor-not-allowed"
                                : "hover:bg-gray-50"
                            }`}
                          >
                            {/* Completion/Lock Indicator */}
                            {lessonIsLocked ? (
                              <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                                <svg
                                  className="w-4 h-4 text-gray-400"
                                  fill="none"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                                </svg>
                              </div>
                            ) : (
                              <div
                                className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                  l.is_completed
                                    ? "bg-green-500 border-green-500"
                                    : "border-gray-300"
                                }`}
                              >
                                {l.is_completed && (
                                  <svg
                                    className="w-3 h-3 text-white"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path d="M5 13l4 4L19 7"></path>
                                  </svg>
                                )}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <span
                                  className={`text-sm truncate ${
                                    isCurrent
                                      ? "font-semibold text-blue-900"
                                      : lessonIsLocked
                                      ? "text-gray-500"
                                      : "text-gray-700"
                                  }`}
                                >
                                  {l.title}
                                </span>
                                {hasWatchProgress && (
                                  <span className="text-xs text-blue-600 font-medium flex-shrink-0">
                                    Resume
                                  </span>
                                )}
                              </div>
                              {l.duration_seconds && (
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {formatDuration(l.duration_seconds)}
                                </div>
                              )}
                            </div>
                          </Link>
                          {hasWatchProgress && l.video_url && (
                            <div className="absolute bottom-0 left-10 right-2 h-0.5 bg-gray-200">
                              <div
                                className="h-full bg-blue-600 transition-all"
                                style={{ width: "30%" }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
