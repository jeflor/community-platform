"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export type Course = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  banner_url: string | null;
  banner_mode: "image" | "text";
  is_published: boolean;
  locked_message: string | null;
  visibility: "show_locked" | "hide";
  position: number;
  section: string | null;
  sequential: boolean;
  created_at: string;
  updated_at: string;
};

export type CourseWithGroups = Course & {
  groups: { id: string; name: string }[];
};

export type Module = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

export type Lesson = {
  id: string;
  module_id: string;
  title: string;
  body: string | null;
  video_url: string | null;
  attachments: { name: string; url: string; type: string }[] | null;
  position: number;
  unlock_at: string | null;
  duration_seconds: number | null;
  is_locked?: boolean;
  created_at: string;
  updated_at: string;
};

export type Enrollment = {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
};

export type LessonProgress = {
  user_id: string;
  lesson_id: string;
  completed_at: string | null;
  watched_seconds: number;
  last_watched_at: string | null;
};

export type CourseWithProgress = Course & {
  total_lessons: number;
  completed_lessons: number;
  is_enrolled: boolean;
};

// Admin: Get all courses
export async function getAllCourses(): Promise<CourseWithGroups[]> {
  const adminClient = createAdminClient();

  const { data: courses, error } = await adminClient
    .from("courses")
    .select("*")
    .order("position", { ascending: true });

  if (error) {
    console.error("Error fetching courses:", error);
    return [];
  }

  // Fetch groups for each course
  const coursesWithGroups = await Promise.all(
    courses.map(async (course) => {
      const { data: courseGroups } = await adminClient
        .from("course_groups")
        .select("group_id")
        .eq("course_id", course.id);

      const groupIds = courseGroups?.map((cg) => cg.group_id) || [];

      if (groupIds.length === 0) {
        return { ...course, groups: [] };
      }

      const { data: groups } = await adminClient
        .from("access_groups")
        .select("id, name")
        .in("id", groupIds);

      return {
        ...course,
        groups: groups || [],
      };
    })
  );

  return coursesWithGroups;
}

// Admin: Get single course by ID
export async function getCourseById(id: string): Promise<CourseWithGroups | null> {
  const adminClient = createAdminClient();

  const { data: course, error } = await adminClient
    .from("courses")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !course) {
    console.error("Error fetching course:", error);
    return null;
  }

  const { data: courseGroups } = await adminClient
    .from("course_groups")
    .select("group_id")
    .eq("course_id", course.id);

  const groupIds = courseGroups?.map((cg) => cg.group_id) || [];

  if (groupIds.length === 0) {
    return { ...course, groups: [] };
  }

  const { data: groups } = await adminClient
    .from("access_groups")
    .select("id, name")
    .in("id", groupIds);

  return {
    ...course,
    groups: groups || [],
  };
}

// Admin: Create course
export async function createCourse(data: {
  title: string;
  slug: string;
  description?: string;
  banner_url?: string;
  banner_mode?: "image" | "text";
  is_published?: boolean;
  locked_message?: string;
  visibility?: "show_locked" | "hide";
  position?: number;
  section?: string;
  sequential?: boolean;
  group_ids?: string[];
}) {
  const supabase = await createClient();
  
  // Verify admin role
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userData?.role !== "admin") {
    throw new Error("Unauthorized: Admin role required");
  }

  const adminClient = createAdminClient();

  const { data: course, error } = await adminClient
    .from("courses")
    .insert({
      title: data.title,
      slug: data.slug,
      description: data.description || null,
      banner_url: data.banner_url || null,
      banner_mode: data.banner_mode || "text",
      is_published: data.is_published || false,
      locked_message: data.locked_message || null,
      visibility: data.visibility || "show_locked",
      position: data.position || 0,
      section: data.section || "Video Training Courses",
      sequential: data.sequential || false,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating course:", error);
    throw new Error("Failed to create course");
  }

  // Assign groups if provided
  if (data.group_ids && data.group_ids.length > 0) {
    const courseGroups = data.group_ids.map((groupId) => ({
      course_id: course.id,
      group_id: groupId,
    }));

    await adminClient.from("course_groups").insert(courseGroups);
  }

  revalidatePath("/dashboard/courses");
  revalidatePath("/courses");
  return course;
}

