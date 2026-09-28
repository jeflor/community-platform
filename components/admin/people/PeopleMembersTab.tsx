"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { InviteMemberButton } from "../InviteMemberButton";
import { DownloadCSVButton } from "../DownloadCSVButton";
import { formatLastSeen } from "@/lib/utils/date";
import { setMemberActive } from "@/lib/actions/admin";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  is_active: boolean;
  last_seen: string | null;
  created_at: string;
  group_members: { group_id: string }[];
}

interface Group {
  id: string;
  name: string;
  slug: string;
  is_system: boolean;
}

interface PeopleMembersTabProps {
  members: User[];
  groups: Group[];
}

export function PeopleMembersTab({ members, groups }: PeopleMembersTabProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "deactivated">("active");
  const [loading, setLoading] = useState<string | null>(null);

  const nonSystemGroups = groups.filter((g) => !g.is_system);

  // Filter members
  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      search === "" ||
      member.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      member.email.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && member.is_active) ||
      (statusFilter === "deactivated" && !member.is_active);

    return matchesSearch && matchesStatus;
  });


  const handleToggleActive = async (userId: string, isActive: boolean) => {
    if (!confirm(isActive ? "Deactivate this member?" : "Reactivate this member?")) return;
    setLoading(userId);
    await setMemberActive(userId, !isActive);
    setLoading(null);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                statusFilter === "active"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Active {members.filter((m) => m.is_active).length}
            </button>
            <button
              onClick={() => setStatusFilter("deactivated")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                statusFilter === "deactivated"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Deactivated {members.filter((m) => !m.is_active).length}
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <DownloadCSVButton />
          <InviteMemberButton groups={nonSystemGroups} />
        </div>
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Members Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Member
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Login
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Joined
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredMembers.map((member) => {
              const displayName = member.full_name || member.email;
              const lastSeenStatus = formatLastSeen(member.last_seen);
              const joinedDate = new Date(member.created_at).toLocaleDateString();

              return (
                <tr
                  key={member.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/dashboard/members/${member.id}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {member.avatar_url ? (
                          <img
                            src={member.avatar_url}
                            alt={displayName}
                            className="h-10 w-10 rounded-full"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                            {displayName[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{displayName}</div>
                        <div className="text-sm text-gray-500">{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {member.role === "admin" ? "Administrator" : member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {lastSeenStatus?.text || "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{joinedDate}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleActive(member.id, member.is_active);
                      }}
                      disabled={loading === member.id}
                      className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                    >
                      {member.is_active ? "Deactivate" : "Reactivate"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredMembers.length === 0 && (
        <div className="text-center py-12 text-gray-500">No members found</div>
      )}
    </div>
  );
}
