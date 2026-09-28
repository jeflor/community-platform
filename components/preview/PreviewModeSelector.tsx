"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Group {
  id: string;
  name: string;
  slug: string | null;
}

interface PreviewModeSelectorProps {
  groups: Group[];
}

export function PreviewModeSelector({ groups }: PreviewModeSelectorProps) {
  const router = useRouter();
  const [selectedGroupSlug, setSelectedGroupSlug] = useState("");
  const [isStarting, setIsStarting] = useState(false);

  const selectableGroups = groups.filter(g => g.slug);

  const handleStartPreview = async () => {
    if (!selectedGroupSlug) {
      alert("Please select an access group");
      return;
    }

    setIsStarting(true);

    try {
      const response = await fetch("/api/preview/set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupSlugs: [selectedGroupSlug] }),
      });

      if (response.ok) {
        // Redirect to dashboard home to see the preview in action
        router.push("/dashboard");
        router.refresh();
      } else {
        alert("Failed to start preview mode");
        setIsStarting(false);
      }
    } catch (error) {
      console.error("Error starting preview:", error);
      alert("An error occurred");
      setIsStarting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="group-select" className="block text-sm font-medium text-gray-700 mb-2">
          Select Access Group
        </label>
        <select
          id="group-select"
          value={selectedGroupSlug}
          onChange={(e) => setSelectedGroupSlug(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- Choose a group --</option>
          {selectableGroups.map((group) => (
            <option key={group.id} value={group.slug!}>
              {group.name}
              {group.slug === "paid-students" ? " (includes Free Members)" : ""}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleStartPreview}
        disabled={!selectedGroupSlug || isStarting}
        className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isStarting ? "Starting Preview..." : "Start Preview"}
      </button>
    </div>
  );
}
