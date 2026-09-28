import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAssignedStudents, getAllCoaches } from "@/lib/actions/coach";
import { CoachDashboardList } from "@/components/coach/CoachDashboardList";

export default async function CoachesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Get user role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userData) {
    redirect("/auth/login");
  }

  // Only admins and coaches can access this page
  if (userData.role !== "admin" && userData.role !== "coach") {
    redirect("/dashboard");
  }

  const isAdmin = userData.role === "admin";
  const students = await getAssignedStudents();
  const coaches = isAdmin ? await getAllCoaches() : [];

  return (
    <div>
      <CoachDashboardList
        students={students}
        coaches={coaches}
        isAdmin={isAdmin}
      />
    </div>
  );
}
