"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  upsertRsvp,
  deleteRsvp,
  exportEventAttendees,
  type EventWithRsvpCount,
} from "@/lib/actions/events";

interface EventDetailProps {
  event: EventWithRsvpCount & {
    host: { full_name: string | null; avatar_url: string | null } | null;
    recording_url?: string | null;
    attendees: Array<{ id: string; full_name: string | null; avatar_url: string | null }>;
    can_rsvp: boolean;
    capacity: number | null;
    spots_left: number | null;
    waitlist_count: number;
    user_waitlist_position: number | null;
  };
  profile: {
    id: string;
    role: "admin" | "coach" | "client";
    full_name: string | null;
    avatar_url: string | null;
  };
  showAdminActions?: boolean;
}

export function EventDetail({ event, profile, showAdminActions = false }: EventDetailProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const isAdmin = profile.role === "admin";
  const userRsvpStatus = event.user_rsvp?.status;
  const showZoomUrl = userRsvpStatus === "going" && event.zoom_url;
  const eventEnded = new Date(event.ends_at) < new Date();
  const isHosting = isAdmin || event.created_by === profile.id;
  const isFull = event.capacity !== null && (event.spots_left || 0) <= 0;
  const isWaitlisted = userRsvpStatus === "waitlist";

  const handleRsvp = async (status: "going" | "not_going" | "maybe" | "waitlist") => {
    setIsSubmitting(true);
    const result = await upsertRsvp(event.id, status);
    if (result.success) {
      // Show message if user was waitlisted
      if (result.actualStatus === "waitlist" && status === "going") {
        alert(`This event is at capacity. You've been added to the waitlist at position ${result.waitlistPosition}.`);
      }
      router.refresh();
    } else {
      alert(result.error || "Failed to update RSVP");
    }
    setIsSubmitting(false);
  };

  const handleRemoveRsvp = async () => {
    setIsSubmitting(true);
    const result = await deleteRsvp(event.id);
    if (result.success) {
      router.refresh();
    } else {
      alert(result.error || "Failed to remove RSVP");
    }
    setIsSubmitting(false);
  };

  const handleDownloadAttendees = async () => {
    setIsExporting(true);
    try {
      const result = await exportEventAttendees(event.id);
      if (result.success && result.csv && result.filename) {
        const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        alert(result.error || "Failed to export attendees");
      }
    } catch (error) {
      alert("Failed to export attendees");
    }
    setIsExporting(false);
  };

  const downloadICS = () => {
    const formatDate = (date: string) => {
      return new Date(date)
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, "");
    };

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Community Platform//Events//EN",
      "BEGIN:VEVENT",
      `UID:${event.id}@community.example.com`,
      `DTSTAMP:${formatDate(new Date().toISOString())}`,
      `DTSTART:${formatDate(event.starts_at)}`,
      `DTEND:${formatDate(event.ends_at)}`,
      `SUMMARY:${event.title}`,
      event.description
        ? `DESCRIPTION:${event.description.replace(/\n/g, "\\n")}`
        : "",
      showZoomUrl ? `URL:${event.zoom_url}` : "",
      "END:VEVENT",
      "END:VCALENDAR",
    ]
      .filter(Boolean)
      .join("\r\n");

    const blob = new Blob([icsContent], {
      type: "text/calendar;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${event.title.replace(/[^a-z0-9]/gi, "_")}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <nav className="flex items-center text-sm text-gray-500 px-4 py-4">
          <Link href="/dashboard/events" className="hover:text-gray-700">
            Events
          </Link>
          <span className="mx-2">&gt;</span>
          <span className="text-gray-900 truncate">{event.title}</span>
        </nav>

        {showAdminActions && (
          <div className="bg-white border-b border-gray-200 mx-4 mb-4 rounded-lg">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-medium text-gray-600">Admin View</span>
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadAttendees}
                  disabled={isExporting}
                  className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  {isExporting ? "Downloading..." : "Download attendees"}
                </button>
                <Link
                  href={`/dashboard/admin/events?edit=${event.id}`}
                  className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Edit Event
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm overflow-hidden mx-4 mb-8">
          {event.cover_url && (
            <div className="relative w-full h-48 sm:h-64 md:h-80">
              <img
                src={event.cover_url}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 break-words">
              {event.title}
            </h1>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 mb-6 text-sm sm:text-base">
              <div className="flex items-center text-gray-700">
                <span className="mr-2">📅</span>
                <span className="font-medium">{formatDate(event.starts_at)}</span>
              </div>
              <div className="flex items-center text-gray-600 sm:ml-0 ml-6">
                <span className="mr-2">🕐</span>
                <span>
                  {formatTime(event.starts_at)} - {formatTime(event.ends_at)}
                </span>
              </div>
            </div>

            {event.description && (
              <div className="mb-6">
                <p className="text-gray-700 text-base leading-relaxed whitespace-pre-wrap break-words">
                  {event.description}
                </p>
              </div>
            )}

            {eventEnded && event.recording_url && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-semibold text-blue-900 mb-3">
                  This event has ended
                </p>
                <a
                  href={event.recording_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  <span className="mr-2">📹</span>
                  Watch Recording
                </a>
              </div>
            )}

            {!eventEnded && event.zoom_url && (
              <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Zoom Meeting
                </p>
                {showZoomUrl ? (
                  <a
                    href={event.zoom_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                  >
                    <span className="mr-2">🔗</span>
                    Join Meeting
                  </a>
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    🔒 RSVP as &quot;Going&quot; to reveal the Zoom link
                  </p>
                )}
              </div>
            )}

            <div className="border-t border-gray-200 pt-6">
              {eventEnded ? (
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-sm text-gray-500">
                      <span className="font-medium text-gray-900">
                        {event.rsvp_count}
                      </span>{" "}
                      {event.rsvp_count === 1 ? "person" : "people"} attended
                    </p>
                  </div>
                </div>
              ) : isHosting ? (
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex flex-col gap-2">
                    <span className="inline-flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium w-fit">
                      <span className="mr-2">✓</span>
                      Hosting
                    </span>
                    {event.capacity !== null && (
                      <p className="text-sm text-gray-600">
                        Capacity: {event.rsvp_count} / {event.capacity} going
                        {event.waitlist_count > 0 && (
                          <span className="ml-2 text-yellow-600">
                            ({event.waitlist_count} on waitlist)
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={downloadICS}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                  >
                    📅 Add to Calendar
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {event.capacity !== null && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">
                          <span className="font-semibold text-gray-900">
                            {event.spots_left || 0}
                          </span>{" "}
                          {event.spots_left === 1 ? "spot" : "spots"} left
                        </span>
                        <span className="text-gray-500">
                          {event.rsvp_count} / {event.capacity} going
                        </span>
                      </div>
                      {event.waitlist_count > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {event.waitlist_count} {event.waitlist_count === 1 ? "person" : "people"} on waitlist
                        </p>
                      )}
                    </div>
                  )}

                  {isWaitlisted && event.user_waitlist_position && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-sm text-yellow-800">
                        <span className="font-semibold">You're on the waitlist</span>
                        {" "}(Position #{event.user_waitlist_position})
                      </p>
                      <p className="text-xs text-yellow-700 mt-1">
                        You'll be automatically moved to "Going" if a spot opens up
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      onClick={() => handleRsvp("going")}
                      disabled={isSubmitting}
                      className={`w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                        userRsvpStatus === "going"
                          ? "bg-green-600 text-white"
                          : userRsvpStatus === "waitlist"
                          ? "bg-yellow-600 text-white"
                          : "bg-white border-2 border-gray-300 text-gray-700 hover:border-green-600 hover:text-green-600"
                      }`}
                    >
                      {userRsvpStatus === "going" && <span className="mr-1">✓</span>}
                      {userRsvpStatus === "waitlist" && <span className="mr-1">⏱</span>}
                      {isFull && userRsvpStatus !== "going" && userRsvpStatus !== "waitlist" ? "Join Waitlist" : "Going"}
                    </button>
                    <button
                      onClick={() => handleRsvp("maybe")}
                      disabled={isSubmitting}
                      className={`w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                        userRsvpStatus === "maybe"
                          ? "bg-yellow-600 text-white"
                          : "bg-white border-2 border-gray-300 text-gray-700 hover:border-yellow-600 hover:text-yellow-600"
                      }`}
                    >
                      {userRsvpStatus === "maybe" && <span className="mr-1">✓</span>}
                      Maybe
                    </button>
                    <button
                      onClick={() => handleRsvp("not_going")}
                      disabled={isSubmitting}
                      className={`w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                        userRsvpStatus === "not_going"
                          ? "bg-gray-600 text-white"
                          : "bg-white border-2 border-gray-300 text-gray-700 hover:border-gray-600 hover:text-gray-700"
                      }`}
                    >
                      {userRsvpStatus === "not_going" && <span className="mr-1">✓</span>}
                      Not Going
                    </button>
                  </div>

                  {userRsvpStatus && (
                    <button
                      onClick={handleRemoveRsvp}
                      disabled={isSubmitting}
                      className="w-full px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 text-sm font-medium disabled:opacity-50"
                    >
                      Remove RSVP
                    </button>
                  )}

                  <div className="flex items-center justify-between pt-4">
                    <div className="flex items-center">
                      <div className="flex -space-x-2 mr-3">
                        {event.attendees.slice(0, 3).map((attendee) => (
                          <div
                            key={attendee.id}
                            className="relative"
                            title={attendee.full_name || "Attendee"}
                          >
                            {attendee.avatar_url ? (
                              <img
                                src={attendee.avatar_url}
                                alt={attendee.full_name || "Attendee"}
                                className="w-8 h-8 rounded-full border-2 border-white"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium border-2 border-white">
                                {attendee.full_name?.[0]?.toUpperCase() || "?"}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium text-gray-900">
                          {event.rsvp_count}
                        </span>{" "}
                        going
                      </p>
                    </div>
                    <button
                      onClick={downloadICS}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                    >
                      📅 Add to Calendar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {event.host && (
              <div className="border-t border-gray-200 mt-6 pt-6">
                <h3 className="text-sm font-semibold text-gray-600 mb-3">
                  Hosted by
                </h3>
                <div className="flex items-center">
                  {event.host.avatar_url ? (
                    <img
                      src={event.host.avatar_url}
                      alt={event.host.full_name || "Host"}
                      className="w-10 h-10 rounded-full mr-3"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium mr-3">
                      {event.host.full_name?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                  <p className="text-sm font-medium text-gray-900">
                    {event.host.full_name || "Unknown Host"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
