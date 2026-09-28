"use client";

import { useState } from "react";
import { DMThread } from "@/lib/actions/dm";
import { formatDistanceToNow } from "@/lib/utils/date";
import Link from "next/link";

interface DMInboxListProps {
  threads: DMThread[];
  currentThreadId?: string;
  isTeamMember: boolean;
}

export function DMInboxList({
  threads,
  currentThreadId,
  isTeamMember,
}: DMInboxListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredThreads = threads.filter((thread) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const name = thread.client?.full_name?.toLowerCase() || "";
    const email = thread.client?.email?.toLowerCase() || "";
    return name.includes(query) || email.includes(query);
  });

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-3">Direct Messages</h2>
        {isTeamMember && threads.length > 0 && (
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 placeholder:text-gray-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredThreads.length === 0 ? (
          <div className="p-6 text-center">
            {searchQuery.trim() ? (
              <div className="text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-sm font-medium text-gray-700">No matching conversations</p>
                <p className="text-xs text-gray-500 mt-1">Try a different search term</p>
              </div>
            ) : (
              <div className="text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-sm font-medium text-gray-700">No conversations yet</p>
                <p className="text-xs text-gray-500 mt-1">
                  {isTeamMember 
                    ? "Messages will appear here when members reach out" 
                    : "Start a conversation to get help from the team"}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div>
            {filteredThreads.map((thread) => {
              const displayName =
                thread.client?.full_name ||
                thread.client?.email ||
                "Unknown User";
              const isActive = thread.id === currentThreadId;
              const hasUnread = (thread.unread_count || 0) > 0;

              return (
                <Link
                  key={thread.id}
                  href={`/dashboard/messages/${thread.id}`}
                  className={`block border-b border-gray-200 p-4 hover:bg-gray-50 transition relative ${
                    isActive ? "bg-blue-50 border-l-4 border-l-blue-600 pl-3.5" : ""
                  } ${hasUnread ? "bg-blue-50/30" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 relative">
                      {thread.client?.avatar_url ? (
                        <img
                          src={thread.client.avatar_url}
                          alt={displayName}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-sm font-semibold text-white shadow-sm">
                          {displayName[0].toUpperCase()}
                        </div>
                      )}
                      {hasUnread && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-white">
                            {(thread.unread_count || 0) > 9 ? "9+" : (thread.unread_count || 0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span
                          className={`font-semibold text-sm truncate ${
                            hasUnread ? "text-gray-900" : "text-gray-700"
                          }`}
                        >
                          {displayName}
                        </span>
                        {thread.last_message && (
                          <span className={`text-xs flex-shrink-0 ${hasUnread ? "text-gray-700 font-medium" : "text-gray-500"}`}>
                            {formatDistanceToNow(thread.last_message.created_at)}
                          </span>
                        )}
                      </div>
                      {thread.last_message ? (
                        <p
                          className={`text-sm truncate leading-snug ${
                            hasUnread ? "font-medium text-gray-900" : "text-gray-600"
                          }`}
                        >
                          {thread.last_message.body}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-400 italic">No messages yet</p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
