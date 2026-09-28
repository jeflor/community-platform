"use client";

import Link from "next/link";
import type { ActiveUser } from "@/lib/actions/users";

interface PresenceRailProps {
  users: ActiveUser[];
}

export function PresenceRail({ users }: PresenceRailProps) {
  return (
    <div className="hidden xl:block w-20 bg-white border-l border-gray-200 p-4 overflow-y-auto">
      {users.length === 0 ? (
        <div className="text-center text-xs text-gray-400 mt-4">
          <div className="mb-2">👤</div>
          <div>No one else is here.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => {
            const displayName = user.full_name || "Member";
            const initials = displayName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);

            return (
              <Link
                key={user.id}
                href={`/dashboard/members/${user.id}`}
                className="relative group block"
                title={displayName}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 text-white rounded-full flex items-center justify-center text-xs font-medium shadow-sm cursor-pointer hover:shadow-md transition">
                  {initials}
                </div>
                <div className="absolute left-0 bottom-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                {/* Tooltip */}
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
                  {displayName}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
