"use client";

import { useState } from "react";
import { addMemberToGroup, removeMemberFromGroup } from "@/lib/actions/admin";
import { useRouter } from "next/navigation";

interface Group {
  id: string;
  name: string;
  slug: string;
}

interface MemberGroup {
  group_id: string;
  access_groups: {
    id: string;
    name: string;
    slug: string;
  };
}

interface MemberGroupManagementProps {
  userId: string;
  memberGroups: MemberGroup[];
  availableGroups: Group[];
}

export function MemberGroupManagement({
  userId,
  memberGroups,
  availableGroups,
}: MemberGroupManagementProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState("");

  // Filter out system groups from member's current groups
  const visibleMemberGroups = memberGroups.filter(
    (mg) => !["everyone", "team"].includes(mg.access_groups.slug)
  );

  // Get group IDs the member is already in
  const memberGroupIds = memberGroups.map((mg) => mg.group_id);

  // Filter available groups: exclude those member is already in, and system groups
  const selectableGroups = availableGroups.filter(
    (g) =>
      !memberGroupIds.includes(g.id) && !["everyone", "team"].includes(g.slug)
  );

  const handleAddGroup = async () => {
    if (!selectedGroupId) return;

    setLoading(true);
    setError(null);

    const result = await addMemberToGroup(userId, selectedGroupId);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setSelectedGroupId("");
      setLoading(false);
      router.refresh();
    }
  };

  const handleRemoveGroup = async (groupId: string) => {
    setLoading(true);
    setError(null);

    const result = await removeMemberFromGroup(userId, groupId);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setLoading(false);
      router.refresh();
    }
  };

  const getGroupBadgeColor = (slug: string) => {
    if (slug === "paid-students")
      return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    if (slug === "free-members")
      return "bg-sky-100 text-sky-700 border border-sky-200";
    return "bg-orange-100 text-orange-700 border border-orange-200";
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Current Groups */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Access Groups
        </h3>
        {visibleMemberGroups.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {visibleMemberGroups.map((mg) => (
              <div
                key={mg.group_id}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold ${getGroupBadgeColor(
                  mg.access_groups.slug
                )}`}
              >
                <span>{mg.access_groups.name}</span>
                <button
                  onClick={() => handleRemoveGroup(mg.group_id)}
                  disabled={loading}
                  className="hover:bg-black/10 rounded p-0.5 transition disabled:opacity-50"
                  aria-label={`Remove ${mg.access_groups.name}`}
                >
                  <svg
                    className="w-4 h-4"
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
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No access groups assigned</p>
        )}
      </div>

      {/* Add Group */}
      {selectableGroups.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Add Access
          </h3>
          <div className="flex gap-2">
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              disabled={loading}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">Select a group...</option>
              {selectableGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleAddGroup}
              disabled={loading || !selectedGroupId}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
