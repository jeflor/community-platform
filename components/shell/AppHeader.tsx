"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/actions/notifications";
import { searchContent, type SearchResult } from "@/lib/actions/search";

interface AppHeaderProps {
  user: {
    id: string;
    full_name: string;
    email: string;
    role: string;
    avatar_url: string | null;
  };
  unreadDMCount?: number;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
}

export function AppHeader({ user, unreadDMCount = 0 }: AppHeaderProps) {
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const router = useRouter();
  const displayName = user.full_name || user.email;
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const isAdmin = user.role === "admin";

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    const { notifications: notifs, unreadCount: count } =
      await getNotifications();
    setNotifications(notifs);
    setUnreadCount(count);
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read_at) {
      await markNotificationRead(notification.id);
      await loadNotifications();
    }
    setShowNotifications(false);
    if (notification.href) {
      router.push(notification.href);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    await loadNotifications();
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length >= 2) {
      const results = await searchContent(query);
      setSearchResults(results);
      setShowSearchResults(true);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      setShowSearchResults(false);
      setSearchQuery("");
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600)
      return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left: Page title - will be overridden by individual pages */}
        <div className="flex-1"></div>

        {/* Right: Search, DM, Bell, Settings, Avatar */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="hidden md:block relative">
            <form onSubmit={handleSearchSubmit}>
              <input
                type="search"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() =>
                  searchResults.length > 0 && setShowSearchResults(true)
                }
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
            </form>

            {showSearchResults && searchResults.length > 0 && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowSearchResults(false)}
                />
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-20 max-h-[32rem] overflow-hidden flex flex-col">
                  <div className="overflow-y-auto flex-1">
                    {searchResults.map((result) => (
                      <Link
                        key={`${result.type}-${result.id}`}
                        href={result.href}
                        onClick={() => {
                          setShowSearchResults(false);
                          setSearchQuery("");
                        }}
                        className="block px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition"
                      >
                        <div className="flex items-start gap-3">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded capitalize flex-shrink-0 ${
                            result.type === "user" ? "bg-blue-100 text-blue-700" :
                            result.type === "course" ? "bg-purple-100 text-purple-700" :
                            result.type === "event" ? "bg-green-100 text-green-700" :
                            result.type === "document" ? "bg-amber-100 text-amber-700" :
                            "bg-rose-100 text-rose-700"
                          }`}>
                            {result.type}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 line-clamp-1">
                              {result.title}
                            </p>
                            {result.description && (
                              <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                                {result.description}
                              </p>
                            )}
                            {result.metadata?.author && (
                              <p className="text-xs text-gray-400 mt-1">
                                by {result.metadata.author}
                              </p>
                            )}
                            {result.metadata?.date && (
                              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {result.metadata.date}
                              </p>
                            )}
                            {result.metadata?.location && (
                              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {result.metadata.location}
                              </p>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                  <div className="border-t border-gray-200 px-4 py-2 bg-gray-50">
                    <button
                      onClick={handleSearchSubmit}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View all results →
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* DM Icon */}
          <Link
            href="/dashboard/messages"
            className="p-2 hover:bg-gray-100 rounded-lg transition relative"
            title="Direct Messages"
          >
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            {unreadDMCount > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold text-white bg-red-600 rounded-full min-w-[18px]">
                {unreadDMCount > 99 ? "99+" : unreadDMCount}
              </span>
            )}
          </Link>

          {/* Bell (Notifications) */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 hover:bg-gray-100 rounded-lg transition relative"
              title="Notifications"
            >
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold text-white bg-red-600 rounded-full min-w-[18px]">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowNotifications(false)}
                />
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-20 max-h-96 overflow-hidden flex flex-col">
                  <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      Notifications
                      {unreadCount > 0 && (
                        <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
                          {unreadCount} new
                        </span>
                      )}
                    </h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="overflow-y-auto flex-1">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-12 text-center">
                        <svg
                          className="w-12 h-12 mx-auto text-gray-300 mb-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                          />
                        </svg>
                        <p className="text-sm font-medium text-gray-900 mb-1">
                          No notifications yet
                        </p>
                        <p className="text-xs text-gray-500">
                          We&apos;ll notify you about mentions, comments, messages, and upcoming events
                        </p>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <button
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors ${
                            !notification.read_at ? "bg-blue-50" : ""
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {!notification.read_at && (
                              <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5 flex-shrink-0"></div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">
                                {notification.title}
                              </p>
                              {notification.body && (
                                <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                                  {notification.body}
                                </p>
                              )}
                              <p className="text-xs text-gray-400 mt-1">
                                {formatRelativeTime(notification.created_at)}
                              </p>
                            </div>
                            {notification.href && (
                              <svg
                                className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  
                  {notifications.length > 0 && (
                    <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
                      <Link
                        href="/dashboard/notifications"
                        onClick={() => setShowNotifications(false)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline block text-center"
                      >
                        View all notifications
                      </Link>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Settings Gear */}
          <Link
            href={isAdmin ? "/dashboard/settings" : "/dashboard/account"}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            title="Settings"
          >
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </Link>

          {/* Avatar Menu */}
          <div className="relative">
            <button
              onClick={() => setShowAvatarMenu(!showAvatarMenu)}
              className="flex items-center gap-2 hover:bg-gray-100 rounded-lg p-2 transition"
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={displayName}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  {initials}
                </div>
              )}
            </button>

            {showAvatarMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowAvatarMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                  <div className="px-4 py-2 border-b border-gray-200">
                    <p className="font-medium text-gray-900">{displayName}</p>
                    <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                  </div>
                  <Link
                    href="/dashboard/account"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setShowAvatarMenu(false)}
                  >
                    Account Settings
                  </Link>
                  <form action="/api/auth/signout" method="post">
                    <button
                      type="submit"
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Sign Out
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
