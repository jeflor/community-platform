import { PulseFeed } from "@/components/pulse/PulseFeed";
import { PulseRightRail } from "@/components/pulse/PulseRightRail";
import { createClient } from "@/lib/supabase/server";

export default async function PulsePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let nextLesson = null;

  if (user) {
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select(`
        course_id,
        course:course_id (
          id,
          title,
          slug
        )
      `)
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (enrollments?.course) {
      const course = Array.isArray(enrollments.course)
        ? enrollments.course[0]
        : enrollments.course;
      const { data: modules } = await supabase
        .from("modules")
        .select("id")
        .eq("course_id", enrollments.course_id)
        .order("position")
        .limit(1);

      if (modules && modules.length > 0) {
        const { data: lessons } = await supabase
          .from("lessons")
          .select(`
            id,
            title,
            module_id,
            module:module_id (
              course_id
            )
          `)
          .eq("module_id", modules[0].id)
          .order("position")
          .limit(10);

        if (lessons && lessons.length > 0) {
          const { data: progress } = await supabase
            .from("lesson_progress")
            .select("lesson_id")
            .eq("user_id", user.id)
            .in(
              "lesson_id",
              lessons.map((l) => l.id)
            );

          const completedLessonIds = new Set(
            progress?.map((p) => p.lesson_id) || []
          );
          const incompleteLesson = lessons.find(
            (l) => !completedLessonIds.has(l.id)
          );

          if (incompleteLesson && course) {
            nextLesson = {
              lessonId: incompleteLesson.id,
              title: incompleteLesson.title,
              courseTitle: course.title,
              courseSlug: course.slug,
            };
          }
        }
      }
    }
  }

  return (
    <div className="flex gap-6 max-w-7xl mx-auto">
      <div className="flex-1 min-w-0">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Pulse</h1>
        <PulseFeed />
      </div>
      <PulseRightRail nextLesson={nextLesson} />
    </div>
  );
}
