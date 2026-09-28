import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getStudentInfo,
  getStudentDetailedProgress,
  getStudentGroups,
} from "@/lib/actions/coach";
import { StudentProgressDetail } from "@/components/coach/StudentProgressDetail";
import { getOrCreateThreadForClient } from "@/lib/actions/dm";
import { isPreviewing } from "@/lib/preview/preview-helpers";
import { getCoachNotes } from "@/lib/actions/coach-notes";
import { CoachNotes } from "@/components/coach/CoachNotes";
import Link from "next/link";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  
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

  // Only admins and coaches can access this page (real role, not preview)
  const previewActive = await isPreviewing();
  if (userData.role !== "admin" && userData.role !== "coach") {
    redirect("/dashboard");
  }

  // If previewing as group, still require real admin/coach role
  if (previewActive && userData.role !== "admin" && userData.role !== "coach") {
    redirect("/dashboard");
  }
  const studentInfo = await getStudentInfo(studentId);

  if (!studentInfo) {
    redirect("/dashboard/coaches");
  }

  const detailedProgress = await getStudentDetailedProgress(studentId);
  const studentGroups = await getStudentGroups(studentId);

  // Get DM thread for this student
  const dmResult = await getOrCreateThreadForClient(studentId);
  const dmThreadId = dmResult.success ? dmResult.threadId : null;

  // Get coach notes (only if not previewing)
  const coachNotes = previewActive ? [] : await getCoachNotes(studentId);
  const isAdmin = userData.role === "admin";

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <Link
          href="/dashboard/coaches"
          className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Students
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-start gap-4">
              {studentInfo.student_avatar_url ? (
                <img
                  src={studentInfo.student_avatar_url}
                  alt={studentInfo.student_name || studentInfo.student_email}
                  className="w-16 h-16 rounded-full flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-semibold text-blue-600 flex-shrink-0">
                  {(studentInfo.student_name || studentInfo.student_email)[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                  {studentInfo.student_name || "No name"}
                </h1>
                {isAdmin && (
                  <p className="text-gray-600 mb-2">{studentInfo.student_email}</p>
                )}
                {studentGroups.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {studentGroups.map((group) => (
                      <span
                        key={group}
                        className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded"
                      >
                        {group}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {dmThreadId ? (
              <Link
                href={`/dashboard/messages/${dmThreadId}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                Message
              </Link>
            ) : (
              <Link
                href="/dashboard/messages"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                Messages
              </Link>
            )}
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Enrolled Courses</div>
              <div className="text-2xl font-bold text-gray-900">
                {studentInfo.enrolled_courses.length}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Average Progress</div>
              <div className="text-2xl font-bold text-gray-900">
                {studentInfo.enrolled_courses.length > 0
                  ? Math.round(
                      studentInfo.enrolled_courses.reduce(
                        (sum, c) => sum + c.percent_complete,
                        0
                      ) / studentInfo.enrolled_courses.length
                    )
                  : 0}
                %
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Last Active</div>
              <div className="text-lg font-bold text-gray-900">
                {studentInfo.last_active
                  ? new Date(studentInfo.last_active).toLocaleDateString()
                  : "Never"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <StudentProgressDetail
        studentName={studentInfo.student_name || "Student"}
        studentEmail={studentInfo.student_email}
        courseProgress={detailedProgress}
      />

      {!previewActive && (
        <CoachNotes
          studentId={studentId}
          initialNotes={coachNotes}
          currentUserId={user.id}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
