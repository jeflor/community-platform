"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export interface StudentProgress {
  student_id: string;
  student_name: string | null;
  student_email: string;
  student_avatar_url: string | null;
  enrolled_courses: Array<{
    course_id: string;
    course_title: string;
    course_slug: string;
    total_lessons: number;
    completed_lessons: number;
    percent_complete: number;
    enrolled_at: string;
  }>;
  last_active: string | null;
  last_lesson_completed: {
    lesson_title: string | null;
    completed_at: string | null;
  } | null;
  has_coach: boolean;
}

export interface DetailedCourseProgress {
  course_id: string;
  course_title: string;
  modules: Array<{
    module_id: string;
    module_title: string;
    lessons: Array<{
      lesson_id: string;
      lesson_title: string;
      is_completed: boolean;
      completed_at: string | null;
    }>;
  }>;
}

/**
 * Get assigned students for a coach
 */
export async function getAssignedStudents(): Promise<StudentProgress[]> {
  try {
    const adminClient = createAdminClient();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    // Get user role
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userData) {
      return [];
    }

    const isAdmin = userData.role === "admin";
    const isCoach = userData.role === "coach";

    if (!isAdmin && !isCoach) {
      return [];
    }

    // Get student IDs (all for admin, assigned for coach)
    let studentIds: string[] = [];

    if (isAdmin) {
      // Admins see all clients
      const { data: clients } = await adminClient
        .from("users")
        .select("id")
        .eq("role", "client")
        .eq("is_active", true);

      studentIds = clients?.map((c) => c.id) || [];
    } else {
      // Coaches see their assigned students
      const { data: assignments } = await adminClient
        .from("coach_students")
        .select("student_id")
        .eq("coach_id", user.id);

      studentIds = assignments?.map((a) => a.student_id) || [];
    }

    if (studentIds.length === 0) {
      return [];
    }

    // Get student details
    const { data: students } = await adminClient
      .from("users")
      .select("id, full_name, email, avatar_url, updated_at")
      .in("id", studentIds)
      .eq("is_active", true);

    if (!students) {
      return [];
    }

    // Get progress for each student
    const studentsWithProgress = await Promise.all(
      students.map(async (student) => {
        // Get enrollments with course info
        const { data: enrollments } = await adminClient
          .from("enrollments")
          .select(
            `
            course_id,
            enrolled_at,
            courses(id, title, slug)
          `
          )
          .eq("user_id", student.id);

        const coursesProgress = await Promise.all(
          (enrollments || []).map(async (enrollment) => {
            if (!enrollment.courses) {
              return null;
            }

            // Get total lessons in this course
            const { data: modules } = await adminClient
              .from("modules")
              .select("id")
              .eq("course_id", enrollment.course_id);

            const moduleIds = modules?.map((m) => m.id) || [];

            const { data: lessons } = await adminClient
              .from("lessons")
              .select("id, module_id")
              .in("module_id", moduleIds);

            const totalLessons = lessons?.length || 0;

            // Get completed lessons for this student in this course
            const { data: completedLessons } = await adminClient
              .from("lesson_progress")
              .select("lesson_id")
              .eq("user_id", student.id)
              .in(
                "lesson_id",
                lessons?.map((l) => l.id) || []
              );

            const completedCount = completedLessons?.length || 0;
            const percentComplete =
              totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

            const course = Array.isArray(enrollment.courses)
              ? enrollment.courses[0]
              : enrollment.courses;

            return {
              course_id: enrollment.course_id,
              course_title: course?.title || "Unknown Course",
              course_slug: course?.slug || "",
              total_lessons: totalLessons,
              completed_lessons: completedCount,
              percent_complete: percentComplete,
              enrolled_at: enrollment.enrolled_at,
            };
          })
        );

        // Get last lesson completed
        const { data: lastProgress } = await adminClient
          .from("lesson_progress")
          .select(
            `
            completed_at,
            lessons(title)
          `
          )
          .eq("user_id", student.id)
          .order("completed_at", { ascending: false })
          .limit(1)
          .single();

        // Get last active date (most recent of: user updated_at, last DM, last lesson completed)
        const { data: lastDM } = await adminClient
          .from("dm_messages")
          .select("created_at")
          .eq("user_id", student.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        const dates = [
          student.updated_at,
          lastDM?.created_at,
          lastProgress?.completed_at,
        ].filter(Boolean);

        const lastActive = dates.length > 0 ? dates.sort().reverse()[0] : null;

        // Check if student has a coach assigned
        const { data: coachAssignment } = await adminClient
          .from("coach_students")
          .select("coach_id")
          .eq("student_id", student.id)
          .single();

        return {
          student_id: student.id,
          student_name: student.full_name,
          student_email: student.email,
          student_avatar_url: student.avatar_url,
          enrolled_courses: coursesProgress.filter((c) => c !== null) as any,
          last_active: lastActive,
          last_lesson_completed: lastProgress
            ? {
                lesson_title:
                  (lastProgress.lessons as any)?.title || null,
                completed_at: lastProgress.completed_at,
              }
            : null,
          has_coach: !!coachAssignment,
        };
      })
    );

    return studentsWithProgress;
  } catch (error) {
    console.error("Error fetching assigned students:", error);
    return [];
  }
}

