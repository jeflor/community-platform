"use client";

import { useEffect, useState } from "react";
import {
  getAllEventsWithGroups,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventRsvps,
  exportEventAttendees,
  type EventWithGroups,
  type EventRsvpWithUser,
} from "@/lib/actions/events";

interface Group {
  id: string;
  name: string;
}

export function EventsManager() {
  const [events, setEvents] = useState<EventWithGroups[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState<EventWithGroups | null>(
    null
  );
  const [isCreating, setIsCreating] = useState(false);
  const [viewingRsvps, setViewingRsvps] = useState<string | null>(null);
  const [rsvps, setRsvps] = useState<EventRsvpWithUser[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    starts_at: "",
    ends_at: "",
    zoom_url: "",
    cover_url: "",
    recording_url: "",
    locked_message: "",
    is_visible: true,
    capacity: "" as string | number,
    groupIds: [] as string[],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [eventsData, groupsData] = await Promise.all([
      getAllEventsWithGroups(),
      fetchGroups(),
    ]);
    setEvents(eventsData);
    setGroups(groupsData);
    setIsLoading(false);
  };

  const fetchGroups = async (): Promise<Group[]> => {
    try {
      const response = await fetch("/api/groups");
      if (!response.ok) return [];
      const data = await response.json();
      return data.groups || [];
    } catch {
      return [];
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingEvent(null);
    const now = new Date();
    const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    setFormData({
      title: "",
      description: "",
      starts_at: nextHour.toISOString().slice(0, 16),
      ends_at: twoHoursLater.toISOString().slice(0, 16),
      zoom_url: "",
      cover_url: "",
      recording_url: "",
      locked_message: "",
      is_visible: true,
      capacity: "",
      groupIds: [],
    });
  };

  const handleEdit = (event: EventWithGroups) => {
    setIsCreating(false);
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || "",
      starts_at: new Date(event.starts_at).toISOString().slice(0, 16),
      ends_at: new Date(event.ends_at).toISOString().slice(0, 16),
      zoom_url: event.zoom_url || "",
      cover_url: event.cover_url || "",
      recording_url: event.recording_url || "",
      locked_message: event.locked_message || "",
      is_visible: event.is_visible,
      capacity: event.capacity || "",
      groupIds: event.event_groups.map((eg) => eg.group_id),
    });
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingEvent(null);
    setFormData({
      title: "",
      description: "",
      starts_at: "",
      ends_at: "",
      zoom_url: "",
      cover_url: "",
      recording_url: "",
      locked_message: "",
      is_visible: true,
      capacity: "",
      groupIds: [],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert("Title is required");
      return;
    }

    if (!formData.starts_at || !formData.ends_at) {
      alert("Start and end times are required");
      return;
    }

    if (new Date(formData.ends_at) <= new Date(formData.starts_at)) {
      alert("End time must be after start time");
      return;
    }

    let result;
    if (isCreating) {
      result = await createEvent(formData);
    } else if (editingEvent) {
      result = await updateEvent(editingEvent.id, formData);
    }

    if (result?.success) {
      await loadData();
      handleCancel();
    } else {
      alert(result?.error || "Failed to save event");
    }
  };

  const handleDelete = async (eventId: string, eventTitle: string) => {
    if (
      !confirm(
        `Are you sure you want to delete the event "${eventTitle}"? This will delete all RSVPs.`
      )
    ) {
      return;
    }

    const result = await deleteEvent(eventId);
    if (result.success) {
      await loadData();
    } else {
      alert(result.error || "Failed to delete event");
    }
  };

  const handleViewRsvps = async (eventId: string) => {
    setViewingRsvps(eventId);
    const rsvpsData = await getEventRsvps(eventId);
    setRsvps(rsvpsData);
  };

  const handleDownloadAttendees = async (eventId: string) => {
    setIsExporting(true);
    try {
      const result = await exportEventAttendees(eventId);
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

  const toggleGroupSelection = (groupId: string) => {
    setFormData((prev) => ({
      ...prev,
      groupIds: prev.groupIds.includes(groupId)
        ? prev.groupIds.filter((id) => id !== groupId)
        : [...prev.groupIds, groupId],
    }));
  };

  if (isLoading) {
    return <div className="text-gray-500">Loading events...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-gray-600">
          Manage events and their access groups. Users can only see events if
          they belong to at least one assigned group.
        </p>
        {!isCreating && !editingEvent && (
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Event
          </button>
        )}
      </div>

      {(isCreating || editingEvent) && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">
            {isCreating ? "Create New Event" : "Edit Event"}
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time *
                </label>
                <input
                  type="datetime-local"
                  value={formData.starts_at}
                  onChange={(e) =>
                    setFormData({ ...formData, starts_at: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time *
                </label>
                <input
                  type="datetime-local"
                  value={formData.ends_at}
                  onChange={(e) =>
                    setFormData({ ...formData, ends_at: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zoom URL
              </label>
              <input
                type="url"
                value={formData.zoom_url}
                onChange={(e) =>
                  setFormData({ ...formData, zoom_url: e.target.value })
                }
                placeholder="https://zoom.us/j/..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capacity
              </label>
              <input
                type="number"
                min="1"
                value={formData.capacity}
                onChange={(e) =>
                  setFormData({ ...formData, capacity: e.target.value })
                }
                placeholder="Leave empty for unlimited"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum number of attendees. Leave empty for unlimited capacity. When full, additional RSVPs will be waitlisted.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cover Image URL
              </label>
              <input
                type="url"
                value={formData.cover_url}
                onChange={(e) =>
                  setFormData({ ...formData, cover_url: e.target.value })
                }
                placeholder="https://example.com/cover.jpg"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">
                Recommended aspect ratio: 16:9 or 2:1 for wide banner display
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recording URL (for past events)
              </label>
              <input
                type="url"
                value={formData.recording_url}
                onChange={(e) =>
                  setFormData({ ...formData, recording_url: e.target.value })
                }
                placeholder="https://example.com/recording.mp4"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">
                Add a link to the event recording after it has ended
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Locked Message (shown if user lacks access)
              </label>
              <input
                type="text"
                value={formData.locked_message}
                onChange={(e) =>
                  setFormData({ ...formData, locked_message: e.target.value })
                }
                placeholder="This event is available to premium members."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.is_visible}
                  onChange={(e) =>
                    setFormData({ ...formData, is_visible: e.target.checked })
                  }
                  className="rounded"
                />
                <span className="text-sm font-medium text-gray-700">
                  Visible to assigned groups
                </span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Access Groups
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3">
                {groups.length === 0 ? (
                  <p className="text-gray-500 text-sm">No groups available</p>
                ) : (
                  groups.map((group) => (
                    <label
                      key={group.id}
                      className="flex items-center space-x-2"
                    >
                      <input
                        type="checkbox"
                        checked={formData.groupIds.includes(group.id)}
                        onChange={() => toggleGroupSelection(group.id)}
                        className="rounded"
                      />
                      <span className="text-sm">{group.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {isCreating ? "Create" : "Save"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {viewingRsvps && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">RSVPs</h3>
            <div className="flex gap-2">
              <button
                onClick={() => handleDownloadAttendees(viewingRsvps)}
                disabled={isExporting}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                {isExporting ? "Downloading..." : "Download CSV"}
              </button>
              <button
                onClick={() => setViewingRsvps(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>
          </div>
          {rsvps.length === 0 ? (
            <p className="text-gray-500">No RSVPs yet</p>
          ) : (
            <div className="space-y-2">
              {rsvps.map((rsvp) => (
                <div
                  key={rsvp.user_id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {rsvp.user.full_name || rsvp.user.email}
                    </p>
                    <p className="text-sm text-gray-500">{rsvp.user.email}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      rsvp.status === "going"
                        ? "bg-green-100 text-green-700"
                        : rsvp.status === "not_going"
                        ? "bg-red-100 text-red-700"
                        : rsvp.status === "waitlist"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {rsvp.status === "not_going" ? "not going" : rsvp.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Event
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date/Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Groups
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {events.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  No events yet. Create your first event!
                </td>
              </tr>
            ) : (
              events.map((event) => (
                <tr key={event.id}>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{event.title}</p>
                      {event.zoom_url && (
                        <p className="text-xs text-gray-500">
                          Has Zoom link
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    <div>
                      <p>
                        {new Date(event.starts_at).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-500">
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
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {event.event_groups.length === 0 ? (
                      <span className="text-red-500">No groups</span>
                    ) : (
                      <span>{event.event_groups.length} group(s)</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        event.is_visible
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {event.is_visible ? "Visible" : "Hidden"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm space-x-2">
                    <button
                      onClick={() => handleViewRsvps(event.id)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      RSVPs
                    </button>
                    <button
                      onClick={() => handleEdit(event)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(event.id, event.title)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