// Admin: Create section - persists to site_settings key/value table
export async function createSection(sectionName: string) {
  const supabase = await createClient();
  
  // Verify admin role
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userData?.role !== "admin") {
    throw new Error("Unauthorized: Admin role required");
  }

  const adminClient = createAdminClient();
  
  // Get current course_sections from site_settings key/value table
  const { data: settings } = await adminClient
    .from("site_settings")
    .select("value")
    .eq("key", "course_sections")
    .maybeSingle();

  let sections: string[] = [];
  try {
    if (settings?.value) {
      sections = Array.isArray(settings.value) 
        ? settings.value 
        : typeof settings.value === 'string'
        ? JSON.parse(settings.value)
        : [];
    }
  } catch (e) {
    console.error("Error parsing course_sections:", e);
  }

  const trimmedName = sectionName.trim();
  
  // Check if section already exists
  if (sections.includes(trimmedName)) {
    throw new Error("Section already exists");
  }

  // Add new section
  sections.push(trimmedName);

  // Upsert to site_settings key/value table
  const { error } = await adminClient
    .from("site_settings")
    .upsert({ 
      key: "course_sections", 
      value: sections 
    }, {
      onConflict: "key"
    });

  if (error) {
    console.error("Error upserting course_sections:", error);
    throw new Error("Failed to create section");
  }

  revalidatePath("/courses");
  return { success: true };
}

// Admin: Update course
export async function updateCourse(
  id: string,
  data: {
    title?: string;
    slug?: string;
    description?: string;
    banner_url?: string;
    banner_mode?: "image" | "text";
    is_published?: boolean;
    locked_message?: string;
    visibility?: "show_locked" | "hide";
    position?: number;
    section?: string;
    sequential?: boolean;
    group_ids?: string[];
  }
) {
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("courses")
    .update({
      title: data.title,
      slug: data.slug,
      description: data.description,
      banner_url: data.banner_url,
      banner_mode: data.banner_mode,
      is_published: data.is_published,
      locked_message: data.locked_message,
      visibility: data.visibility,
      position: data.position,
      section: data.section,
      sequential: data.sequential,
    })
    .eq("id", id);

  if (error) {
    console.error("Error updating course:", error);
    throw new Error("Failed to update course");
  }

  // Update groups if provided
  if (data.group_ids !== undefined) {
    // Delete existing groups
    await adminClient.from("course_groups").delete().eq("course_id", id);

    // Insert new groups
    if (data.group_ids.length > 0) {
      const courseGroups = data.group_ids.map((groupId) => ({
        course_id: id,
        group_id: groupId,
      }));
      await adminClient.from("course_groups").insert(courseGroups);
    }
  }

  revalidatePath("/dashboard/courses");
  revalidatePath("/courses");
  revalidatePath(`/courses/${data.slug || ""}`);
}

// Admin: Delete course
export async function deleteCourse(id: string) {
  const adminClient = createAdminClient();

  const { error } = await adminClient.from("courses").delete().eq("id", id);

  if (error) {
    console.error("Error deleting course:", error);
    throw new Error("Failed to delete course");
  }

  revalidatePath("/dashboard/courses");
  revalidatePath("/courses");
}

// Admin: Get modules for a course
export async function getModulesByCourseId(courseId: string): Promise<Module[]> {
  const adminClient = createAdminClient();

  const { data: modules, error } = await adminClient
    .from("modules")
    .select("*")
    .eq("course_id", courseId)
    .order("position", { ascending: true });

  if (error) {
    console.error("Error fetching modules:", error);
    return [];
  }

  return modules;
}

