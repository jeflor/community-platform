"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  assignCoachToStudent,
  unassignCoachFromStudent,
} from "@/lib/actions/coach";
import { StudentProgress } from "@/lib/actions/coach";
import { formatDistanceToNow } from "@/lib/utils/date";
import Link from "next/link";

interface CoachDashboardListProps {
  students: StudentProgress[];
  coaches: Array<{ id: string; full_name: string | null; email: string }>;
  isAdmin: boolean;
}

export function CoachDashboardList({
  students,
  coaches,
  isAdmin,
}: CoachDashboardListProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  const filteredStudents = students.filter((student) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    const name = student.student_name?.toLowerCase() || "";
    const email = student.student_email.toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  const handleAssignCoach = async (studentId: string, coachId: string) => {
    setLoading(studentId);
    const result = await assignCoachToStudent(coachId, studentId);
    setLoading(null);
    if (result.success) {
      router.refresh();
    } else {
      alert(result.error || "Failed to assign coach");
    }
  };

  const handleUnassignCoach = async (studentId: string) => {
    if (!confirm("Remove coach assignment?")) return;
    setLoading(studentId);
    const result = await unassignCoachFromStudent(studentId);
    setLoading(null);
    if (result.success) {
      router.refresh();
    } else {
      alert(result.error || "Failed to unassign coach");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {isAdmin ? "All Students" : "My Students"}
          </h1>
          <div className="text-sm text-gray-600">
            {filteredStudents.length} {filteredStudents.length === 1 ? "student" : "students"}
          </div>
        </div>
        {students.length > 0 && (
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students by name or email..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
      </div>

      {filteredStudents.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="max-w-md mx-auto">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            {search.trim() ? (
              <>
                <p className="text-gray-900 text-lg font-semibold mb-2">No matching students found</p>
                <p className="text-gray-600 text-sm">Try adjusting your search terms or clearing the search to see all students.</p>
              </>
            ) : (
              <>
                <p className="text-gray-900 text-lg font-semibold mb-2">
                  {isAdmin ? "No students yet" : "No students assigned"}
                </p>
                <p className="text-gray-600 text-sm mb-4">
                  {isAdmin 
                    ? "Students will appear here once clients enroll in courses or are assigned to coaches."
                    : "You don't have any students assigned yet. Contact an admin to get students assigned to you."}
                </p>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredStudents.map((student) => {
            const firstCourse = student.enrolled_courses[0];
            const lastLesson = student.last_lesson_completed?.lesson_title;
            
            return (
              <div
                key={student.student_id}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <Link
                  href={`/dashboard/coaches/${student.student_id}`}
                  className="block p-6"
                >
                  <div className="flex items-start gap-4">
                    {student.student_avatar_url ? (
                      <img
                        src={student.student_avatar_url}
                        alt={student.student_name || student.student_email}
                        className="w-12 h-12 rounded-full flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-lg font-semibold text-blue-600 flex-shrink-0">
                        {(student.student_name || student.student_email)[0].toUpperCase()}
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {student.student_name || "No name"}
                      </h3>
                      {isAdmin && (
                        <p className="text-sm text-gray-600 truncate">
                          {student.student_email}
                        </p>
                      )}
                      
                      {firstCourse && (
                        <div className="mt-2 text-sm text-gray-700">
                          {lastLesson && (
                            <div className="truncate">
                              Last lesson: <span className="font-medium">{lastLesson}</span>
                            </div>
                          )}
                          <div className="mt-1">
                            Progress: <span className="font-medium">{firstCourse.percent_complete}%</span> complete
                          </div>
                        </div>
                      )}
                      
                      {student.last_active && (
                        <div className="mt-2 text-xs text-gray-500">
                          Active {formatDistanceToNow(student.last_active)}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
                
                {isAdmin && (
                  <div className="px-6 pb-4 pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600 font-medium">
                        Assign Coach:
                      </label>
                      <select
                        value={student.has_coach ? "assigned" : ""}
                        onChange={(e) => {
                          if (e.target.value === "") {
                            handleUnassignCoach(student.student_id);
                          } else {
                            handleAssignCoach(student.student_id, e.target.value);
                          }
                        }}
                        disabled={loading === student.student_id}
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="">No coach</option>
                        {coaches.map((coach) => (
                          <option key={coach.id} value={coach.id}>
                            {coach.full_name || coach.email}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
