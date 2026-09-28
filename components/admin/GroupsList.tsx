"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createGroup, updateGroup, deleteGroup } from "@/lib/actions/admin";

interface Group {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  group_members: { count: number }[];
}

interface GroupsListProps {
  groups: Group[];
}

export function GroupsList({ groups }: GroupsListProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await createGroup(formData);
    setFormData({ name: "", description: "" });
    setIsCreating(false);
    setLoading(false);
    router.refresh();
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setLoading(true);
    await updateGroup({ groupId: editingId, ...formData });
    setEditingId(null);
    setFormData({ name: "", description: "" });
    setLoading(false);
    router.refresh();
  };

  const handleDelete = async (groupId: string) => {
    if (!confirm("Are you sure you want to delete this group?")) return;
    setLoading(true);
    await deleteGroup(groupId);
    setLoading(false);
    router.refresh();
  };

  const startEdit = (group: Group) => {
    setEditingId(group.id);
    setFormData({ name: group.name, description: group.description || "" });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Create Group
        </button>
      </div>

      {isCreating && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Group</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setFormData({ name: "", description: "" });
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.id} className="bg-white rounded-lg shadow p-6">
            {editingId === group.id ? (
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setFormData({ name: "", description: "" });
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      {group.name}
                      {group.is_system && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                          System
                        </span>
                      )}
                    </h3>
                    {group.description && (
                      <p className="text-gray-600 text-sm mt-1">
                        {group.description}
                      </p>
                    )}
                  </div>
                  {!group.is_system && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(group)}
                        className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(group.id)}
                        disabled={loading}
                        className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  {group.group_members[0]?.count || 0} members
                </p>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
