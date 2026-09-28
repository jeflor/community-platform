"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface ProfileNudgeProps {
  showNudge: boolean;
}

export function ProfileNudge({ showNudge }: ProfileNudgeProps) {
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load dismissed state from sessionStorage
    const isDismissed = sessionStorage.getItem("profile_nudge_dismissed");
    if (isDismissed === "true") {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("profile_nudge_dismissed", "true");
  };

  if (!mounted || !showNudge || dismissed) return null;

  return (
    <div className="bg-blue-50 border-b border-blue-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-3 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <Link href="/dashboard/account" className="group block">
              <h3 className="text-sm font-semibold text-blue-900 group-hover:text-blue-700 transition">
                Complete your profile
              </h3>
              <p className="text-sm text-blue-800 mt-0.5">
                Add your photo and a short bio so people know who you are.
              </p>
            </Link>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-blue-600 hover:text-blue-800 transition p-1"
            aria-label="Dismiss banner"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
