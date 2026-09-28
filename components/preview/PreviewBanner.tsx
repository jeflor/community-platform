"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PreviewBannerProps {
  currentGroupSlugs: string[];
  availableGroups: Array<{ id: string; name: string; slug: string | null }>;
}

export function PreviewBanner({ currentGroupSlugs, availableGroups }: PreviewBannerProps) {
  const router = useRouter();
  const [selectedGroupSlug, setSelectedGroupSlug] = useState(currentGroupSlugs[0] || "");
  const [isExiting, setIsExiting] = useState(false);

  const handleGroupChange = async (groupSlug: string) => {
    setSelectedGroupSlug(groupSlug);
    
    try {
      const response = await fetch("/api/preview/set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupSlugs: [groupSlug] }),
      });

      if (response.ok) {
        router.refresh();
      } else {
        console.error("Failed to update preview");
      }
    } catch (error) {
      console.error("Error updating preview:", error);
    }
  };

  const handleExit = async () => {
    setIsExiting(true);
    
    try {
      const response = await fetch("/api/preview/clear", {
        method: "POST",
      });

      if (response.ok) {
        router.refresh();
      } else {
        console.error("Failed to exit preview");
        setIsExiting(false);
      }
    } catch (error) {
      console.error("Error exiting preview:", error);
      setIsExiting(false);
    }
  };

  // Filter groups that have slugs
  const selectableGroups = availableGroups.filter(g => g.slug);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white px-4 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <span className="font-semibold whitespace-nowrap">
            Previewing community as:
          </span>
          
          <select
            value={selectedGroupSlug}
            onChange={(e) => handleGroupChange(e.target.value)}
            className="px-3 py-1.5 bg-blue-700 text-white rounded border border-blue-500 focus:outline-none focus:ring-2 focus:ring-white"
          >
            {selectableGroups.map((group) => (
              <option key={group.id} value={group.slug!}>
                {group.name}
                {group.slug === "paid-students" ? " (includes Free Members)" : ""}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleExit}
          disabled={isExiting}
          className="px-4 py-1.5 bg-white text-blue-600 font-semibold rounded hover:bg-gray-100 transition disabled:opacity-50 whitespace-nowrap"
        >
          {isExiting ? "Exiting..." : "Exit Preview"}
        </button>
      </div>
    </div>
  );
}
