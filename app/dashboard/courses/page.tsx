import { requireAdmin } from "@/lib/auth/require-admin";
import { CoursesManager } from "@/components/admin/CoursesManager";
import { getAllCourses } from "@/lib/actions/courses";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function CoursesPage() {
  await requireAdmin();

  const courses = await getAllCourses();

  // Get all groups for the form
  const adminClient = createAdminClient();
  const { data: allGroups } = await adminClient
    .from("access_groups")
    .select("id, name")
    .order("name", { ascending: true });

  return (
    <div className="p-8">
      <CoursesManager initialCourses={courses} allGroups={allGroups || []} />
    </div>
  );
}
