"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SidebarSection, SidebarItem } from "@/lib/actions/sidebar";
import type { TopNavItem } from "@/lib/settings/get-top-nav";
import {
  updateSidebarSection,
  deleteSidebarSection,
  createSidebarSection,
  updateSidebarItem,
  deleteSidebarItem,
  createSidebarItem,
  reorderSidebarSections,
  reorderSidebarItems,
  moveSidebarItem,
  getAllSidebarSections,
} from "@/lib/actions/sidebar";
import { updateTopNavItem, reorderTopNav } from "@/lib/actions/admin";
import { SimpleRichTextEditor } from "../documents/SimpleRichTextEditor";

interface EditableSidebarSectionsListProps {
  initialSections: SidebarSection[];
  isAdmin: boolean;
  isPreviewing: boolean;
  availableGroups?: Array<{ slug: string; name: string }>;
  topNavItems?: TopNavItem[];
}

type ContextMenu =
  | { type: "section"; sectionId: string; x: number; y: number }
  | { type: "item"; item: SidebarItem; sectionId: string; x: number; y: number }
  | null;

type EditModal =
  | { type: "editSectionName"; section: SidebarSection }
  | { type: "addSection" }
  | { type: "editItem"; item: SidebarItem; sectionId: string }
  | { type: "addItem"; sectionId: string }
  | null;

