"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  createSignupLink, 
  updateSignupLink, 
  deleteSignupLink 
} from "@/lib/actions/signup-links";

interface Group {
  id: string;
  name: string;
  slug: string;
  is_system: boolean;
}

interface SignupLink {
  id: string;
  name: string;
  token: string;
  is_enabled: boolean;
  default_group_id: string | null;
  visits_count: number;
  signups_count: number;
  created_at: string;
  access_groups?: {
    name: string;
  };
}

interface PeopleSignUpLinksTabProps {
  groups: Group[];
  signupLinks: SignupLink[];
}

export function PeopleSignUpLinksTab({ groups, signupLinks }: PeopleSignUpLinksTabProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ name: "", defaultGroupId: "" });
  const [loading, setLoading] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const nonSystemGroups = groups.filter((g) => !g.is_system);

  // Filter signup links
  const filteredLinks = signupLinks.filter((link) => {
    return link.name.toLowerCase().includes(search.toLowerCase());
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const result = await createSignupLink({
      name: formData.name,
      defaultGroupId: formData.defaultGroupId || undefined,
    });
    
    setLoading(false);
    
    if (result.error) {
      alert(result.error);
    } else {
      setFormData({ name: "", defaultGroupId: "" });
      setIsCreating(false);
      router.refresh();
    }
  };

  const handleToggle = async (linkId: string, currentState: boolean) => {
    setLoading(true);
    await updateSignupLink({ id: linkId, isEnabled: !currentState });
    setLoading(false);
    router.refresh();
  };

  const handleDelete = async (linkId: string) => {
    if (!confirm("Are you sure you want to delete this signup link?")) return;
    setLoading(true);
    await deleteSignupLink(linkId);
    setLoading(false);
    router.refresh();
  };

  const handleCopy = (token: string) => {
    const siteUrl = window.location.origin;
    const url = `${siteUrl}/join/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-900">
            Create public sign-up links with optional group assignment.
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
        >
          + Create Link
        </button>
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search links"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Create Link Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create Sign-Up Link</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Link Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., General Signup, Premium Access"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Default Access Group (optional)
                </label>
                <select
                  value={formData.defaultGroupId}
                  onChange={(e) => setFormData({ ...formData, defaultGroupId: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No default group</option>
                  {nonSystemGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setFormData({ name: "", defaultGroupId: "" });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sign-Up Links Table */}
      {filteredLinks.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Access Group
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Visits
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Signups
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLinks.map((link) => (
                <tr key={link.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {link.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {link.access_groups?.name || "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {link.visits_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {link.signups_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleToggle(link.id, link.is_enabled)}
                      disabled={loading}
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        link.is_enabled
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {link.is_enabled ? "Enabled" : "Disabled"}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopy(link.token)}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                        {copiedToken === link.token ? "Copied!" : "Copy Link"}
                      </button>
                      <button
                        onClick={() => handleDelete(link.id)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-900 font-medium disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filteredLinks.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No sign-up links created yet</p>
          <p className="text-sm mt-2">Click "Create Link" above to get started</p>
        </div>
      )}
    </div>
  );
}
