"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getUpcomingEvents,
  getPastEvents,
  type EventWithRsvpCount,
} from "@/lib/actions/events";

export function EventsList() {
  const [upcomingEvents, setUpcomingEvents] = useState<EventWithRsvpCount[]>(
    []
  );
  const [pastEvents, setPastEvents] = useState<EventWithRsvpCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setIsLoading(true);
    const [upcoming, past] = await Promise.all([
      getUpcomingEvents(),
      getPastEvents(),
    ]);
    setUpcomingEvents(upcoming);
    setPastEvents(past);
    setIsLoading(false);
  };

  const groupEventsByDate = (
    events: EventWithRsvpCount[]
  ): Map<string, EventWithRsvpCount[]> => {
    const grouped = new Map<string, EventWithRsvpCount[]>();
    events.forEach((event) => {
      const dateKey = new Date(event.starts_at).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(event);
    });
    return grouped;
  };

  const renderEventCard = (event: EventWithRsvpCount, isPast = false) => {
    const userRsvpStatus = event.user_rsvp?.status;
    const eventEnded = new Date(event.ends_at) < new Date();
    const isFull = event.capacity !== null && event.capacity > 0 && event.rsvp_count >= event.capacity;

    return (
      <Link
        key={event.id}
        href={`/dashboard/events/${event.id}`}
        className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden"
      >
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900 flex-1">
              {event.title}
            </h3>
            <div className="flex flex-col gap-1 items-end ml-2">
              {userRsvpStatus && (
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                    userRsvpStatus === "going"
                      ? "bg-green-100 text-green-700"
                      : userRsvpStatus === "waitlist"
                      ? "bg-yellow-100 text-yellow-700"
                      : userRsvpStatus === "not_going"
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {userRsvpStatus === "going"
                    ? "Going"
                    : userRsvpStatus === "waitlist"
                    ? "Waitlisted"
                    : userRsvpStatus === "not_going"
                    ? "Not going"
                    : "Maybe"}
                </span>
              )}
              {eventEnded && event.recording_url && (
                <span className="px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap bg-blue-100 text-blue-700">
                  📹 Recording
                </span>
              )}
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-3">
            {new Date(event.starts_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            -{" "}
            {new Date(event.ends_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>

          {event.description && (
            <p className="text-sm text-gray-700 line-clamp-2 mb-3">
              {event.description}
            </p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">
                {event.rsvp_count} {event.rsvp_count === 1 ? "person" : "people"}{" "}
                going
              </span>
              {!isPast && event.capacity !== null && event.capacity > 0 && (
                <span className={`text-xs font-medium ${isFull ? "text-yellow-600" : "text-gray-500"}`}>
                  {isFull ? "Full" : `${event.capacity - event.rsvp_count} spots left`}
                </span>
              )}
            </div>
            <span className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              View →
            </span>
          </div>
        </div>
      </Link>
    );
  };

  if (isLoading) {
    return <div className="text-gray-500">Loading events...</div>;
  }

  const upcomingGrouped = groupEventsByDate(upcomingEvents);
  const pastGrouped = groupEventsByDate(pastEvents);

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Upcoming Events</h2>
          {!showPast && pastEvents.length > 0 && (
            <button
              onClick={() => setShowPast(true)}
              className="text-blue-600 hover:text-blue-800 font-medium text-sm"
            >
              ← Past Events
            </button>
          )}
          {showPast && (
            <button
              onClick={() => setShowPast(false)}
              className="text-blue-600 hover:text-blue-800 font-medium text-sm"
            >
              Upcoming Events →
            </button>
          )}
        </div>

        {!showPast && upcomingEvents.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <div className="text-4xl mb-4">📅</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No upcoming events</h3>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              Check back later for new events, or browse past events to see recordings and what you missed.
            </p>
            {pastEvents.length > 0 && (
              <button
                onClick={() => setShowPast(true)}
                className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                View past events →
              </button>
            )}
          </div>
        ) : !showPast ? (
          <div className="space-y-6">
            {Array.from(upcomingGrouped.entries()).map(([dateKey, events]) => (
              <div key={dateKey}>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  {dateKey}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {events.map((event) => renderEventCard(event, false))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {showPast && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Past Events</h2>
          {pastEvents.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-4xl mb-4">🕒</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No past events</h3>
              <p className="text-gray-500 text-sm">
                Past events and their recordings will appear here after they end.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Array.from(pastGrouped.entries()).map(([dateKey, events]) => (
                <div key={dateKey}>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    {dateKey}
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {events.map((event) => renderEventCard(event, true))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