export function EditableSidebarSectionsList({
  initialSections,
  isAdmin,
  isPreviewing,
  availableGroups = [],
  topNavItems = [],
}: EditableSidebarSectionsListProps) {
  const pathname = usePathname();
  // For admins not previewing, we're always in edit mode (the reference platform style)
  const isEditMode = isAdmin && !isPreviewing;
  const [sections, setSections] = useState(initialSections);
  const [topNav, setTopNav] = useState<TopNavItem[]>(topNavItems);
  
  // Initialize with server-safe defaults (collapsed_default) to avoid hydration mismatch
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => {
    return new Set(initialSections.filter((s) => s.collapsed_default).map((s) => s.id));
  });

  // After mount, read localStorage and apply saved collapsed state
  useEffect(() => {
    const saved = localStorage.getItem("collapsedSections");
    if (saved) {
      try {
        setCollapsedSections(new Set(JSON.parse(saved)));
      } catch {
        // Keep defaults if parsing fails
      }
    }
  }, []);

  const [contextMenu, setContextMenu] = useState<ContextMenu>(null);
  const [editModal, setEditModal] = useState<EditModal>(null);
  const [topNavContextMenu, setTopNavContextMenu] = useState<{ key: string; x: number; y: number } | null>(null);
  const [editingTopNavItem, setEditingTopNavItem] = useState<TopNavItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const draggedSectionRef = useRef<string | null>(null);
  const draggedItemRef = useRef<{ sectionId: string; itemId: string } | null>(null);
  const draggedTopNavRef = useRef<string | null>(null);
  const isDraggingRef = useRef(false);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const refreshSections = async () => {
    try {
      const updated = await getAllSidebarSections();
      setSections(updated);
    } catch (error) {
      console.error("Failed to refresh sections:", error);
    }
  };

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("collapsedSections", JSON.stringify(Array.from(next)));
      }
      return next;
    });
  };

  // Close context menu on click outside
  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  // Section context menu handler
  const handleSectionContextMenu = (e: React.MouseEvent, section: SidebarSection) => {
    if (!isEditMode) return;
    e.preventDefault();
    setContextMenu({
      type: "section",
      sectionId: section.id,
      x: e.clientX,
      y: e.clientY,
    });
  };

  // Item context menu handler
  const handleItemContextMenu = (e: React.MouseEvent, item: SidebarItem, sectionId: string) => {
    if (!isEditMode) return;
    e.preventDefault();
    setContextMenu({
      type: "item",
      item,
      sectionId,
      x: e.clientX,
      y: e.clientY,
    });
  };

  // Section drag handlers
  const handleSectionDragStart = (e: React.DragEvent, sectionId: string) => {
    isDraggingRef.current = true;
    draggedSectionRef.current = sectionId;
  };

  const handleSectionDragOver = (e: React.DragEvent, targetSectionId: string) => {
    e.preventDefault();
    const draggedSection = draggedSectionRef.current;
    if (!draggedSection || draggedSection === targetSectionId) return;

    const draggedIdx = sections.findIndex((s) => s.id === draggedSection);
    const targetIdx = sections.findIndex((s) => s.id === targetSectionId);

    const newSections = [...sections];
    const [removed] = newSections.splice(draggedIdx, 1);
    newSections.splice(targetIdx, 0, removed);

    setSections(newSections);
  };

  const handleSectionDrop = async () => {
    if (!draggedSectionRef.current) return;

    setIsSaving(true);
    const result = await reorderSidebarSections(sections.map((s) => s.id));
    setIsSaving(false);

    if (result.success) {
      showMessage("success", "Sections reordered");
    } else {
      showMessage("error", result.error || "Failed to reorder sections");
      await refreshSections();
    }

    draggedSectionRef.current = null;
    isDraggingRef.current = false;
  };

  // Item drag handlers
  const handleItemDragStart = (e: React.DragEvent, sectionId: string, itemId: string) => {
    isDraggingRef.current = true;
    draggedItemRef.current = { sectionId, itemId };
  };

  const handleItemDragOver = (
    e: React.DragEvent,
    targetSectionId: string,
    targetItemId?: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const draggedItem = draggedItemRef.current;
    if (!draggedItem) return;

    const sourceSectionIdx = sections.findIndex((s) => s.id === draggedItem.sectionId);
    const targetSectionIdx = sections.findIndex((s) => s.id === targetSectionId);

    if (sourceSectionIdx === -1 || targetSectionIdx === -1) return;

    const newSections = [...sections];
    const sourceSection = { ...newSections[sourceSectionIdx] };
    const sourceItems = [...sourceSection.items];
    const draggedItemIdx = sourceItems.findIndex((i) => i.id === draggedItem.itemId);

    if (draggedItemIdx === -1) return;

    const [movedItem] = sourceItems.splice(draggedItemIdx, 1);

    // If moving to different section
    if (draggedItem.sectionId !== targetSectionId) {
      const targetSection = { ...newSections[targetSectionIdx] };
      const targetItems = [...targetSection.items];

      if (targetItemId) {
        const targetIdx = targetItems.findIndex((i) => i.id === targetItemId);
        targetItems.splice(targetIdx, 0, movedItem);
      } else {
        targetItems.push(movedItem);
      }

      newSections[sourceSectionIdx] = { ...sourceSection, items: sourceItems };
      newSections[targetSectionIdx] = { ...targetSection, items: targetItems };
    } else {
      // Same section reorder
      if (targetItemId) {
        const targetIdx = sourceItems.findIndex((i) => i.id === targetItemId);
        sourceItems.splice(targetIdx, 0, movedItem);
      } else {
        sourceItems.push(movedItem);
      }
      newSections[sourceSectionIdx] = { ...sourceSection, items: sourceItems };
    }

    setSections(newSections);
  };

  const handleItemDrop = async () => {
    if (!draggedItemRef.current) return;

    const { sectionId: oldSectionId, itemId } = draggedItemRef.current;

    // Find new section and position
    let newSectionId = oldSectionId;
    let newPosition = 0;

    for (const section of sections) {
      const itemIdx = section.items.findIndex((i) => i.id === itemId);
      if (itemIdx !== -1) {
        newSectionId = section.id;
        newPosition = itemIdx;
        break;
      }
    }

    setIsSaving(true);

    // If moved to different section
    if (newSectionId !== oldSectionId) {
      await moveSidebarItem(itemId, newSectionId, newPosition);

      // Reorder both sections
      const oldSection = sections.find((s) => s.id === oldSectionId);
      const newSection = sections.find((s) => s.id === newSectionId);

      if (oldSection && oldSection.items.length > 0) {
        await reorderSidebarItems(oldSection.items.map((i) => i.id));
      }
      if (newSection && newSection.items.length > 0) {
        await reorderSidebarItems(newSection.items.map((i) => i.id));
      }
    } else {
      // Just reorder within same section
      const section = sections.find((s) => s.id === newSectionId);
      if (section) {
        await reorderSidebarItems(section.items.map((i) => i.id));
      }
    }

    setIsSaving(false);
    showMessage("success", "Item moved");
    await refreshSections();

    draggedItemRef.current = null;
    isDraggingRef.current = false;
  };

  const handleUpdateSectionName = async (sectionId: string, name: string, groupSlugs: string[]) => {
    setIsSaving(true);
    const result = await updateSidebarSection(sectionId, { name, group_slugs: groupSlugs });
    setIsSaving(false);

    if (result.success) {
      showMessage("success", "Section updated");
      await refreshSections();
    } else {
      showMessage("error", result.error || "Failed to update section");
    }
    setEditModal(null);
  };

  const handleCreateSection = async (name: string, groupSlugs: string[]) => {
    setIsSaving(true);
    const result = await createSidebarSection({
      name,
      collapsed_default: false,
      group_slugs: groupSlugs,
      position: sections.length,
    });
    setIsSaving(false);

    if (result.success) {
      showMessage("success", "Section created");
      await refreshSections();
    } else {
      showMessage("error", result.error || "Failed to create section");
    }
    setEditModal(null);
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm("Delete this section and all its channels?")) return;

    setIsSaving(true);
    const result = await deleteSidebarSection(sectionId);
    setIsSaving(false);

    if (result.success) {
      showMessage("success", "Section deleted");
      await refreshSections();
    } else {
      showMessage("error", result.error || "Failed to delete section");
    }
  };

  const handleSaveItem = async (
    itemId: string | null,
    sectionId: string,
    data: {
      label: string;
      href: string;
      icon?: string;
      enabled: boolean;
      group_slugs: string[];
      channel_type?: string;
      read_only?: boolean;
      description?: string;
      banner_image?: string;
    }
  ) => {
    setIsSaving(true);

    if (itemId) {
      // Update existing
      const result = await updateSidebarItem(itemId, {
        ...data,
        icon: data.icon || null,
        banner_image: data.banner_image || null,
      });
      if (result.success) {
        showMessage("success", "Channel updated");
        await refreshSections();
      } else {
        showMessage("error", result.error || "Failed to update channel");
      }
    } else {
      // Create new
      const section = sections.find((s) => s.id === sectionId);
      const result = await createSidebarItem({
        section_id: sectionId,
        ...data,
        icon: data.icon,
        position: section?.items.length || 0,
      });
      if (result.success) {
        showMessage("success", "Channel created");
        await refreshSections();
      } else {
        showMessage("error", result.error || "Failed to create channel");
      }
    }

    setIsSaving(false);
    setEditModal(null);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Delete this channel?")) return;

    setIsSaving(true);
    const result = await deleteSidebarItem(itemId);
    setIsSaving(false);

    if (result.success) {
      showMessage("success", "Channel deleted");
      await refreshSections();
    } else {
      showMessage("error", result.error || "Failed to delete channel");
    }
  };

  // Top Nav handlers
  const handleUpdateTopNavItem = async (key: string, updates: { label?: string; enabled?: boolean; group_slugs?: string[] }) => {
    setIsSaving(true);
    const result = await updateTopNavItem(key, updates);
    setIsSaving(false);

    if (result.success) {
      showMessage("success", "Navigation item updated");
      setTopNav((prev) =>
        prev.map((item) => (item.key === key ? { ...item, ...updates } : item))
      );
      setEditingTopNavItem(null);
    } else {
      showMessage("error", result.error || "Failed to update navigation item");
    }
  };

  const handleTopNavDragStart = (e: React.DragEvent, key: string) => {
    isDraggingRef.current = true;
    draggedTopNavRef.current = key;
  };

  const handleTopNavDragOver = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    if (!draggedTopNavRef.current || draggedTopNavRef.current === targetKey) return;

    const draggedIdx = topNav.findIndex((item) => item.key === draggedTopNavRef.current);
    const targetIdx = topNav.findIndex((item) => item.key === targetKey);

    const newTopNav = [...topNav];
    const [removed] = newTopNav.splice(draggedIdx, 1);
    newTopNav.splice(targetIdx, 0, removed);

    setTopNav(newTopNav);
  };

  const handleTopNavDrop = async () => {
    if (!draggedTopNavRef.current) return;

    setIsSaving(true);
    const result = await reorderTopNav(topNav.map((item) => item.key));
    setIsSaving(false);

    if (result.success) {
      showMessage("success", "Navigation reordered");
    } else {
      showMessage("error", result.error || "Failed to reorder navigation");
    }

    draggedTopNavRef.current = null;
    isDraggingRef.current = false;
  };

  return (
    <>
      {/* Messages */}
      {message && (
        <div
          className={`mb-3 p-2 rounded text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Saving Indicator */}
      {isSaving && (
        <div className="mb-3 p-2 rounded text-sm bg-blue-50 text-blue-800 border border-blue-200">
          Saving...
        </div>
      )}

      {/* Top Navigation Editor (admin only) */}
      {isEditMode && topNav.length > 0 && (
        <div className="mb-6">
          <div className="space-y-1">
            {topNav.map((item) => (
              <div
                key={item.key}
                draggable={isEditMode}
                onDragStart={(e) => handleTopNavDragStart(e, item.key)}
                onDragOver={(e) => handleTopNavDragOver(e, item.key)}
                onDrop={handleTopNavDrop}
                className="group flex items-center gap-2"
              >
                <Link
                  href={item.href}
                  onClick={(e) => {
                    if (isDraggingRef.current) {
                      e.preventDefault();
                      isDraggingRef.current = false;
                    }
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg flex-1 text-sm ${
                    pathname === item.href
                      ? "bg-blue-50 text-blue-700"
                      : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span className="break-words flex-1">{item.label}</span>
                  {!item.enabled && (
                    <span className="text-xs bg-gray-300 text-gray-600 px-1 py-0.5 rounded">
                      Hidden
                    </span>
                  )}
                  {item.group_slugs.length > 0 && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-1 py-0.5 rounded">
                      Private
                    </span>
                  )}
                </Link>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setTopNavContextMenu({
                      key: item.key,
                      x: e.clientX,
                      y: e.clientY,
                    });
                  }}
                  className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-gray-400 hover:text-gray-600 p-1 transition-opacity"
                  title="Navigation options"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                    <circle cx="8" cy="2" r="1.5"/>
                    <circle cx="8" cy="8" r="1.5"/>
                    <circle cx="8" cy="14" r="1.5"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* START HERE label (only when admin and editing) */}
      {isEditMode && (
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          START HERE
        </h3>
      )}

      {/* Sections List */}
      <div className="space-y-6" onClick={handleCloseContextMenu}>
        {sections.map((section) => {
          const isCollapsed = collapsedSections.has(section.id);
          return (
            <div
              key={section.id}
              draggable={isEditMode}
              onDragStart={(e) => isEditMode && handleSectionDragStart(e, section.id)}
              onDragOver={(e) => isEditMode && handleSectionDragOver(e, section.id)}
              onDrop={handleSectionDrop}
            >
              <div className="group flex items-center gap-2 mb-2">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="flex items-center gap-2 flex-1 text-left"
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
                {isEditMode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setContextMenu({
                        type: "section",
                        sectionId: section.id,
                        x: e.clientX,
                        y: e.clientY,
                      });
                    }}
                    className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-gray-400 hover:text-gray-600 p-1 transition-opacity"
                    title="Section options"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                      <circle cx="8" cy="2" r="1.5"/>
                      <circle cx="8" cy="8" r="1.5"/>
                      <circle cx="8" cy="14" r="1.5"/>
                    </svg>
                  </button>
                )}
              </div>
              {!isCollapsed && (
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <div
                      key={item.id}
                      draggable={isEditMode}
                      onDragStart={(e) => isEditMode && handleItemDragStart(e, section.id, item.id)}
                      onDragOver={(e) => isEditMode && handleItemDragOver(e, section.id, item.id)}
                      onDrop={handleItemDrop}
                      className="group flex items-center gap-2"
                    >
                      <Link
                        href={item.href}
                        onClick={(e) => {
                          if (isDraggingRef.current) {
                            e.preventDefault();
                            isDraggingRef.current = false;
                          }
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg flex-1 text-sm ${
                          pathname === item.href
                            ? "bg-blue-50 text-blue-700 font-medium"
                            : isEditMode
                            ? "bg-gray-50 text-gray-700 hover:bg-gray-100"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {item.icon && <span className="text-base shrink-0">{item.icon}</span>}
                        <span className="break-words flex-1">{item.label}</span>
                        {!item.enabled && (
                          <span className="text-xs bg-gray-300 text-gray-600 px-1 py-0.5 rounded">
                            Hidden
                          </span>
                        )}
                        {item.read_only && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-1 py-0.5 rounded">
                            Read-only
                          </span>
                        )}
                      </Link>
                      {isEditMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setContextMenu({
                              type: "item",
                              item,
                              sectionId: section.id,
                              x: e.clientX,
                              y: e.clientY,
                            });
                          }}
                          className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-gray-400 hover:text-gray-600 p-1 transition-opacity"
                          title="Channel options"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                            <circle cx="8" cy="2" r="1.5"/>
                            <circle cx="8" cy="8" r="1.5"/>
                            <circle cx="8" cy="14" r="1.5"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Add Section Button (Edit Mode Only) */}
        {isEditMode && (
          <button
            onClick={() => setEditModal({ type: "addSection" })}
            className="w-full px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition flex items-center gap-2"
          >
            <span>+</span>
            <span>Add Section</span>
          </button>
        )}
      </div>

      {/* Top Nav Context Menu */}
      {topNavContextMenu && (
        <div
          className="fixed bg-white border border-gray-300 rounded-lg shadow-lg py-1 z-50"
          style={{ left: `${topNavContextMenu.x}px`, top: `${topNavContextMenu.y}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              const item = topNav.find((i) => i.key === topNavContextMenu.key);
              if (item) {
                setEditingTopNavItem(item);
              }
              setTopNavContextMenu(null);
            }}
            className="w-full px-4 py-2 text-left text-sm text-gray-900 hover:bg-gray-100"
          >
            Edit
          </button>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white border border-gray-300 rounded-lg shadow-lg py-1 z-50"
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === "section" && (
            <>
              <button
                onClick={() => {
                  setEditModal({ type: "addItem", sectionId: contextMenu.sectionId });
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-900 hover:bg-gray-100"
              >
                Create Channel
              </button>
              <button
                onClick={() => {
                  const section = sections.find((s) => s.id === contextMenu.sectionId);
                  if (section) {
                    setEditModal({ type: "editSectionName", section });
                  }
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-900 hover:bg-gray-100"
              >
                Edit Section
              </button>
              <button
                onClick={() => {
                  handleDeleteSection(contextMenu.sectionId);
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100"
              >
                Delete Section
              </button>
            </>
          )}
          {contextMenu.type === "item" && (
            <>
              <button
                onClick={() => {
                  setEditModal({ type: "editItem", item: contextMenu.item, sectionId: contextMenu.sectionId });
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-900 hover:bg-gray-100"
              >
                Edit
              </button>
              <button
                onClick={() => {
                  handleDeleteItem(contextMenu.item.id);
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100"
              >
                Delete
              </button>
            </>
          )}
        </div>
      )}

      {/* Edit Modals */}
      {editModal && (
        <>
          {editModal.type === "addSection" && (
            <AddSectionModal
              availableGroups={availableGroups}
              onSave={(name, groupSlugs) => handleCreateSection(name, groupSlugs)}
              onCancel={() => setEditModal(null)}
            />
          )}
          {editModal.type === "editSectionName" && (
            <EditSectionNameModal
              section={editModal.section}
              availableGroups={availableGroups}
              onSave={(name, groupSlugs) => handleUpdateSectionName(editModal.section.id, name, groupSlugs)}
              onCancel={() => setEditModal(null)}
            />
          )}
          {(editModal.type === "editItem" || editModal.type === "addItem") && (
            <EditItemModal
              item={editModal.type === "editItem" ? editModal.item : undefined}
              sectionId={editModal.type === "editItem" ? editModal.sectionId : editModal.sectionId}
              availableGroups={availableGroups}
              onSave={(data) =>
                handleSaveItem(
                  editModal.type === "editItem" ? editModal.item.id : null,
                  editModal.type === "editItem" ? editModal.sectionId : editModal.sectionId,
                  data
                )
              }
              onCancel={() => setEditModal(null)}
            />
          )}
        </>
      )}

      {/* Top Nav Edit Modal */}
      {editingTopNavItem && (
        <EditTopNavItemModal
          item={editingTopNavItem}
          availableGroups={availableGroups}
          onSave={(updates) => handleUpdateTopNavItem(editingTopNavItem.key, updates)}
          onCancel={() => setEditingTopNavItem(null)}
        />
      )}
    </>
  );
}

// Add Section Modal
function AddSectionModal({
  availableGroups,
  onSave,
  onCancel,
}: {
  availableGroups: Array<{ slug: string; name: string }>;
  onSave: (name: string, groupSlugs: string[]) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("New Section");
  const [isPrivate, setIsPrivate] = useState(false);
  const [groupSlugs, setGroupSlugs] = useState<string[]>([]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Add Section</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(name, isPrivate ? groupSlugs : []);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Section name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="Section name"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">Private section</span>
            </label>
            <p className="text-xs text-gray-600 mt-1">Only visible to selected groups</p>
          </div>

          {isPrivate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visible to groups
              </label>
              <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-200 rounded p-2">
                {availableGroups.map((group) => (
                  <label key={group.slug} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={groupSlugs.includes(group.slug)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setGroupSlugs([...groupSlugs, group.slug]);
                        } else {
                          setGroupSlugs(groupSlugs.filter((s) => s !== group.slug));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-900">{group.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Section Name Modal
function EditSectionNameModal({
  section,
  availableGroups,
  onSave,
  onCancel,
}: {
  section: SidebarSection;
  availableGroups: Array<{ slug: string; name: string }>;
  onSave: (name: string, groupSlugs: string[]) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(section.name);
  const [isPrivate, setIsPrivate] = useState((section.group_slugs || []).length > 0);
  const [groupSlugs, setGroupSlugs] = useState<string[]>(section.group_slugs || []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Edit Section</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(name, isPrivate ? groupSlugs : []);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Section name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="Section name"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">Private section</span>
            </label>
            <p className="text-xs text-gray-600 mt-1">Only visible to selected groups</p>
          </div>

          {isPrivate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visible to groups
              </label>
              <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-200 rounded p-2">
                {availableGroups.map((group) => (
                  <label key={group.slug} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={groupSlugs.includes(group.slug)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setGroupSlugs([...groupSlugs, group.slug]);
                        } else {
                          setGroupSlugs(groupSlugs.filter((s) => s !== group.slug));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-900">{group.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Item Modal (reference-style)
function EditItemModal({
  item,
  sectionId,
  availableGroups,
  onSave,
  onCancel,
}: {
  item?: SidebarItem;
  sectionId: string;
  availableGroups: Array<{ slug: string; name: string }>;
  onSave: (data: {
    label: string;
    href: string;
    icon?: string;
    enabled: boolean;
    group_slugs: string[];
    channel_type?: string;
    read_only?: boolean;
    description?: string;
    banner_image?: string;
  }) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(item?.label || "");
  const [icon, setIcon] = useState(item?.icon || "📚");
  const [channelType, setChannelType] = useState(item?.channel_type || "threads");
  const [isPrivate, setIsPrivate] = useState((item?.group_slugs || []).length > 0);
  const [groupSlugs, setGroupSlugs] = useState<string[]>(item?.group_slugs || []);
  const [readOnly, setReadOnly] = useState(item?.read_only || false);
  const [bannerImage, setBannerImage] = useState(item?.banner_image || "");
  const [description, setDescription] = useState(item?.description || "");
  const [enabled, setEnabled] = useState(item?.enabled ?? true);

  // Generate href ONLY for new items. Never rewrite existing item.href on edit.
  const generateNewThreadsHref = (label: string) => {
    const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return `/resources/${slug}`;
  };

  const href = item?.href ?? generateNewThreadsHref(label);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 pb-4">
          <h3 className="text-lg font-bold text-gray-900">{item ? "Edit Channel" : "Create Channel"}</h3>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave({
              label,
              href: item?.href ?? generateNewThreadsHref(label),
              icon,
              enabled,
              group_slugs: isPrivate ? groupSlugs : [],
              channel_type: channelType,
              read_only: readOnly,
              description,
              banner_image: bannerImage || undefined,
            });
          }}
          className="p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Change emoji</label>
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="📚"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Channel name <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Channel Type <span className="text-red-600">*</span>
            </label>
            <select
              value={channelType}
              onChange={(e) => setChannelType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="threads">Threads (Resource page)</option>
              <option value="chat" disabled>
                Chat (not available)
              </option>
              <option value="voice" disabled>
                Voice (not available)
              </option>
            </select>
            <p className="text-xs text-gray-600 mt-1">
              Threads creates a /resources/* document page
            </p>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">Visible</span>
            </label>
            <p className="text-xs text-gray-600 mt-1">Uncheck to hide this channel</p>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">Private channel</span>
            </label>
          </div>

          {isPrivate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search for users and groups
              </label>
              <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-200 rounded p-2">
                {availableGroups.map((group) => (
                  <label key={group.slug} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={groupSlugs.includes(group.slug)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setGroupSlugs([...groupSlugs, group.slug]);
                        } else {
                          setGroupSlugs(groupSlugs.filter((s) => s !== group.slug));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-900">{group.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={readOnly}
                onChange={(e) => setReadOnly(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">Read only</span>
            </label>
            <p className="text-xs text-gray-600 mt-1">Members can view but not post</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Banner image URL</label>
            <input
              type="text"
              value={bannerImage}
              onChange={(e) => setBannerImage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="https://example.com/banner.jpg"
            />
            <p className="text-xs text-gray-600 mt-1">
              Optional banner image (upload not available)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <SimpleRichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="Channel description..."
            />
          </div>

          <div className="flex gap-2 pt-4 sticky bottom-0 bg-white border-t border-gray-200 -mx-6 -mb-6 px-6 py-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Top Nav Item Modal
function EditTopNavItemModal({
  item,
  availableGroups,
  onSave,
  onCancel,
}: {
  item: TopNavItem;
  availableGroups: Array<{ slug: string; name: string }>;
  onSave: (updates: { label?: string; enabled?: boolean; group_slugs?: string[] }) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(item.label);
  const [enabled, setEnabled] = useState(item.enabled);
  const [isPrivate, setIsPrivate] = useState(item.group_slugs.length > 0);
  const [groupSlugs, setGroupSlugs] = useState<string[]>(item.group_slugs);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Edit Navigation Item</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave({
              label,
              enabled,
              group_slugs: isPrivate ? groupSlugs : [],
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Custom Name
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              required
            />
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">Visible</span>
            </label>
            <p className="text-xs text-gray-600 mt-1">Toggle to show/hide this item</p>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">Limit Access?</span>
            </label>
            <p className="text-xs text-gray-600 mt-1">Only visible to selected groups</p>
          </div>

          {isPrivate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search for users and groups
              </label>
              <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-200 rounded p-2">
                {availableGroups.map((group) => (
                  <label key={group.slug} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={groupSlugs.includes(group.slug)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setGroupSlugs([...groupSlugs, group.slug]);
                        } else {
                          setGroupSlugs(groupSlugs.filter((s) => s !== group.slug));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-900">{group.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
