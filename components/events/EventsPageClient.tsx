"use client";

import { useState } from "react";
import { EventsList } from "./EventsList";
import { MonthCalendarView } from "./MonthCalendarView";
import { EventsAdminActions } from "./EventsAdminActions";
import Link from "next/link";

type ViewMode = "agenda" | "month";

interface EventsPageClientProps {
  showAdminActions: boolean;
}

export function EventsPageClient({ showAdminActions }: EventsPageClientProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("agenda");

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Events</h1>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => setViewMode("agenda")}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                viewMode === "agenda"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Agenda
            </button>
            <button
              onClick={() => setViewMode("month")}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                viewMode === "month"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Month
            </button>
          </div>
        </div>
        {showAdminActions && (
          <div className="flex flex-wrap gap-2">
            <EventsAdminActions />
            <Link
              href="/dashboard/admin/events"
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              Manage
            </Link>
          </div>
        )}
      </div>
      {viewMode === "agenda" ? <EventsList /> : <MonthCalendarView />}
    </div>
  );
}
