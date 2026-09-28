"use client";

import { useState, useEffect } from "react";
import { createEvent } from "@/lib/actions/events";
import { useRouter } from "next/navigation";

interface CreateEventModalProps {
  onClose: () => void;
}

export function CreateEventModal({ onClose }: CreateEventModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [formData, setFormData] = useState(() => {
    const now = new Date();
    const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    return {
      title: "",
      description: "",
      starts_at: nextHour.toISOString().slice(0, 16),
      ends_at: twoHoursLater.toISOString().slice(0, 16),
      zoom_url: "",
      cover_url: "",
      recording_url: "",
      locked_message: "",
      visibility: "show_locked" as "show_locked" | "hide",
      is_visible: true,
      capacity: "" as string | number,
      groupIds: [] as string[],
    };
  });

  useEffect(() => {
    fetch("/api/groups")
      .then((res) => res.json())
      .then((data) => setGroups(data.groups || []))
      .catch(console.error);
  }, []);

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

    setIsSubmitting(true);

    try {
      const result = await createEvent(formData);
      if (result.success) {
        router.refresh();
        onClose();
      } else {
        alert(result.error || "Failed to create event");
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Error creating event:", error);
      alert("Failed to create event");
      setIsSubmitting(false);
    }
  };

  const toggleGroup = (groupId: string) => {
    setFormData((prev) => ({
      ...prev,
      groupIds: prev.groupIds.includes(groupId)
        ? prev.groupIds.filter((id) => id !== groupId)
        : [...prev.groupIds, groupId],
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900">Create Event</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Start Time *
              </label>
              <input
                type="datetime-local"
                value={formData.starts_at}
                onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                End Time *
              </label>
              <input
                type="datetime-local"
                value={formData.ends_at}
                onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Zoom URL
            </label>
            <input
              type="url"
              value={formData.zoom_url}
              onChange={(e) => setFormData({ ...formData, zoom_url: e.target.value })}
              placeholder="https://zoom.us/j/..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Capacity
            </label>
            <input
              type="number"
              min="1"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              placeholder="Leave empty for unlimited"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum number of attendees. Leave empty for unlimited capacity. When full, additional RSVPs will be waitlisted.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Cover Image URL
            </label>
            <input
              type="url"
              value={formData.cover_url}
              onChange={(e) => setFormData({ ...formData, cover_url: e.target.value })}
              placeholder="https://example.com/cover.jpg"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
            />
            <p className="text-xs text-gray-500 mt-1">
              Recommended aspect ratio: 16:9 or 2:1 for wide banner display
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Recording URL (for past events)
            </label>
            <input
              type="url"
              value={formData.recording_url}
              onChange={(e) => setFormData({ ...formData, recording_url: e.target.value })}
              placeholder="https://example.com/recording.mp4"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
            />
            <p className="text-xs text-gray-500 mt-1">
              Add a link to the event recording after it has ended
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Visibility for non-members
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={formData.visibility === "show_locked"}
                  onChange={() => setFormData({ ...formData, visibility: "show_locked" })}
                  className="rounded-full"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Show preview (locked)</span>
                  <p className="text-xs text-gray-500">Users without access can see the event but can't RSVP</p>
                </div>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={formData.visibility === "hide"}
                  onChange={() => setFormData({ ...formData, visibility: "hide" })}
                  className="rounded-full"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Hide completely</span>
                  <p className="text-xs text-gray-500">Event is completely hidden from users without access</p>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Locked Message (shown if user lacks access)
            </label>
            <input
              type="text"
              value={formData.locked_message}
              onChange={(e) => setFormData({ ...formData, locked_message: e.target.value })}
              placeholder="This event is available to premium members."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
            />
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.is_visible}
                onChange={(e) => setFormData({ ...formData, is_visible: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Visible to assigned groups
              </span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Access Groups
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3">
              {groups.length === 0 ? (
                <p className="text-gray-500 text-sm">No groups available</p>
              ) : (
                groups.map((group) => (
                  <label key={group.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.groupIds.includes(group.id)}
                      onChange={() => toggleGroup(group.id)}
                      className="rounded"
                    />
                    <span className="text-sm">{group.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