// Admin: Create module
export async function createModule(data: {
  course_id: string;
  title: string;
  description?: string;
  position?: number;
}) {
  const adminClient = createAdminClient();

  const { data: module, error } = await adminClient
    .from("modules")
    .insert({
      course_id: data.course_id,
      title: data.title,
      description: data.description || null,
      position: data.position || 0,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating module:", error);
    throw new Error("Failed to create module");
  }

  revalidatePath("/dashboard/courses");
  return module;
}

// Admin: Update module
export async function updateModule(
  id: string,
  data: {
    title?: string;
    description?: string;
    position?: number;
  }
) {
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("modules")
    .update({
      title: data.title,
      description: data.description,
      position: data.position,
    })
    .eq("id", id);

  if (error) {
    console.error("Error updating module:", error);
    throw new Error("Failed to update module");
  }

  revalidatePath("/dashboard/courses");
}

// Admin: Delete module
export async function deleteModule(id: string) {
  const adminClient = createAdminClient();

  const { error } = await adminClient.from("modules").delete().eq("id", id);

  if (error) {
    console.error("Error deleting module:", error);
    throw new Error("Failed to delete module");
  }

  revalidatePath("/dashboard/courses");
}

// Admin: Get lessons for a module
export async function getLessonsByModuleId(moduleId: string): Promise<Lesson[]> {
  const adminClient = createAdminClient();

  const { data: lessons, error } = await adminClient
    .from("lessons")
    .select("*")
    .eq("module_id", moduleId)
    .order("position", { ascending: true });

  if (error) {
    console.error("Error fetching lessons:", error);
    return [];
  }

  return lessons;
}

// Admin: Create lesson
export async function createLesson(data: {
  module_id: string;
  title: string;
  body?: string;
  video_url?: string;
  attachments?: { name: string; url: string; type: string }[];
  position?: number;
  unlock_at?: string | null;
}) {
  const adminClient = createAdminClient();

  const { data: lesson, error } = await adminClient
    .from("lessons")
    .insert({
      module_id: data.module_id,
      title: data.title,
      body: data.body || null,
      video_url: data.video_url || null,
      attachments: data.attachments || null,
      position: data.position || 0,
      unlock_at: data.unlock_at || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating lesson:", error);
    throw new Error("Failed to create lesson");
  }

  revalidatePath("/dashboard/courses");
  return lesson;
}

// Admin: Update lesson
export async function updateLesson(
  id: string,
  data: {
    title?: string;
    body?: string;
    video_url?: string;
    attachments?: { name: string; url: string; type: string }[];
    position?: number;
    unlock_at?: string | null;
  }
) {
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("lessons")
    .update({
      title: data.title,
      body: data.body,
      video_url: data.video_url,
      attachments: data.attachments,
      position: data.position,
      unlock_at: data.unlock_at,
    })
    .eq("id", id);

  if (error) {
    console.error("Error updating lesson:", error);
    throw new Error("Failed to update lesson");
  }

  revalidatePath("/dashboard/courses");
}

// Admin: Delete lesson
export async function deleteLesson(id: string) {
  const adminClient = createAdminClient();

  const { error } = await adminClient.from("lessons").delete().eq("id", id);

  if (error) {
    console.error("Error deleting lesson:", error);
    throw new Error("Failed to delete lesson");
  }

  revalidatePath("/dashboard/courses");
}

// Member: Get available courses (with progress)
export async function getAvailableCourses(): Promise<CourseWithProgress[]> {
  const supabase = await createClient();

  // Get user's accessible published courses
  const { data: courses, error } = await supabase
    .from("courses")
    .select("*")
    .eq("is_published", true)
    .order("position", { ascending: true });

  if (error) {
    console.error("Error fetching available courses:", error);
    return [];
  }

  // Get user's enrollments
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id");

  const enrolledCourseIds = enrollments?.map((e) => e.course_id) || [];

  // For each course, calculate progress
  const coursesWithProgress = await Promise.all(
    courses.map(async (course) => {
      const isEnrolled = enrolledCourseIds.includes(course.id);

      // Get modules for this course
      const { data: modules } = await supabase
        .from("modules")
        .select("id")
        .eq("course_id", course.id);

      const moduleIds = modules?.map((m) => m.id) || [];

      // Get total lessons count for this course
      let totalLessons = 0;
      if (moduleIds.length > 0) {
        const { count } = await supabase
          .from("lessons")
          .select("id", { count: "exact", head: true })
          .in("module_id", moduleIds);
        totalLessons = count || 0;
      }

      // Get completed lessons count if enrolled
      let completedLessons = 0;
      if (isEnrolled && moduleIds.length > 0) {
        // Get all lesson IDs for this course
        const { data: lessons } = await supabase
          .from("lessons")
          .select("id")
          .in("module_id", moduleIds);

        const lessonIds = lessons?.map((l) => l.id) || [];

        if (lessonIds.length > 0) {
          const { count } = await supabase
            .from("lesson_progress")
            .select("lesson_id", { count: "exact", head: true })
            .in("lesson_id", lessonIds);
          completedLessons = count || 0;
        }
      }

      return {
        ...course,
        total_lessons: totalLessons,
        completed_lessons: completedLessons,
        is_enrolled: isEnrolled,
      };
    })
  );

  return coursesWithProgress;
}

// Member: Get single course by slug (with modules and lessons)
export async function getCourseBySlug(slug: string) {
  const supabase = await createClient();

  const { data: course, error } = await supabase
    .from("courses")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (error || !course) {
    console.error("Error fetching course:", error);
    return null;
  }

  // Check if user is enrolled
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("*")
    .eq("course_id", course.id)
    .single();

  if (!enrollment) {
    // Not enrolled, return course without modules/lessons
    return {
      ...course,
      is_enrolled: false,
      modules: [],
    };
  }

  // Get modules with lessons
  const { data: modules } = await supabase
    .from("modules")
    .select("*")
    .eq("course_id", course.id)
    .order("position", { ascending: true });

  // Check if user is admin
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", (await supabase.auth.getUser()).data.user?.id || "")
    .single();
  const isRealAdmin = userData?.role === "admin";

  // Check if preview mode is active
  const { isPreviewing } = await import("@/lib/preview/preview-helpers");
  const previewActive = await isPreviewing();

  // Treat admin as non-admin for lock decisions if previewing
  const treatAsNonAdmin = isRealAdmin && previewActive;
  const shouldApplyLocks = !isRealAdmin || treatAsNonAdmin;

  const modulesWithLessons = await Promise.all(
    (modules || []).map(async (module) => {
      const { data: lessons } = await supabase
        .from("lessons")
        .select("*")
        .eq("module_id", module.id)
        .order("position", { ascending: true });

      // Get progress for each lesson
      const lessonsWithProgress = await Promise.all(
        (lessons || []).map(async (lesson) => {
          const { data: progress } = await supabase
            .from("lesson_progress")
            .select("*")
            .eq("lesson_id", lesson.id)
            .single();

          return {
            ...lesson,
            is_completed: !!progress?.completed_at,
            watched_seconds: progress?.watched_seconds || 0,
            last_watched_at: progress?.last_watched_at || null,
          };
        })
      );

      return {
        ...module,
        lessons: lessonsWithProgress,
      };
    })
  );

  // Calculate locked status for each lesson
  let allLessonsOrdered: any[] = [];
  const now = new Date();
  
  if (shouldApplyLocks) {
    // First, check time-based locks for all lessons
    for (const module of modulesWithLessons) {
      for (const lesson of module.lessons) {
        // Check if lesson is time-locked
        if (lesson.unlock_at && new Date(lesson.unlock_at) > now) {
          lesson.is_locked = true;
        } else if (course.sequential) {
          // Will be computed below for sequential courses
          lesson.is_locked = false;
        } else {
          // Not sequential and not time-locked - unlocked
          lesson.is_locked = false;
        }
      }
    }

    // If sequential, additionally check prior lesson completion
    if (course.sequential) {
      // Build a flat ordered list of all lessons
      for (const module of modulesWithLessons) {
        allLessonsOrdered.push(...module.lessons);
      }

      // Mark lessons as locked if any prior lesson is incomplete OR if already time-locked
      let allPriorComplete = true;
      for (let i = 0; i < allLessonsOrdered.length; i++) {
        const lesson = allLessonsOrdered[i];
        // If already time-locked, keep it locked
        if (!lesson.is_locked) {
          lesson.is_locked = !allPriorComplete;
        }
        if (!lesson.is_completed) {
          allPriorComplete = false;
        }
      }
    }
  } else {
    // Admin not previewing - all lessons unlocked
    for (const module of modulesWithLessons) {
      for (const lesson of module.lessons) {
        lesson.is_locked = false;
      }
    }
  }

  return {
    ...course,
    is_enrolled: true,
    modules: modulesWithLessons,
  };
}

// Member: Enroll in a course
export async function enrollInCourse(courseId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { error } = await supabase
    .from("enrollments")
    .insert({
      user_id: user.id,
      course_id: courseId,
    });

  if (error) {
    console.error("Error enrolling in course:", error);
    throw new Error("Failed to enroll in course");
  }

  revalidatePath("/courses");
}

// Member: Mark lesson as complete
export async function markLessonComplete(lessonId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  // Check if user is admin
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  const isRealAdmin = userData?.role === "admin";

  // Check if preview mode is active
  const { isPreviewing } = await import("@/lib/preview/preview-helpers");
  const previewActive = await isPreviewing();

  // Check access control before allowing progress insert
  let canAccess = false;

  if (isRealAdmin && !previewActive) {
    // Real admin not previewing - always has access
    canAccess = true;
  } else if (previewActive) {
    // Admin previewing - compute lock app-side, don't call RPC
    // Get lesson metadata including unlock_at
    const { data: lesson } = await supabase
      .from("lessons")
      .select("module_id, position, unlock_at")
      .eq("id", lessonId)
      .single();

    if (!lesson) {
      throw new Error("Lesson not found");
    }

    // Check if lesson is time-locked
    if (lesson.unlock_at && new Date(lesson.unlock_at) > new Date()) {
      canAccess = false;
    } else {
      // Get the module and course
      const { data: module } = await supabase
        .from("modules")
        .select("course_id, position")
        .eq("id", lesson.module_id)
        .single();

      if (!module) {
        throw new Error("Module not found");
      }

      const { data: course } = await supabase
        .from("courses")
        .select("sequential")
        .eq("id", module.course_id)
        .single();

      if (!course || !course.sequential) {
        // Not sequential or course not found - allow access
        canAccess = true;
      } else {
        // Sequential course - check if all prior lessons are completed
        // Get all modules for this course
        const { data: allModules } = await supabase
          .from("modules")
          .select("id, position")
          .eq("course_id", module.course_id)
          .order("position", { ascending: true });

        if (!allModules) {
          canAccess = false;
        } else {
          // Get all lessons across all modules
          const { data: allLessons } = await supabase
            .from("lessons")
            .select("id, module_id, position")
            .in("module_id", allModules.map(m => m.id))
            .order("position", { ascending: true });

          if (!allLessons) {
            canAccess = false;
          } else {
            // Get all completed lesson IDs for this user (only completed_at set)
            const { data: completedProgress } = await supabase
              .from("lesson_progress")
              .select("lesson_id")
              .eq("user_id", user.id)
              .in("lesson_id", allLessons.map(l => l.id))
              .not("completed_at", "is", null);

            const completedLessonIds = new Set(
              completedProgress?.map(p => p.lesson_id) || []
            );

            // Build flat ordered list of lessons
            const orderedLessons: any[] = [];
            for (const mod of allModules) {
              const moduleLessons = allLessons
                .filter(l => l.module_id === mod.id)
                .sort((a, b) => a.position - b.position);
              orderedLessons.push(...moduleLessons.map(l => ({ ...l, modulePosition: mod.position })));
            }

            // Find current lesson and check if all prior lessons are completed
            const currentIndex = orderedLessons.findIndex(l => l.id === lessonId);
            if (currentIndex === -1) {
              canAccess = false;
            } else if (currentIndex === 0) {
              // First lesson - always accessible (already passed time check)
              canAccess = true;
            } else {
              // Check if all prior lessons are completed
              const priorLessons = orderedLessons.slice(0, currentIndex);
              canAccess = priorLessons.every(l => completedLessonIds.has(l.id));
            }
          }
        }
      }
    }
  } else {
    // Non-admin - use RPC
    const { data: canAccessData, error: accessError } = await supabase
      .rpc("can_access_lesson", { lesson_uuid: lessonId });

    if (accessError) {
      console.error("Error checking lesson access:", accessError);
      throw new Error("Failed to verify lesson access");
    }

    canAccess = canAccessData === true;
  }

  if (!canAccess) {
    throw new Error("Cannot mark lesson complete: lesson is locked");
  }

  const { error } = await supabase
    .from("lesson_progress")
    .upsert(
      {
        user_id: user.id,
        lesson_id: lessonId,
        completed_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,lesson_id",
      }
    );

  if (error) {
    console.error("Error marking lesson complete:", error);
    throw new Error("Failed to mark lesson complete");
  }

  revalidatePath("/courses");
}

// Member: Unmark lesson as complete
export async function unmarkLessonComplete(lessonId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  // Set completed_at to null instead of deleting to preserve watch progress
  const { error } = await supabase
    .from("lesson_progress")
    .update({ completed_at: null })
    .eq("user_id", user.id)
    .eq("lesson_id", lessonId);

  if (error) {
    console.error("Error unmarking lesson complete:", error);
    throw new Error("Failed to unmark lesson complete");
  }

  revalidatePath("/courses");
}

// Member: Save lesson watch progress
export async function saveLessonWatchProgress(lessonId: string, watchedSeconds: number) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  // Check if user is admin
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  const isRealAdmin = userData?.role === "admin";

  // Check if preview mode is active
  const { isPreviewing } = await import("@/lib/preview/preview-helpers");
  const previewActive = await isPreviewing();

  // Check access control before allowing progress save
  let canAccess = false;

  if (isRealAdmin && !previewActive) {
    // Real admin not previewing - always has access
    canAccess = true;
  } else if (previewActive) {
    // Admin previewing - compute lock app-side, don't call RPC
    const { data: lesson } = await supabase
      .from("lessons")
      .select("module_id, position, unlock_at")
      .eq("id", lessonId)
      .single();

    if (!lesson) {
      throw new Error("Lesson not found");
    }

    // Check if lesson is time-locked
    if (lesson.unlock_at && new Date(lesson.unlock_at) > new Date()) {
      canAccess = false;
    } else {
      // Get the module and course
      const { data: module } = await supabase
        .from("modules")
        .select("course_id, position")
        .eq("id", lesson.module_id)
        .single();

      if (!module) {
        throw new Error("Module not found");
      }

      const { data: course } = await supabase
        .from("courses")
        .select("sequential")
        .eq("id", module.course_id)
        .single();

      if (!course || !course.sequential) {
        // Not sequential or course not found - allow access
        canAccess = true;
      } else {
        // Sequential course - check if all prior lessons are completed
        const { data: allModules } = await supabase
          .from("modules")
          .select("id, position")
          .eq("course_id", module.course_id)
          .order("position", { ascending: true });

        if (!allModules) {
          canAccess = false;
        } else {
          const { data: allLessons } = await supabase
            .from("lessons")
            .select("id, module_id, position")
            .in("module_id", allModules.map(m => m.id))
            .order("position", { ascending: true });

          if (!allLessons) {
            canAccess = false;
          } else {
            // Only count lessons with completed_at set (not just watch progress)
            const { data: completedProgress } = await supabase
              .from("lesson_progress")
              .select("lesson_id")
              .eq("user_id", user.id)
              .in("lesson_id", allLessons.map(l => l.id))
              .not("completed_at", "is", null);

            const completedLessonIds = new Set(
              completedProgress?.map(p => p.lesson_id) || []
            );

            const orderedLessons: any[] = [];
            for (const mod of allModules) {
              const moduleLessons = allLessons
                .filter(l => l.module_id === mod.id)
                .sort((a, b) => a.position - b.position);
              orderedLessons.push(...moduleLessons.map(l => ({ ...l, modulePosition: mod.position })));
            }

            const currentIndex = orderedLessons.findIndex(l => l.id === lessonId);
            if (currentIndex === -1) {
              canAccess = false;
            } else if (currentIndex === 0) {
              canAccess = true;
            } else {
              const priorLessons = orderedLessons.slice(0, currentIndex);
              canAccess = priorLessons.every(l => completedLessonIds.has(l.id));
            }
          }
        }
      }
    }
  } else {
    // Non-admin - use RPC
    const { data: canAccessData, error: accessError } = await supabase
      .rpc("can_access_lesson", { lesson_uuid: lessonId });

    if (accessError) {
      console.error("Error checking lesson access:", accessError);
      throw new Error("Failed to verify lesson access");
    }

    canAccess = canAccessData === true;
  }

  if (!canAccess) {
    throw new Error("Cannot save watch progress: lesson is locked");
  }

  // Clamp watched_seconds to >= 0
  const clampedSeconds = Math.max(0, Math.floor(watchedSeconds));

  // Check if row exists
  const { data: existing } = await supabase
    .from("lesson_progress")
    .select("completed_at")
    .eq("user_id", user.id)
    .eq("lesson_id", lessonId)
    .single();

  if (existing) {
    // Update only watched_seconds and last_watched_at, preserve completed_at
    const { error } = await supabase
      .from("lesson_progress")
      .update({
        watched_seconds: clampedSeconds,
        last_watched_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("lesson_id", lessonId);

    if (error) {
      console.error("Error updating lesson watch progress:", error);
      throw new Error("Failed to update lesson watch progress");
    }
  } else {
    // Insert new row with watch progress only (no completed_at)
    const { error } = await supabase
      .from("lesson_progress")
      .insert({
        user_id: user.id,
        lesson_id: lessonId,
        watched_seconds: clampedSeconds,
        last_watched_at: new Date().toISOString(),
      });

    if (error) {
      console.error("Error saving lesson watch progress:", error);
      throw new Error("Failed to save lesson watch progress");
    }
  }

  // Note: We don't revalidate here to avoid excessive cache invalidation
  // Watch progress updates happen frequently (every 10s)
}

// Member: Get single lesson by ID (with access control for sequential courses)
export async function getLessonById(lessonId: string) {
  const supabase = await createClient();

  // Step 1: Fetch metadata only (no body/video/attachments, but include unlock_at and duration_seconds)
  const { data: lessonMeta, error } = await supabase
    .from("lessons")
    .select("id, module_id, title, position, unlock_at, duration_seconds, created_at, updated_at")
    .eq("id", lessonId)
    .single();

  if (error || !lessonMeta) {
    console.error("Error fetching lesson:", error);
    return null;
  }

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Check if user is admin
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  const isRealAdmin = userData?.role === "admin";

  // Check if preview mode is active
  const { isPreviewing } = await import("@/lib/preview/preview-helpers");
  const previewActive = await isPreviewing();

  // Check if lesson is completed by current user and get watch progress
  const { data: progress } = await supabase
    .from("lesson_progress")
    .select("*")
    .eq("lesson_id", lessonId)
    .single();

  // Step 2: Check access control
  let canAccess = false;

  if (isRealAdmin && !previewActive) {
    // Real admin not previewing - always has access
    canAccess = true;
  } else if (previewActive) {
    // Admin previewing - compute lock app-side, don't call RPC
    // First check time-based lock
    if (lessonMeta.unlock_at && new Date(lessonMeta.unlock_at) > new Date()) {
      canAccess = false;
    } else {
      // Get the course and check if sequential
      const { data: module } = await supabase
        .from("modules")
        .select("course_id, position")
        .eq("id", lessonMeta.module_id)
        .single();

      if (!module) {
        canAccess = false;
      } else {
        const { data: course } = await supabase
          .from("courses")
          .select("sequential")
          .eq("id", module.course_id)
          .single();

        if (!course || !course.sequential) {
          // Not sequential or course not found - allow access
          canAccess = true;
        } else {
          // Sequential course - check if all prior lessons are completed
          // Get all modules for this course
          const { data: allModules } = await supabase
            .from("modules")
            .select("id, position")
            .eq("course_id", module.course_id)
            .order("position", { ascending: true });

          if (!allModules) {
            canAccess = false;
          } else {
            // Get all lessons across all modules
            const { data: allLessons } = await supabase
              .from("lessons")
              .select("id, module_id, position")
              .in("module_id", allModules.map(m => m.id))
              .order("position", { ascending: true });

            if (!allLessons) {
              canAccess = false;
            } else {
              // Get all completed lesson IDs for this user (only completed_at set)
              const { data: completedProgress } = await supabase
                .from("lesson_progress")
                .select("lesson_id")
                .eq("user_id", user.id)
                .in("lesson_id", allLessons.map(l => l.id))
                .not("completed_at", "is", null);

              const completedLessonIds = new Set(
                completedProgress?.map(p => p.lesson_id) || []
              );

              // Build flat ordered list of lessons
              const orderedLessons: any[] = [];
              for (const mod of allModules) {
                const moduleLessons = allLessons
                  .filter(l => l.module_id === mod.id)
                  .sort((a, b) => a.position - b.position);
                orderedLessons.push(...moduleLessons.map(l => ({ ...l, modulePosition: mod.position })));
              }

              // Find current lesson and check if all prior lessons are completed
              const currentIndex = orderedLessons.findIndex(l => l.id === lessonId);
              if (currentIndex === -1) {
                canAccess = false;
              } else if (currentIndex === 0) {
                // First lesson - always accessible
                canAccess = true;
              } else {
                // Check if all prior lessons are completed
                const priorLessons = orderedLessons.slice(0, currentIndex);
                canAccess = priorLessons.every(l => completedLessonIds.has(l.id));
              }
            }
          }
        }
      }
    }
  } else {
    // Non-admin - use RPC
    const { data: canAccessData, error: accessError } = await supabase
      .rpc("can_access_lesson", { lesson_uuid: lessonId });

    if (accessError) {
      console.error("Error checking lesson access:", accessError);
    }

    canAccess = canAccessData === true;
  }

  const isLocked = !canAccess;

  // If lesson is locked, return metadata only without body/video/attachments
  if (isLocked) {
    return {
      id: lessonMeta.id,
      module_id: lessonMeta.module_id,
      title: lessonMeta.title,
      body: null,
      video_url: null,
      attachments: null,
      position: lessonMeta.position,
      unlock_at: lessonMeta.unlock_at,
      duration_seconds: lessonMeta.duration_seconds,
      is_completed: !!progress?.completed_at,
      watched_seconds: progress?.watched_seconds || 0,
      last_watched_at: progress?.last_watched_at || null,
      is_locked: true,
      created_at: lessonMeta.created_at,
      updated_at: lessonMeta.updated_at,
    };
  }

  // Step 3: Lesson is unlocked - fetch full content
  const { data: lessonFull, error: fullError } = await supabase
    .from("lessons")
    .select("body, video_url, attachments")
    .eq("id", lessonId)
    .single();

  if (fullError) {
    console.error("Error fetching lesson content:", fullError);
    return {
      ...lessonMeta,
      body: null,
      video_url: null,
      attachments: null,
      duration_seconds: lessonMeta.duration_seconds,
      is_completed: !!progress?.completed_at,
      watched_seconds: progress?.watched_seconds || 0,
      last_watched_at: progress?.last_watched_at || null,
      is_locked: false,
    };
  }

  return {
    ...lessonMeta,
    body: lessonFull.body,
    video_url: lessonFull.video_url,
    attachments: lessonFull.attachments,
    duration_seconds: lessonMeta.duration_seconds,
    is_completed: !!progress?.completed_at,
    watched_seconds: progress?.watched_seconds || 0,
    last_watched_at: progress?.last_watched_at || null,
    is_locked: false,
  };
}

// Member: Get next lesson in course
export async function getNextLesson(courseId: string, currentLessonId: string) {
  const supabase = await createClient();

  // Get all modules for this course
  const { data: modules } = await supabase
    .from("modules")
    .select("id, position")
    .eq("course_id", courseId)
    .order("position", { ascending: true });

  if (!modules) return null;

  // Get all lessons across all modules
  const { data: allLessons } = await supabase
    .from("lessons")
    .select("id, module_id, title, position")
    .in("module_id", modules.map(m => m.id))
    .order("position", { ascending: true });

  if (!allLessons) return null;

  // Build a flat ordered list of lessons
  const orderedLessons: any[] = [];
  for (const module of modules) {
    const moduleLessons = allLessons
      .filter(l => l.module_id === module.id)
      .sort((a, b) => a.position - b.position);
    orderedLessons.push(...moduleLessons);
  }

  // Find current lesson index
  const currentIndex = orderedLessons.findIndex(l => l.id === currentLessonId);
  if (currentIndex === -1 || currentIndex === orderedLessons.length - 1) {
    return null; // No next lesson
  }

  return orderedLessons[currentIndex + 1];
}

// Member: Get previous lesson in course
export async function getPreviousLesson(courseId: string, currentLessonId: string) {
  const supabase = await createClient();

  // Get all modules for this course
  const { data: modules } = await supabase
    .from("modules")
    .select("id, position")
    .eq("course_id", courseId)
    .order("position", { ascending: true });

  if (!modules) return null;

  // Get all lessons across all modules
  const { data: allLessons } = await supabase
    .from("lessons")
    .select("id, module_id, title, position")
    .in("module_id", modules.map(m => m.id))
    .order("position", { ascending: true });

  if (!allLessons) return null;

  // Build a flat ordered list of lessons
  const orderedLessons: any[] = [];
  for (const module of modules) {
    const moduleLessons = allLessons
      .filter(l => l.module_id === module.id)
      .sort((a, b) => a.position - b.position);
    orderedLessons.push(...moduleLessons);
  }

  // Find current lesson index
  const currentIndex = orderedLessons.findIndex(l => l.id === currentLessonId);
  if (currentIndex === -1 || currentIndex === 0) {
    return null; // No previous lesson
  }

  return orderedLessons[currentIndex - 1];
}

// Admin: Get user progress for a course
export async function getCourseUserProgress(courseId: string) {
  const adminClient = createAdminClient();

  // Get all enrollments for this course
  const { data: enrollments } = await adminClient
    .from("enrollments")
    .select(`
      user_id,
      enrolled_at,
      users (
        email,
        profile_name
      )
    `)
    .eq("course_id", courseId);

  if (!enrollments) return [];

  // Get total lesson count for this course
  const { data: modules } = await adminClient
    .from("modules")
    .select("id")
    .eq("course_id", courseId);

  const moduleIds = modules?.map(m => m.id) || [];
  
  let totalLessons = 0;
  if (moduleIds.length > 0) {
    const { count } = await adminClient
      .from("lessons")
      .select("id", { count: "exact", head: true })
      .in("module_id", moduleIds);
    totalLessons = count || 0;
  }

  // For each enrollment, get progress
  const progressData = await Promise.all(
    enrollments.map(async (enrollment: any) => {
      let completedLessons = 0;
      let lastLessonTitle = null;
      let lastLessonDate = null;

      if (moduleIds.length > 0) {
        // Get all lessons for this course
        const { data: lessons } = await adminClient
          .from("lessons")
          .select("id, title")
          .in("module_id", moduleIds);

        const lessonIds = lessons?.map(l => l.id) || [];

        if (lessonIds.length > 0) {
          // Get completed lessons count
          const { count } = await adminClient
            .from("lesson_progress")
            .select("lesson_id", { count: "exact", head: true })
            .eq("user_id", enrollment.user_id)
            .in("lesson_id", lessonIds);
          completedLessons = count || 0;

          // Get most recent completed lesson
          const { data: recentProgress } = await adminClient
            .from("lesson_progress")
            .select("lesson_id, completed_at")
            .eq("user_id", enrollment.user_id)
            .in("lesson_id", lessonIds)
            .order("completed_at", { ascending: false })
            .limit(1)
            .single();

          if (recentProgress && lessons) {
            const lastLesson = lessons.find(l => l.id === recentProgress.lesson_id);
            lastLessonTitle = lastLesson?.title || null;
            lastLessonDate = recentProgress.completed_at;
          }
        }
      }

      const percentComplete = totalLessons > 0 
        ? Math.round((completedLessons / totalLessons) * 100)
        : 0;

      return {
        user_id: enrollment.user_id,
        email: enrollment.users?.email || "Unknown",
        profile_name: enrollment.users?.profile_name || "Unknown",
        enrolled_at: enrollment.enrolled_at,
        completed_lessons: completedLessons,
        total_lessons: totalLessons,
        percent_complete: percentComplete,
        last_lesson_title: lastLessonTitle,
        last_lesson_date: lastLessonDate,
      };
    })
  );

  return progressData;
}
