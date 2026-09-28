import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAvailableCourses, enrollInCourse } from "@/lib/actions/courses";
import { getPreviewState } from "@/lib/preview/preview-helpers";
import { AdminActions } from "@/components/courses/AdminActions";
import Link from "next/link";

export default async function CoursesPage() {
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
  const showAdminActions = isAdmin && !previewState?.active;

  const courses = await getAvailableCourses();

  // Get stored sections from site_settings key/value table
  const { data: settings } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "course_sections")
    .maybeSingle();

  let storedSections: string[] = [];
  try {
    if (settings?.value) {
      storedSections = Array.isArray(settings.value)
        ? settings.value
        : typeof settings.value === 'string'
        ? JSON.parse(settings.value)
        : [];
    }
  } catch (e) {
    console.error("Error parsing course_sections:", e);
  }

  // Group courses by section
  const coursesBySection = courses.reduce((acc: any, course: any) => {
    const section = course.section || "Video Training Courses";
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(course);
    return acc;
  }, {});

  // Merge stored sections with existing sections from courses
  const courseSections = Object.keys(coursesBySection);
  const allSections = Array.from(new Set([...storedSections, ...courseSections]));
  
  // Ensure each section has an entry in coursesBySection
  allSections.forEach(section => {
    if (!coursesBySection[section]) {
      coursesBySection[section] = [];
    }
  });

  const sections = allSections;

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Video Courses</h1>
        
        {showAdminActions && (
          <AdminActions courses={courses} sections={sections} />
        )}
      </div>

      {/* Sections */}
      <div className="space-y-8">
        {sections.map((sectionName) => (
          <div key={sectionName}>
            {/* Section Header with Collapsible */}
            <details open className="group mb-4">
              <summary className="flex items-center gap-2 cursor-pointer text-xl font-bold text-gray-900 hover:text-blue-600 transition">
                <svg
                  className="w-5 h-5 text-gray-400 transition group-open:rotate-90"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M9 5l7 7-7 7"></path>
                </svg>
                {sectionName}
              </summary>

              {/* Course Cards Grid */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {coursesBySection[sectionName].map((course: any) => {
                  const progressPercent = course.total_lessons > 0
                    ? Math.round((course.completed_lessons / course.total_lessons) * 100)
                    : 0;

                  return (
                    <div
                      key={course.id}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition"
                    >
                      {/* Course Cover */}
                      {course.banner_url && (
                        <div className="relative" style={{ aspectRatio: "16/9" }}>
                          <img
                            src={course.banner_url}
                            alt={course.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      <div className="p-6 flex-1 flex flex-col">
                        {/* Course Title */}
                        <h2 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                          {course.title}
                        </h2>

                        {/* Lesson Count */}
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                          </svg>
                          <span>
                            {course.total_lessons === 0 
                              ? "No lessons yet" 
                              : `${course.total_lessons} lesson${course.total_lessons === 1 ? '' : 's'}`
                            }
                          </span>
                        </div>

                        {/* Admin Badge */}
                        {isAdmin && !course.is_published && (
                          <div className="mb-3">
                            <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                              Draft
                            </span>
                          </div>
                        )}

                        {/* Spacer */}
                        <div className="flex-1"></div>

                        {/* Enrolled State */}
                        {course.is_enrolled ? (
                          <>
                            {/* Completed Badge */}
                            {progressPercent === 100 && course.total_lessons > 0 && (
                              <div className="mb-3">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  Completed
                                </span>
                              </div>
                            )}

                            <div className="mb-4">
                              <div className="flex justify-between text-xs text-gray-600 mb-1">
                                <span>Progress</span>
                                <span>{progressPercent}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all"
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {course.completed_lessons} of {course.total_lessons} completed
                              </p>
                            </div>

                            <Link
                              href={`/courses/${course.slug}`}
                              className="block w-full px-4 py-2 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                            >
                              Continue Learning
                            </Link>
                          </>
                        ) : (
                          <>
                            {course.locked_message && course.visibility === "show_locked" && (
                              <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                                🔒 {course.locked_message}
                              </div>
                            )}

                            <form action={async () => {
                              "use server";
                              await enrollInCourse(course.id);
                            }}>
                              <button
                                type="submit"
                                className="w-full px-4 py-2 bg-gray-100 text-gray-700 text-center rounded-lg hover:bg-gray-200 transition text-sm font-medium"
                              >
                                Enroll Now
                              </button>
                            </form>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </details>
          </div>
        ))}

        {courses.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No courses available yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
