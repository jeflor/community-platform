"use client";

import { useState } from "react";
import type { SidebarSection } from "@/lib/actions/sidebar";
import {
  updateSidebarSection,
  deleteSidebarSection,
  createSidebarSection,
  updateSidebarItem,
  deleteSidebarItem,
  createSidebarItem,
  reorderSidebarSections,
  reorderSidebarItems,
} from "@/lib/actions/sidebar";

interface SidebarManagerProps {
  initialSections: SidebarSection[];
  availableGroups: Array<{ slug: string; name: string }>;
}

export function SidebarManager({
  initialSections,
  availableGroups,
}: SidebarManagerProps) {
  const [sections, setSections] = useState(initialSections);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [addingItemToSection, setAddingItemToSection] = useState<string | null>(
    null
  );
  const [draggedSection, setDraggedSection] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<{
    sectionId: string;
    itemId: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // Section drag handlers
  const handleSectionDragStart = (sectionId: string) => {
    setDraggedSection(sectionId);
  };

  const handleSectionDragOver = (e: React.DragEvent, targetSectionId: string) => {
    e.preventDefault();
    if (!draggedSection || draggedSection === targetSectionId) return;

    const draggedIdx = sections.findIndex((s) => s.id === draggedSection);
    const targetIdx = sections.findIndex((s) => s.id === targetSectionId);

    const newSections = [...sections];
    const [removed] = newSections.splice(draggedIdx, 1);
    newSections.splice(targetIdx, 0, removed);

    setSections(newSections);
  };

  const handleSectionDragEnd = async () => {
    if (!draggedSection) return;

    setIsSaving(true);
    const result = await reorderSidebarSections(sections.map((s) => s.id));
    setIsSaving(false);

    if (result.success) {
      showMessage("success", "Sections reordered");
    } else {
      showMessage("error", result.error || "Failed to reorder sections");
    }

    setDraggedSection(null);
  };

  // Item drag handlers
  const handleItemDragStart = (sectionId: string, itemId: string) => {
    setDraggedItem({ sectionId, itemId });
  };

  const handleItemDragOver = (
    e: React.DragEvent,
    targetSectionId: string,
    targetItemId: string
  ) => {
    e.preventDefault();
    if (
      !draggedItem ||
      draggedItem.sectionId !== targetSectionId ||
      draggedItem.itemId === targetItemId
    )
      return;

    const sectionIdx = sections.findIndex((s) => s.id === targetSectionId);
    const section = sections[sectionIdx];
    const draggedIdx = section.items.findIndex((i) => i.id === draggedItem.itemId);
    const targetIdx = section.items.findIndex((i) => i.id === targetItemId);

    const newItems = [...section.items];
    const [removed] = newItems.splice(draggedIdx, 1);
    newItems.splice(targetIdx, 0, removed);

    const newSections = [...sections];
    newSections[sectionIdx] = { ...section, items: newItems };

    setSections(newSections);
  };

  const handleItemDragEnd = async () => {
    if (!draggedItem) return;

    const section = sections.find((s) => s.id === draggedItem.sectionId);
    if (!section) return;

    setIsSaving(true);
    const result = await reorderSidebarItems(section.items.map((i) => i.id));
    setIsSaving(false);

    if (result.success) {
      showMessage("success", "Items reordered");
    } else {
      showMessage("error", result.error || "Failed to reorder items");
    }

    setDraggedItem(null);
  };

  const handleUpdateSection = async (
    sectionId: string,
    data: Partial<{
      name: string;
      collapsed_default: boolean;
      group_slugs: string[];
    }>
  ) => {
    setIsSaving(true);
    const result = await updateSidebarSection(sectionId, data);
    setIsSaving(false);

    if (result.success) {
      showMessage("success", "Section updated");
      setSections((prev) =>
        prev.map((s) => (s.id === sectionId ? { ...s, ...data } : s))
      );
      setEditingSection(null);
    } else {
      showMessage("error", result.error || "Failed to update section");
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm("Delete this section and all its items?")) return;

    setIsSaving(true);
    const result = await deleteSidebarSection(sectionId);
    setIsSaving(false);

    if (result.success) {
      showMessage("success", "Section deleted");
      setSections((prev) => prev.filter((s) => s.id !== sectionId));
    } else {
      showMessage("error", result.error || "Failed to delete section");
    }
  };

  const handleAddSection = async (data: {
    name: string;
    collapsed_default: boolean;
    group_slugs: string[];
  }) => {
    setIsSaving(true);
    const result = await createSidebarSection({
      ...data,
      position: sections.length,
    });
    setIsSaving(false);

    if (result.success && result.sectionId) {
      showMessage("success", "Section created");
      setSections((prev) => [
        ...prev,
        {
          id: result.sectionId!,
          ...data,
          position: prev.length,
          items: [],
        },
      ]);
      setIsAddingSection(false);
    } else {
      showMessage("error", result.error || "Failed to create section");
    }
  };

  const handleUpdateItem = async (
    itemId: string,
    data: Partial<{
      label: string;
      href: string;
      icon: string | null;
      enabled: boolean;
      group_slugs: string[];
    }>
  ) => {
    setIsSaving(true);
    const result = await updateSidebarItem(itemId, data);
    setIsSaving(false);

    if (result.success) {
      showMessage("success", "Item updated");
      setSections((prev) =>
        prev.map((section) => ({
          ...section,
          items: section.items.map((item) =>
            item.id === itemId ? { ...item, ...data } : item
          ),
        }))
      );
      setEditingItem(null);
    } else {
      showMessage("error", result.error || "Failed to update item");
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Delete this item?")) return;

    setIsSaving(true);
    const result = await deleteSidebarItem(itemId);
    setIsSaving(false);

    if (result.success) {
      showMessage("success", "Item deleted");
      setSections((prev) =>
        prev.map((section) => ({
          ...section,
          items: section.items.filter((item) => item.id !== itemId),
        }))
      );
    } else {
      showMessage("error", result.error || "Failed to delete item");
    }
  };

  const handleAddItem = async (
    sectionId: string,
    data: {
      label: string;
      href: string;
      icon?: string;
      enabled: boolean;
      group_slugs: string[];
    }
  ) => {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;

    setIsSaving(true);
    const result = await createSidebarItem({
      section_id: sectionId,
      ...data,
      position: section.items.length,
    });
    setIsSaving(false);

    if (result.success && result.itemId) {
      showMessage("success", "Item created");
      setSections((prev) =>
        prev.map((s) =>
          s.id === sectionId
            ? {
                ...s,
                items: [
                  ...s.items,
                  {
                    id: result.itemId!,
                    ...data,
                    icon: data.icon || null,
                    position: s.items.length,
                  },
                ],
              }
            : s
        )
      );
      setAddingItemToSection(null);
    } else {
      showMessage("error", result.error || "Failed to create item");
    }
  };

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {isSaving && (
        <div className="fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          Saving...
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sidebar Navigation</h2>
          <p className="text-gray-600 mt-1">
            Manage sections and items. Drag to reorder.
          </p>
        </div>
        <button
          onClick={() => setIsAddingSection(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          + Add Section
        </button>
      </div>

      {/* Add Section Form */}
      {isAddingSection && (
        <SectionForm
          onSave={handleAddSection}
          onCancel={() => setIsAddingSection(false)}
          availableGroups={availableGroups}
        />
      )}

      {/* Sections List */}
      <div className="space-y-4">
        {sections.map((section) => (
          <div
            key={section.id}
            draggable
            onDragStart={() => handleSectionDragStart(section.id)}
            onDragOver={(e) => handleSectionDragOver(e, section.id)}
            onDragEnd={handleSectionDragEnd}
            className="bg-white border border-gray-300 rounded-lg p-4 cursor-move hover:shadow-md transition"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="text-gray-400">☰</div>
                <h3 className="font-semibold text-gray-900">{section.name}</h3>
                {section.group_slugs.length > 0 && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                    {section.group_slugs.join(", ")}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingSection(section.id)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Edit
                </button>
                <button
                  onClick={() => setAddingItemToSection(section.id)}
                  className="text-sm text-green-600 hover:text-green-800"
                >
                  + Add Item
                </button>
                <button
                  onClick={() => handleDeleteSection(section.id)}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
            </div>

            {editingSection === section.id && (
              <SectionForm
                initialData={section}
                onSave={(data) => handleUpdateSection(section.id, data)}
                onCancel={() => setEditingSection(null)}
                availableGroups={availableGroups}
              />
            )}

            {addingItemToSection === section.id && (
              <ItemForm
                onSave={(data) => handleAddItem(section.id, data)}
                onCancel={() => setAddingItemToSection(null)}
                availableGroups={availableGroups}
              />
            )}

            {/* Items */}
            <div className="space-y-2 mt-2">
              {section.items.map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => handleItemDragStart(section.id, item.id)}
                  onDragOver={(e) => handleItemDragOver(e, section.id, item.id)}
                  onDragEnd={handleItemDragEnd}
                  className="bg-gray-50 border border-gray-200 rounded p-3 ml-8 cursor-move hover:shadow transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-gray-400 text-sm">☰</div>
                      {item.icon && <span>{item.icon}</span>}
                      <span className="text-sm">{item.label}</span>
                      {!item.enabled && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                          Disabled
                        </span>
                      )}
                      {item.group_slugs.length > 0 && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {item.group_slugs.join(", ")}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingItem(item.id)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {editingItem === item.id && (
                    <ItemForm
                      initialData={item}
                      onSave={(data) => handleUpdateItem(item.id, data)}
                      onCancel={() => setEditingItem(null)}
                      availableGroups={availableGroups}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Section Form Component
function SectionForm({
  initialData,
  onSave,
  onCancel,
  availableGroups,
}: {
  initialData?: {
    name: string;
    collapsed_default: boolean;
    group_slugs: string[];
  };
  onSave: (data: {
    name: string;
    collapsed_default: boolean;
    group_slugs: string[];
  }) => void;
  onCancel: () => void;
  availableGroups: Array<{ slug: string; name: string }>;
}) {
  const [name, setName] = useState(initialData?.name || "");
  const [collapsedDefault, setCollapsedDefault] = useState(
    initialData?.collapsed_default || false
  );
  const [groupSlugs, setGroupSlugs] = useState<string[]>(
    initialData?.group_slugs || []
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, collapsed_default: collapsedDefault, group_slugs: groupSlugs });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Section Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>
      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={collapsedDefault}
            onChange={(e) => setCollapsedDefault(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-700">Collapsed by default</span>
        </label>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Visible to groups (leave empty for everyone)
        </label>
        <div className="space-y-1">
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
              <span className="text-sm text-gray-700">{group.name}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// Item Form Component
function ItemForm({
  initialData,
  onSave,
  onCancel,
  availableGroups,
}: {
  initialData?: {
    label: string;
    href: string;
    icon: string | null;
    enabled: boolean;
    group_slugs: string[];
  };
  onSave: (data: {
    label: string;
    href: string;
    icon?: string;
    enabled: boolean;
    group_slugs: string[];
  }) => void;
  onCancel: () => void;
  availableGroups: Array<{ slug: string; name: string }>;
}) {
  const [label, setLabel] = useState(initialData?.label || "");
  const [href, setHref] = useState(initialData?.href || "");
  const [icon, setIcon] = useState(initialData?.icon || "");
  const [enabled, setEnabled] = useState(initialData?.enabled ?? true);
  const [groupSlugs, setGroupSlugs] = useState<string[]>(
    initialData?.group_slugs || []
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      label,
      href,
      icon: icon || undefined,
      enabled,
      group_slugs: groupSlugs,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg space-y-3 mt-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Label
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Icon/Emoji
          </label>
          <input
            type="text"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="📚"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Destination (href)
        </label>
        <input
          type="text"
          value={href}
          onChange={(e) => setHref(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="/resources/page-slug"
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
          <span className="text-sm text-gray-700">Enabled</span>
        </label>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Visible to groups (leave empty for everyone)
        </label>
        <div className="space-y-1">
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
              <span className="text-sm text-gray-700">{group.name}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
