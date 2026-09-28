"use client";

import { useState, useRef, useEffect } from "react";
import { updateSidebarWidth } from "@/lib/actions/user";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Channel } from "@/lib/actions/channels";
import type { NavItem } from "@/lib/settings/get-nav-items";
import { ChannelsList } from "./ChannelsList";

interface SidebarProps {
  initialWidth: number;
  userRole: string;
  userName: string;
  channels: Channel[];
  siteName: string;
  navItems: NavItem[];
  isPreviewing: boolean;
}

export function Sidebar({ initialWidth, userRole, userName, channels, siteName, navItems, isPreviewing }: SidebarProps) {
  const [width, setWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = e.clientX;
      if (newWidth >= 200 && newWidth <= 480) {
        setWidth(newWidth);
      }
    };

    const handleMouseUp = async () => {
      if (isResizing) {
        setIsResizing(false);
        await updateSidebarWidth(width);
      }
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, width]);

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
    <div
      ref={sidebarRef}
      className="relative bg-gray-900 text-white flex-shrink-0 hidden md:block"
      style={{ width: `${width}px` }}
    >
      <div className="h-full flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-xl font-bold">{siteName}</h1>
          <p className="text-sm text-gray-400 mt-1 break-words">{userName}</p>
          <p className="text-xs text-gray-500 capitalize">{roleDisplay}</p>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
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

      <div
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition group"
        onMouseDown={() => setIsResizing(true)}
      >
        <div className="absolute inset-y-0 -right-1 w-3" />
      </div>
    </div>
  );
}
