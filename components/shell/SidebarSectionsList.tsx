"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SidebarSection } from "@/lib/actions/sidebar";

interface SidebarSectionsListProps {
  sections: SidebarSection[];
}

export function SidebarSectionsList({ sections }: SidebarSectionsListProps) {
  const pathname = usePathname();
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    () => {
      // Initialize collapsed state from localStorage or defaults
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("collapsedSections");
        if (saved) {
          try {
            return new Set(JSON.parse(saved));
          } catch {
            // Fall back to defaults
          }
        }
      }
      return new Set(
        sections.filter((s) => s.collapsed_default).map((s) => s.id)
      );
    }
  );

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      // Save to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("collapsedSections", JSON.stringify([...next]));
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {sections.map((section) => {
        const isCollapsed = collapsedSections.has(section.id);
        return (
          <div key={section.id}>
            <button
              onClick={() => toggleSection(section.id)}
              className="flex items-center gap-2 w-full text-left mb-2"
            >
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform ${
                  isCollapsed ? "-rotate-90" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {section.name}
              </h3>
            </button>
            {!isCollapsed && (
              <div className="space-y-1">
                {section.items.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition text-sm break-words ${
                      pathname === item.href
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {item.icon && <span className="text-base shrink-0">{item.icon}</span>}
                    <span className="break-words">{item.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
