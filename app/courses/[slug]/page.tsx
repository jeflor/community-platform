import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getCourseBySlug, markLessonComplete, unmarkLessonComplete, getCourseById } from "@/lib/actions/courses";
import { getLockedSettings, getActiveProductInfo } from "@/lib/settings/get-locked-settings";
import { getPreviewState } from "@/lib/preview/preview-helpers";
import { LockedContent } from "@/components/LockedContent";
import { EnrollButton } from "@/components/courses/EnrollButton";
import { CourseAdminOverlays } from "@/components/courses/CourseAdminOverlays";
import Link from "next/link";

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

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  const previewState = await getPreviewState();
  const showAdminControls = isAdmin && !previewState?.active;

  const course = await getCourseBySlug(slug);

  if (!course) {
    notFound();
  }

  // Fetch full course data with groups for admin editing
  let courseWithGroups = null;
  if (showAdminControls) {
    courseWithGroups = await getCourseById(course.id);
  }

  if (!course.is_enrolled) {
    // If visibility is show_locked, show the paywall
    if (course.visibility === "show_locked") {
      const lockedSettings = await getLockedSettings();
      const productInfo = await getActiveProductInfo();
      
      const message = course.locked_message || (lockedSettings.enabled 
        ? lockedSettings.messages.course 
        : "This course is available to premium members.");

      const ctaLabel = productInfo.singleProductName || "View offers";

      return (
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-6">
            <Link href="/courses" className="text-blue-600 hover:text-blue-700 text-sm">
              ← Back to Courses
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-6">{course.title}</h1>
          <LockedContent
            contentType="course"
            message={message}
            ctaLabel={ctaLabel}
          />
        </div>
      );
    }

    // Otherwise, show enrollment option
    return (
      <div className="flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{course.title}</h1>
          
          <p className="text-gray-600 mb-6">
            You need to enroll in this course to access the content.
          </p>

          <div className="flex flex-col gap-3">
            <EnrollButton courseId={course.id} />
            <Link
              href="/courses"
              className="inline-block px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              Back to Courses
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const totalLessons = course.modules.reduce((acc: number, m: any) => acc + m.lessons.length, 0);
  const completedLessons = course.modules.reduce(
    (acc: number, m: any) => acc + m.lessons.filter((l: any) => l.is_completed).length,
    0
  );
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // Find next incomplete lesson
  let nextLesson = null;
  for (const module of course.modules) {
    const incompleteLesson = module.lessons.find((l: any) => !l.is_completed);
    if (incompleteLesson) {
      nextLesson = incompleteLesson;
      break;
    }
  }

  return (
    <div>
      {/* Hero Banner */}
      {course.banner_mode === 'image' && course.banner_url ? (
        // Image mode: show only the banner image, no title overlay
        <div className="relative overflow-hidden -mx-6 -mt-6 mb-8">
          <img
            src={course.banner_url}
            alt={course.title}
            className="w-full h-auto object-cover"
          />
          {/* Breadcrumbs overlay at top */}
          <div className="absolute top-4 left-6 text-sm text-white drop-shadow-lg">
            <Link href="/courses" className="hover:text-blue-100">
              Video Courses
            </Link>
            <span className="mx-2">/</span>
            <span>{course.title}</span>
          </div>
        </div>
      ) : (
        // Text mode: show title as banner with gradient background, no image
        <div className="relative bg-gradient-to-r from-blue-900 to-blue-700 text-white overflow-hidden -mx-6 -mt-6 mb-8">
          <div className="relative px-6 py-16">
            {/* Breadcrumbs */}
            <div className="text-sm text-blue-100 mb-4">
              <Link href="/courses" className="hover:text-white">
                Video Courses
              </Link>
              <span className="mx-2">/</span>
              <span>{course.title}</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold mb-4">{course.title}</h1>
          </div>
        </div>
      )}

      {/* Admin Controls with Overlays */}
      {showAdminControls && courseWithGroups && (
        <CourseAdminOverlays 
          course={courseWithGroups}
          modules={course.modules}
        />
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Content */}
        <div className="flex-1">
          {/* Description */}
          {course.description && (
            <div className="mb-8">
              <p className="text-lg text-gray-700">{course.description}</p>
            </div>
          )}

          {/* Progress Card - Pick up where you left off */}
          {totalLessons > 0 && completedLessons > 0 && nextLesson && (
            <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">
                    Pick up where you left off
                  </h3>
                  <p className="font-semibold text-gray-900 mb-1">
                    {nextLesson.title}
                  </p>
                  <p className="text-sm text-gray-600">
                    {completedLessons} of {totalLessons} completed
                  </p>
                </div>
                <Link
                  href={`/courses/${slug}/lessons/${nextLesson.id}`}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium whitespace-nowrap"
                >
                  Continue
                </Link>
              </div>
            </div>
          )}

          {/* Modules and Lessons List */}
          <div className="space-y-6">
            {course.modules.map((module: any, moduleIndex: number) => (
              <div
                key={module.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200"
              >
                <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    {module.title}
                  </h2>
                  {module.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {module.description}
                    </p>
                  )}
                </div>

                <div className="divide-y divide-gray-200">
                  {module.lessons.map((lesson: any, lessonIndex: number) => {
                    const lessonIsLocked = lesson.is_locked || false;
                    const hasWatchProgress = lesson.watched_seconds > 0 && !lesson.is_completed;
                    
                    // Determine lock reason
                    let lockHint = null;
                    if (lessonIsLocked) {
                      if (lesson.unlock_at && new Date(lesson.unlock_at) > new Date()) {
                        const unlockDate = new Date(lesson.unlock_at);
                        lockHint = `Available ${unlockDate.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: unlockDate.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
                        })}`;
                      } else {
                        lockHint = "Complete previous lessons to unlock";
                      }
                    }
                    
                    return (
                      <div key={lesson.id} className="relative">
                        <Link
                          href={`/courses/${slug}/lessons/${lesson.id}`}
                          className={`flex items-center gap-4 px-6 py-4 transition group ${
                            lessonIsLocked
                              ? "opacity-60 cursor-not-allowed"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          {/* Completion/Lock Indicator */}
                          {lessonIsLocked ? (
                            <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                              <svg
                                className="w-5 h-5 text-gray-400"
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
                              className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                lesson.is_completed
                                  ? "bg-green-500 border-green-500"
                                  : "border-gray-300 group-hover:border-gray-400"
                              }`}
                            >
                              {lesson.is_completed && (
                                <svg
                                  className="w-4 h-4 text-white"
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

                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3
                                className={`font-medium ${
                                  lessonIsLocked
                                    ? "text-gray-500"
                                    : "text-gray-900 group-hover:text-blue-600"
                                }`}
                              >
                                {lesson.title}
                              </h3>
                              {hasWatchProgress && (
                                <span className="text-xs text-blue-600 font-medium">
                                  Resume
                                </span>
                              )}
                              {lesson.duration_seconds && (
                                <span className="text-xs text-gray-500">
                                  {formatDuration(lesson.duration_seconds)}
                                </span>
                              )}
                            </div>
                            {lockHint && (
                              <p className="text-xs text-gray-500 mt-1">
                                {lockHint}
                              </p>
                            )}
                          </div>

                          <svg
                            className={`w-5 h-5 ${
                              lessonIsLocked
                                ? "text-gray-300"
                                : "text-gray-400 group-hover:text-blue-600"
                            }`}
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path d="M9 5l7 7-7 7"></path>
                          </svg>
                        </Link>
                        {hasWatchProgress && lesson.video_url && (
                          <div className="absolute bottom-0 left-6 right-6 h-1 bg-gray-200">
                            <div
                              className="h-full bg-blue-600 transition-all"
                              style={{ width: "30%" }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {module.lessons.length === 0 && (
                    <div className="px-6 py-8 text-center text-gray-500">
                      No lessons in this module yet.
                    </div>
                  )}
                </div>
              </div>
            ))}

            {course.modules.length === 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <svg
                  className="w-16 h-16 text-gray-300 mx-auto mb-4"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                </svg>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No modules yet
                </h3>
                <p className="text-gray-600 mb-6">
                  This course is currently being developed. Course content will be added soon.
                </p>
                {showAdminControls && (
                  <Link
                    href="/dashboard/courses"
                    className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                  >
                    Add Content in Dashboard
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Progress Card */}
        <div className="lg:w-80">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:sticky lg:top-4">
            {nextLesson ? (
              <>
                <h3 className="text-sm font-semibold text-gray-600 mb-3">
                  Pick up where you left off!
                </h3>
                <p className="font-semibold text-gray-900 mb-4">
                  {nextLesson.title}
                </p>
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>{completedLessons} of {totalLessons} completed</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
                <Link
                  href={`/courses/${slug}/lessons/${nextLesson.id}`}
                  className="block w-full px-4 py-2 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition"
                >
                  Continue Learning
                </Link>
              </>
            ) : (
              <>
                <h3 className="text-sm font-semibold text-gray-600 mb-3">
                  Course Progress
                </h3>
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>{completedLessons} of {totalLessons} completed</span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
                {progressPercent === 100 && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm font-semibold text-green-800">
                      🎉 Course Complete!
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
