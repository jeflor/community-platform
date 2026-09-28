"use client";

import { useState } from "react";
import { CreateEventModal } from "./CreateEventModal";

export function EventsAdminActions() {
  const [showCreateEvent, setShowCreateEvent] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowCreateEvent(true)}
        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      >
        Create Event
      </button>

      {showCreateEvent && (
        <CreateEventModal onClose={() => setShowCreateEvent(false)} />
      )}
    </>
  );
}
