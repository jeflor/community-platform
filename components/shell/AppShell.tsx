"use client";

import { useState, useRef, useEffect } from "react";
import { updateSidebarWidth } from "@/lib/actions/user";
import { touchPresence } from "@/lib/actions/users";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SidebarSection } from "@/lib/actions/sidebar";
import type { ActiveUser } from "@/lib/actions/users";
import type { ThemeSettings } from "@/lib/settings/get-theme";
import type { TopNavItem } from "@/lib/settings/get-top-nav";
import { EditableSidebarSectionsList } from "./EditableSidebarSectionsList";
import { AppHeader } from "./AppHeader";
import { PresenceRail } from "./PresenceRail";

interface AppShellProps {
  initialWidth: number;
  user: {
    id: string;
    full_name: string;
    email: string;
    role: string;
    avatar_url: string | null;
  };
  siteName: string;
  sections: SidebarSection[];
  activeUsers: ActiveUser[];
  theme: ThemeSettings;
  isPreviewing: boolean;
  unreadDMCount?: number;
  availableGroups?: Array<{ slug: string; name: string }>;
  topNavItems?: TopNavItem[];
  userGroupSlugs?: string[];
  children: React.ReactNode;
}

export function AppShell({
  initialWidth,
  user,
  siteName,
  sections,
  activeUsers,
  theme,
  isPreviewing,
  unreadDMCount = 0,
  availableGroups = [],
  topNavItems = [],
  userGroupSlugs = [],
  children,
}: AppShellProps) {
  const [width, setWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Apply theme CSS variables
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--primary-color", theme.primary_color);
    root.style.setProperty("--background-color", theme.background_color);
    root.style.setProperty("--gradient-start", theme.gradient_start);
    root.style.setProperty("--gradient-end", theme.gradient_end);
  }, [theme]);

  // Touch presence every 60 seconds to indicate user is online
  useEffect(() => {
    touchPresence();

    const interval = setInterval(() => {
      touchPresence();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

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

  const displayName = user.full_name || user.email;
  const isAdmin = user.role === "admin";

  // Filter top nav items based on user's role and groups
  const visibleTopNavItems = topNavItems.filter((item) => {
    // Admins not previewing see all enabled items
    if (isAdmin && !isPreviewing) {
      return item.enabled;
    }

    // For members and previewing admins
    if (!item.enabled) return false;

    // Empty group_slugs = visible to everyone
    if (item.group_slugs.length === 0) return true;

    // Check role-based access
    if (item.group_slugs.includes(user.role)) return true;

    // Check group membership
    return item.group_slugs.some((slug) => userGroupSlugs.includes(slug));
  });

  return (
    <div className="flex h-screen bg-white">
      {/* Desktop Sidebar */}
      <div
        ref={sidebarRef}
        className="relative bg-white border-r border-gray-200 flex-shrink-0 hidden md:flex flex-col"
        style={{
          width: `${width}px`,
          background: theme.sidebar_gradient
            ? `linear-gradient(180deg, ${theme.gradient_start} 0%, ${theme.gradient_end} 100%)`
            : theme.background_color,
        }}
      >
        {/* Logo and Community Name */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {theme.logo_url && (
              <img
                src={theme.logo_url}
                alt={siteName}
                className="w-12 h-12 rounded-full object-cover"
              />
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-gray-900 break-words">
                {siteName}
              </h1>
            </div>
          </div>
        </div>

        {/* Top Navigation (only visible items for members) */}
        {!isAdmin || isPreviewing ? (
          <nav className="p-4 border-b border-gray-200">
            <div className="space-y-1">
              {visibleTopNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition text-sm ${
                    pathname === item.href
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </nav>
        ) : null}

        {/* Sidebar Sections (includes top-nav editor for admins) */}
        <div className="flex-1 overflow-y-auto p-4">
          <EditableSidebarSectionsList
            initialSections={sections}
            isAdmin={isAdmin}
            isPreviewing={isPreviewing}
            availableGroups={availableGroups}
            topNavItems={topNavItems}
          />

          {/* Admin section at bottom */}
          {isAdmin && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Admin
              </h3>
              <div className="space-y-1">
                <Link
                  href="/dashboard/settings"
                  className={`block px-3 py-2 rounded-lg transition text-sm ${
                    pathname === "/dashboard/settings"
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Settings
                </Link>
                <Link
                  href="/dashboard/preview"
                  className={`block px-3 py-2 rounded-lg transition text-sm ${
                    pathname === "/dashboard/preview"
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Preview Mode
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Resize Handle */}
        <div
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition group"
          onMouseDown={() => setIsResizing(true)}
        >
          <div className="absolute inset-y-0 -right-1 w-3" />
        </div>
      </div>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Mobile Sidebar Drawer */}
      {isMobileMenuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="md:hidden fixed inset-y-0 left-0 w-80 bg-white shadow-xl z-50 overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h1 className="text-lg font-bold text-gray-900">{siteName}</h1>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <nav className="p-4">
              {visibleTopNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition text-sm ${
                    pathname === item.href
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
            <div className="p-4">
              <EditableSidebarSectionsList
                initialSections={sections}
                isAdmin={isAdmin}
                isPreviewing={isPreviewing}
                availableGroups={availableGroups}
                topNavItems={topNavItems}
              />
            </div>
          </div>
        </>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <AppHeader user={user} unreadDMCount={unreadDMCount} />
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 to-yellow-50 p-6">
            {children}
          </main>
          <PresenceRail users={activeUsers} />
        </div>
      </div>
    </div>
  );
}
