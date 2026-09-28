"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Channel } from "@/lib/actions/channels";
import type { NavItem } from "@/lib/settings/get-nav-items";
import { ChannelsList } from "./ChannelsList";

interface MobileSidebarProps {
  userRole: string;
  userName: string;
  channels: Channel[];
  siteName: string;
  navItems: NavItem[];
  isPreviewing: boolean;
}

export function MobileSidebar({ userRole, userName, channels, siteName, navItems, isPreviewing }: MobileSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Admin-only navigation items
  // Always shown for admins (even when previewing, so they can access Settings/Exit)
  const adminNavItems = userRole === "admin" ? [
    { href: "/dashboard/members", label: "Members" },
    { href: "/dashboard/groups", label: "Groups" },
    { href: "/dashboard/products", label: "Products" },
    { href: "/dashboard/channels", label: "Channels" },
    { href: "/dashboard/courses", label: "Admin: Courses" },
    { href: "/dashboard/admin/events", label: "Manage Events" },
    { href: "/dashboard/preview", label: "Preview Mode" },
    { href: "/dashboard/settings", label: "Settings" },
  ] : [];
  
  // Add preview indicator to role display
  const roleDisplay = isPreviewing ? `${userRole} (Previewing)` : userRole;

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-gray-900 text-white rounded-lg"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="md:hidden fixed top-0 left-0 h-full w-64 bg-gray-900 text-white z-50 flex flex-col">
            <div className="p-6 border-b border-gray-700">
              <h1 className="text-xl font-bold">{siteName}</h1>
              <p className="text-sm text-gray-400 mt-1 break-words">
                {userName}
              </p>
              <p className="text-xs text-gray-500 capitalize">{roleDisplay}</p>
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              {navItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`block px-4 py-2 rounded-lg transition ${
                    pathname === item.href
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:bg-gray-800"
                  }`}
                >
                  {item.label}
                </Link>
              ))}

              {adminNavItems.length > 0 && (
                <div className="pt-4 mt-4 border-t border-gray-700">
                  <p className="px-4 py-2 text-xs text-gray-500 uppercase">Admin</p>
                  {adminNavItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`block px-4 py-2 rounded-lg transition ${
                        pathname === item.href
                          ? "bg-blue-600 text-white"
                          : "text-gray-300 hover:bg-gray-800"
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}

              <div className="pt-4 mt-4 border-t border-gray-700">
                <ChannelsList channels={channels} />
              </div>
            </nav>

            <div className="p-4 border-t border-gray-700">
              <form action="/api/auth/signout" method="post">
                <button
                  type="submit"
                  className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-800 rounded-lg transition"
                >
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  );
}
