"use client";

import { useEffect, useState } from "react";
import { getAllChannelsWithGroups, createChannel, updateChannel, deleteChannel, type ChannelWithGroups } from "@/lib/actions/channels";

interface Group {
  id: string;
  name: string;
}

export function ChannelsManager() {
  const [channels, setChannels] = useState<ChannelWithGroups[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingChannel, setEditingChannel] = useState<ChannelWithGroups | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    type: "chat" as "chat" | "thread",
    description: "",
    position: 0,
    groupIds: [] as string[],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [channelsData, groupsResponse] = await Promise.all([
      getAllChannelsWithGroups(),
      fetch("/api/groups").then((r) => r.json()).catch(() => ({ groups: [] })),
    ]);
    setChannels(channelsData);
    
    const groupsData = await fetchGroups();
    setGroups(groupsData);
    setIsLoading(false);
  };

  const fetchGroups = async (): Promise<Group[]> => {
    try {
      const response = await fetch("/api/groups");
      if (!response.ok) return [];
      const data = await response.json();
      return data.groups || [];
    } catch {
      return [];
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingChannel(null);
    setFormData({
      name: "",
      slug: "",
      type: "chat",
      description: "",
      position: channels.length,
      groupIds: [],
    });
  };

  const handleEdit = (channel: ChannelWithGroups) => {
    setIsCreating(false);
    setEditingChannel(channel);
    setFormData({
      name: channel.name,
      slug: channel.slug,
      type: channel.type,
      description: channel.description || "",
      position: channel.position,
      groupIds: channel.channel_groups.map((cg) => cg.group_id),
    });
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingChannel(null);
    setFormData({
      name: "",
      slug: "",
      type: "chat",
      description: "",
      position: 0,
      groupIds: [],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.slug.trim()) {
      alert("Name and slug are required");
      return;
    }

    let result;
    if (isCreating) {
      result = await createChannel(formData);
    } else if (editingChannel) {
      result = await updateChannel(editingChannel.id, formData);
    }

    if (result?.success) {
      await loadData();
      handleCancel();
    } else {
      alert(result?.error || "Failed to save channel");
    }
  };

  const handleDelete = async (channelId: string, channelName: string) => {
    if (!confirm(`Are you sure you want to delete the channel "${channelName}"? This will delete all messages in the channel.`)) {
      return;
    }

    const result = await deleteChannel(channelId);
    if (result.success) {
      await loadData();
    } else {
      alert(result.error || "Failed to delete channel");
    }
  };

  const toggleGroupSelection = (groupId: string) => {
    setFormData((prev) => ({
      ...prev,
      groupIds: prev.groupIds.includes(groupId)
        ? prev.groupIds.filter((id) => id !== groupId)
        : [...prev.groupIds, groupId],
    }));
  };

  if (isLoading) {
    return <div className="text-gray-500">Loading channels...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-gray-600">
          Manage channels and their access groups. Users can only see channels if they belong to at least one assigned group.
        </p>
        {!isCreating && !editingChannel && (
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Channel
          </button>
        )}
      </div>

      {(isCreating || editingChannel) && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {isCreating ? "Create New Channel" : `Edit Channel: ${editingChannel?.name}`}
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="General"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Slug *
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="general"
              />
              <p className="text-xs text-gray-500 mt-1">Used in the URL (lowercase, no spaces)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as "chat" | "thread" })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="chat">Chat (flat message list)</option>
                <option value="thread">Thread (discussions with replies)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="What is this channel for?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Position
              </label>
              <input
                type="number"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Access Groups
              </label>
              {groups.length === 0 ? (
                <p className="text-sm text-gray-500">No groups available. Create groups first.</p>
              ) : (
                <div className="space-y-2">
                  {groups.map((group) => (
                    <label key={group.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.groupIds.includes(group.id)}
                        onChange={() => toggleGroupSelection(group.id)}
                        className="mr-2 h-4 w-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-900">{group.name}</span>
                    </label>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Users must be in at least one selected group to see this channel
              </p>
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {isCreating ? "Create" : "Save"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                Groups
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                Position
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-900 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {channels.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No channels yet. Create your first channel!
                </td>
              </tr>
            ) : (
              channels.map((channel) => (
                <tr key={channel.id}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {channel.type === "chat" ? "#" : "💬"} {channel.name}
                    </div>
                    <div className="text-xs text-gray-500">{channel.slug}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 capitalize">
                    {channel.type}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {channel.channel_groups.length === 0 ? (
                      <span className="text-gray-500 italic">No groups</span>
                    ) : (
                      <span>{channel.channel_groups.length} group(s)</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {channel.position}
                  </td>
                  <td className="px-6 py-4 text-right text-sm space-x-2">
                    <button
                      onClick={() => handleEdit(channel)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(channel.id, channel.name)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
