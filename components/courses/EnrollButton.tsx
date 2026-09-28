"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { enrollInCourse } from "@/lib/actions/courses";

interface EnrollButtonProps {
  courseId: string;
}

export function EnrollButton({ courseId }: EnrollButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEnroll = async () => {
    setLoading(true);
    setError(null);

    try {
      await enrollInCourse(courseId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to enroll");
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleEnroll}
        disabled={loading}
        className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
      >
        {loading ? "Enrolling..." : "Enroll in Course"}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
