"use client";

import { useState, useEffect } from "react";
import { createBanner, updateBanner, deleteBanner, getBanners } from "@/lib/actions/banners";

interface Banner {
  id: string;
  title: string;
  body: string;
  href: string | null;
  enabled: boolean;
  position: string;
  group_slugs: string[];
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}

interface BannersManagerProps {
  availableGroups: Array<{ slug: string; name: string }>;
}

export function BannersManager({ availableGroups }: BannersManagerProps) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [showForm, setShowForm] = useState(false);

  const emptyBanner: Omit<Banner, "id" | "created_at"> = {
    title: "",
    body: "",
    href: "",
    enabled: false,
    position: "pulse",
    group_slugs: [],
    starts_at: null,
    ends_at: null,
  };

  const [formData, setFormData] = useState(emptyBanner);

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    setLoading(true);
    const result = await getBanners();
    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setBanners(result.data);
    }
    setLoading(false);
  };

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      body: banner.body,
      href: banner.href || "",
      enabled: banner.enabled,
      position: banner.position,
      group_slugs: banner.group_slugs || [],
      starts_at: banner.starts_at || null,
      ends_at: banner.ends_at || null,
    });
    setShowForm(true);
    setError("");
    setSuccess("");
  };

  const handleCreate = () => {
    setEditingBanner(null);
    setFormData(emptyBanner);
    setShowForm(true);
    setError("");
    setSuccess("");
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingBanner(null);
    setFormData(emptyBanner);
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const bannerData = {
      ...(editingBanner ? { id: editingBanner.id } : {}),
      title: formData.title,
      body: formData.body,
      href: formData.href || undefined,
      enabled: formData.enabled,
      position: formData.position as "pulse" | "home" | "both",
      group_slugs: formData.group_slugs,
      starts_at: formData.starts_at || null,
      ends_at: formData.ends_at || null,
    };

    const result = editingBanner
      ? await updateBanner(bannerData)
      : await createBanner(bannerData);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(editingBanner ? "Banner updated successfully!" : "Banner created successfully!");
      setShowForm(false);
      setEditingBanner(null);
      setFormData(emptyBanner);
      await loadBanners();
    }

    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this banner?")) return;

    setSaving(true);
    setError("");
    setSuccess("");

    const result = await deleteBanner(id);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess("Banner deleted successfully!");
      await loadBanners();
    }

    setSaving(false);
  };

  const handleToggleEnabled = async (banner: Banner) => {
    setSaving(true);
    const result = await updateBanner({
      id: banner.id,
      title: banner.title,
      body: banner.body,
      href: banner.href || undefined,
      enabled: !banner.enabled,
      position: banner.position as "pulse" | "home" | "both",
      group_slugs: banner.group_slugs || [],
      starts_at: banner.starts_at,
      ends_at: banner.ends_at,
    });

    if (result.error) {
      setError(result.error);
    } else {
      await loadBanners();
    }

    setSaving(false);
  };

  if (loading) {
    return <div className="text-gray-600">Loading banners...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Community Banners</h3>
        <p className="text-sm text-gray-500 mb-4">
          Display optional banner messages at the top of Pulse or homepage. Members can dismiss them per session.
        </p>
      </div>

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          {success}
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {!showForm && (
        <button
          type="button"
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
        >
          + Create Banner
        </button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <h4 className="text-md font-medium text-gray-900 mb-3">
            {editingBanner ? "Edit Banner" : "Create Banner"}
          </h4>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Welcome to the community!"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Body <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Banner message text"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Link URL (optional)
              </label>
              <input
                type="text"
                value={formData.href || ""}
                onChange={(e) => setFormData({ ...formData, href: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., /resources/getting-started"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Position
              </label>
              <select
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pulse">Pulse only</option>
                <option value="home">Home only</option>
                <option value="both">Both Pulse & Home</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Access Groups (comma-separated slugs)
              </label>
              <input
                type="text"
                value={formData.group_slugs.join(", ")}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    group_slugs: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter((s) => s.length > 0),
                  })
                }
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., free-members, paid-students"
              />
              <p className="mt-1 text-xs text-gray-500">
                Leave empty for all authenticated users. Available groups:{" "}
                {availableGroups.map((g) => g.slug).join(", ")}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Start Date/Time (optional)
                </label>
                <input
                  type="datetime-local"
                  value={
                    formData.starts_at
                      ? new Date(formData.starts_at).toISOString().slice(0, 16)
                      : ""
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      starts_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  End Date/Time (optional)
                </label>
                <input
                  type="datetime-local"
                  value={
                    formData.ends_at
                      ? new Date(formData.ends_at).toISOString().slice(0, 16)
                      : ""
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      ends_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="enabled"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="enabled" className="ml-2 text-sm font-medium text-gray-900">
                Enabled (visible to members)
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-50"
            >
              {saving ? "Saving..." : editingBanner ? "Update Banner" : "Create Banner"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2 mt-4">
        {banners.length === 0 ? (
          <p className="text-sm text-gray-500">No banners created yet.</p>
        ) : (
          banners.map((banner) => (
            <div
              key={banner.id}
              className="border border-gray-200 rounded-lg p-4 bg-white flex items-start justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-900">{banner.title}</h4>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      banner.enabled
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {banner.enabled ? "Enabled" : "Disabled"}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                    {banner.position}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{banner.body}</p>
                {banner.href && (
                  <p className="text-xs text-gray-500">Link: {banner.href}</p>
                )}
                {banner.group_slugs && banner.group_slugs.length > 0 && (
                  <p className="text-xs text-gray-500">
                    Groups: {banner.group_slugs.join(", ")}
                  </p>
                )}
                {(banner.starts_at || banner.ends_at) && (
                  <p className="text-xs text-gray-500">
                    {banner.starts_at && `Starts: ${new Date(banner.starts_at).toLocaleString()}`}
                    {banner.starts_at && banner.ends_at && " | "}
                    {banner.ends_at && `Ends: ${new Date(banner.ends_at).toLocaleString()}`}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => handleToggleEnabled(banner)}
                  disabled={saving}
                  className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                >
                  {banner.enabled ? "Disable" : "Enable"}
                </button>
                <button
                  onClick={() => handleEdit(banner)}
                  disabled={saving}
                  className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(banner.id)}
                  disabled={saving}
                  className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