/**
 * Get detailed progress for a specific student
 */
export async function getStudentDetailedProgress(
  studentId: string
): Promise<DetailedCourseProgress[]> {
  try {
    const adminClient = createAdminClient();

    // Get all enrollments for this student
    const { data: enrollments } = await adminClient
      .from("enrollments")
      .select("course_id")
      .eq("user_id", studentId);

    if (!enrollments || enrollments.length === 0) {
      return [];
    }

    const courseProgress = await Promise.all(
      enrollments.map(async (enrollment) => {
        // Get course info
        const { data: course } = await adminClient
          .from("courses")
          .select("id, title")
          .eq("id", enrollment.course_id)
          .single();

        if (!course) {
          return null;
        }

        // Get modules for this course
        const { data: modules } = await adminClient
          .from("modules")
          .select("id, title, position")
          .eq("course_id", enrollment.course_id)
          .order("position");

        if (!modules) {
          return null;
        }

        const modulesWithLessons = await Promise.all(
          modules.map(async (module) => {
            // Get lessons for this module
            const { data: lessons } = await adminClient
              .from("lessons")
              .select("id, title, position")
              .eq("module_id", module.id)
              .order("position");

            if (!lessons) {
              return null;
            }

            // Get completion status for each lesson
            const lessonsWithProgress = await Promise.all(
              lessons.map(async (lesson) => {
                const { data: progress } = await adminClient
                  .from("lesson_progress")
                  .select("completed_at")
                  .eq("user_id", studentId)
                  .eq("lesson_id", lesson.id)
                  .single();

                return {
                  lesson_id: lesson.id,
                  lesson_title: lesson.title,
                  is_completed: !!progress,
                  completed_at: progress?.completed_at || null,
                };
              })
            );

            return {
              module_id: module.id,
              module_title: module.title,
              lessons: lessonsWithProgress,
            };
          })
        );

        return {
          course_id: course.id,
          course_title: course.title,
          modules: modulesWithLessons.filter((m) => m !== null) as any,
        };
      })
    );

    return courseProgress.filter((c) => c !== null) as DetailedCourseProgress[];
  } catch (error) {
    console.error("Error fetching student detailed progress:", error);
    return [];
  }
}

/**
 * Assign a coach to a student (admin only)
 */
export async function assignCoachToStudent(
  coachId: string,
  studentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Verify the coach is actually a coach
    const { data: coach } = await supabase
      .from("users")
      .select("role")
      .eq("id", coachId)
      .single();

    if (!coach || coach.role !== "coach") {
      return { success: false, error: "Invalid coach ID" };
    }

    // Verify the student is a client
    const { data: student } = await supabase
      .from("users")
      .select("role")
      .eq("id", studentId)
      .single();

    if (!student || student.role !== "client") {
      return { success: false, error: "Invalid student ID" };
    }

    // Assign (will replace existing assignment due to UNIQUE constraint on student_id)
    const { error } = await supabase
      .from("coach_students")
      .upsert(
        {
          coach_id: coachId,
          student_id: studentId,
          assigned_at: new Date().toISOString(),
        },
        { onConflict: "student_id" }
      );

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/members");
    revalidatePath("/dashboard/coaches");

    return { success: true };
  } catch (error) {
    console.error("Error assigning coach to student:", error);
    return { success: false, error: "Failed to assign coach" };
  }
}

/**
 * Unassign a coach from a student (admin only)
 */
export async function unassignCoachFromStudent(
  studentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("coach_students")
      .delete()
      .eq("student_id", studentId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/members");
    revalidatePath("/dashboard/coaches");

    return { success: true };
  } catch (error) {
    console.error("Error unassigning coach from student:", error);
    return { success: false, error: "Failed to unassign coach" };
  }
}

/**
 * Get all coaches (for admin assignment dropdown)
 */
export async function getAllCoaches(): Promise<
  Array<{ id: string; full_name: string | null; email: string }>
> {
  try {
    const adminClient = createAdminClient();

    const { data: coaches } = await adminClient
      .from("users")
      .select("id, full_name, email")
      .eq("role", "coach")
      .eq("is_active", true)
      .order("full_name");

    return coaches || [];
  } catch (error) {
    console.error("Error fetching coaches:", error);
    return [];
  }
}

/**
 * Get student info by ID (for detail view)
 */
export async function getStudentInfo(
  studentId: string
): Promise<StudentProgress | null> {
  try {
    const students = await getAssignedStudents();
    return students.find((s) => s.student_id === studentId) || null;
  } catch (error) {
    console.error("Error fetching student info:", error);
    return null;
  }
}

/**
 * Get student's access groups (cheap lookup for detail view)
 */
export async function getStudentGroups(
  studentId: string
): Promise<string[]> {
  try {
    const adminClient = createAdminClient();
    
    const { data: groupMembers } = await adminClient
      .from("group_members")
      .select("access_groups(name)")
      .eq("user_id", studentId);

    if (!groupMembers) {
      return [];
    }

    return groupMembers
      .map((gm) => {
        const group = gm.access_groups as unknown as { name: string | null };
        return group?.name;
      })
      .filter((name): name is string => name !== null);
  } catch (error) {
    console.error("Error fetching student groups:", error);
    return [];
  }
}
