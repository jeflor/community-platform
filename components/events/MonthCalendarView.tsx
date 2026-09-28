"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getUpcomingEvents,
  getPastEvents,
  type EventWithRsvpCount,
} from "@/lib/actions/events";

export function MonthCalendarView() {
  const [allEvents, setAllEvents] = useState<EventWithRsvpCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setIsLoading(true);
    const [upcoming, past] = await Promise.all([
      getUpcomingEvents(),
      getPastEvents(),
    ]);
    setAllEvents([...upcoming, ...past]);
    setIsLoading(false);
  };

  const getMonthData = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    return {
      year,
      month,
      firstDay,
      lastDay,
      startingDayOfWeek,
      daysInMonth,
    };
  };

  const getEventsForDate = (date: Date): EventWithRsvpCount[] => {
    const dateStr = date.toISOString().split("T")[0];
    return allEvents.filter((event) => {
      const eventDateStr = new Date(event.starts_at).toISOString().split("T")[0];
      return eventDateStr === dateStr;
    });
  };

  const goToPreviousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
    );
  };

  const goToNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
    );
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  if (isLoading) {
    return <div className="text-gray-500">Loading events...</div>;
  }

  const monthData = getMonthData(currentDate);
  const monthName = currentDate.toLocaleDateString("en-US", { month: "long" });
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = [];
  for (let i = 0; i < monthData.startingDayOfWeek; i++) {
    days.push(null);
  }
  for (let day = 1; day <= monthData.daysInMonth; day++) {
    days.push(day);
  }

  const hasEvents = allEvents.length > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {monthName} {monthData.year}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousMonth}
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            ← Previous
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            Today
          </button>
          <button
            onClick={goToNextMonth}
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            Next →
          </button>
        </div>
      </div>

      {!hasEvents && (
        <div className="mb-6 text-center py-8 bg-blue-50 rounded-lg border-2 border-dashed border-blue-200">
          <div className="text-3xl mb-3">📅</div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">No events yet</h3>
          <p className="text-sm text-gray-600">
            Events will appear on the calendar once they're scheduled.
          </p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="grid grid-cols-7 bg-gray-50 border-b">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="py-3 text-center text-sm font-semibold text-gray-700"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            if (day === null) {
              return (
                <div
                  key={`empty-${index}`}
                  className="min-h-[120px] bg-gray-50 border-b border-r border-gray-200"
                />
              );
            }

            const date = new Date(
              monthData.year,
              monthData.month,
              day
            );
            date.setHours(0, 0, 0, 0);
            const eventsForDay = getEventsForDate(date);
            const isToday = date.getTime() === today.getTime();

            return (
              <div
                key={day}
                className="min-h-[120px] border-b border-r border-gray-200 p-2 bg-white hover:bg-gray-50 transition"
              >
                <div
                  className={`text-sm font-semibold mb-1 ${
                    isToday
                      ? "inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white"
                      : "text-gray-900"
                  }`}
                >
                  {day}
                </div>
                <div className="space-y-1">
                  {eventsForDay.map((event) => {
                    const userRsvpStatus = event.user_rsvp?.status;
                    return (
                      <Link
                        key={event.id}
                        href={`/dashboard/events/${event.id}`}
                        className="block text-xs p-1.5 rounded bg-blue-50 hover:bg-blue-100 transition truncate"
                      >
                        <div className="flex items-center gap-1">
                          {userRsvpStatus && (
                            <span
                              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                userRsvpStatus === "going"
                                  ? "bg-green-500"
                                  : userRsvpStatus === "not_going"
                                  ? "bg-red-500"
                                  : "bg-yellow-500"
                              }`}
                            />
                          )}
                          <span className="text-blue-900 font-medium truncate">
                            {new Date(event.starts_at).toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                            })}{" "}
                            {event.title}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500" />
          <span>Going</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-yellow-500" />
          <span>Maybe</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          <span>Not going</span>
        </div>
      </div>
    </div>
  );
}
