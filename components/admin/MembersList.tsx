"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateUser,
  addUserToGroup,
  removeUserFromGroup,
} from "@/lib/actions/admin";
import { formatLastSeen } from "@/lib/utils/date";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  headline: string | null;
  location: string | null;
  role: string;
  is_active: boolean;
  last_seen: string | null;
  group_members: { group_id: string }[];
}

interface Group {
  id: string;
  name: string;
  slug: string;
  is_system: boolean;
}

interface MembersListProps {
  users: User[];
  groups: Group[];
  searchQuery: string;
  roleFilter: string;
  groupFilter: string;
  isAdmin: boolean;
}

export function MembersList({ 
  users, 
  groups, 
  searchQuery,
  roleFilter,
  groupFilter,
  isAdmin
}: MembersListProps) {
  const router = useRouter();
  const [search, setSearch] = useState(searchQuery);
  const [role, setRole] = useState(roleFilter);
  const [group, setGroup] = useState(groupFilter);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (role !== 'all') params.set('role', role);
    if (group !== 'all') params.set('group', group);
    
    router.push(`/dashboard/members${params.toString() ? '?' + params.toString() : ''}`);
    setShowFilters(false);
  };

  const clearFilters = () => {
    setSearch('');
    setRole('all');
    setGroup('all');
    router.push('/dashboard/members');
    setShowFilters(false);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setLoading(userId);
    await updateUser({ userId, role: newRole as "admin" | "coach" | "client" });
    setLoading(null);
    router.refresh();
  };

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    setLoading(userId);
    await updateUser({ userId, isActive: !isActive });
    setLoading(null);
    router.refresh();
  };

  const handleToggleGroup = async (
    userId: string,
    groupId: string,
    isMember: boolean
  ) => {
    setLoading(userId);
    if (isMember) {
      await removeUserFromGroup(userId, groupId);
    } else {
      await addUserToGroup(userId, groupId);
    }
    setLoading(null);
    router.refresh();
  };

  const nonSystemGroups = groups.filter((g) => !g.is_system);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-700 border border-purple-200";
      case "coach":
        return "bg-blue-100 text-blue-700 border border-blue-200";
      default:
        return "bg-gray-100 text-gray-700 border border-gray-200";
    }
  };

  const getGroupBadgeColor = (slug: string) => {
    if (slug === "paid-students") return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    if (slug === "free-members") return "bg-sky-100 text-sky-700 border border-sky-200";
    return "bg-orange-100 text-orange-700 border border-orange-200";
  };

  const activeFilterCount = 
    (role !== 'all' ? 1 : 0) + 
    (group !== 'all' ? 1 : 0);

  return (
    <div>
      {/* Search and Filter Bar */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search members..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Search
            </button>
          </form>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium flex items-center gap-2"
            >
              <span className="text-xl">+</span>
              Add Filter
              {activeFilterCount > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="coach">Coach</option>
                  <option value="client">Client</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Access Group
                </label>
                <select
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Groups</option>
                  {nonSystemGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={applyFilters}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Apply Filters
              </button>
              <button
                onClick={clearFilters}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                Clear All
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Count */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-600">
          {users.length} {users.length === 1 ? 'user' : 'users'}
        </div>
      </div>

      {/* Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((user) => {
          const displayName = user.full_name || user.email;
          const initials = displayName
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
          const userGroups = nonSystemGroups.filter((group) =>
            user.group_members.some((gm) => gm.group_id === group.id)
          );
          const isExpanded = expandedUser === user.id;

          return (
            <div
              key={user.id}
              className="bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              {/* Card Header */}
              <button
                onClick={() => router.push(`/dashboard/members/${user.id}`)}
                className="w-full text-left p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Large Avatar */}
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={displayName}
                      className="w-20 h-20 rounded-full object-cover flex-shrink-0 shadow-md"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 via-blue-500 to-purple-500 text-white rounded-full flex items-center justify-center text-xl font-semibold flex-shrink-0 shadow-md">
                      {initials}
                    </div>
                  )}

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-lg truncate">
                      {displayName}
                    </h3>

                    {/* Headline */}
                    {user.headline && (
                      <p className="text-sm text-gray-700 truncate mt-1">
                        {user.headline}
                      </p>
                    )}

                    {/* Location */}
                    {user.location && (
                      <p className="text-xs text-gray-500 truncate mt-1">
                        {user.location}
                      </p>
                    )}

                    {isAdmin && (
                      <p className="text-sm text-gray-500 truncate mt-0.5">
                        {user.email}
                      </p>
                    )}

                    {/* Last Seen */}
                    {(() => {
                      const lastSeenStatus = formatLastSeen(user.last_seen);
                      if (lastSeenStatus) {
                        return (
                          <p className={`text-xs mt-1 ${lastSeenStatus.isOnline ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                            {lastSeenStatus.text}
                          </p>
                        );
                      }
                      return null;
                    })()}

                    {/* Badges */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${getRoleBadgeColor(
                          user.role
                        )}`}
                      >
                        {user.role === 'admin' ? 'Moderator' : user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>

                      {userGroups.map((group) => (
                        <span
                          key={group.id}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${getGroupBadgeColor(
                            group.slug
                          )}`}
                        >
                          {group.name}
                        </span>
                      ))}

                      {!user.is_active && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expand Icon (Admin Only) */}
                  {isAdmin && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedUser(isExpanded ? null : user.id);
                      }}
                      className="text-gray-400 hover:text-gray-600 transition p-1 cursor-pointer"
                      aria-label={isExpanded ? "Collapse" : "Expand"}
                    >
                      <svg
                        className={`w-5 h-5 transition-transform ${
                          isExpanded ? "rotate-180" : ""
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
                    </div>
                  )}
                </div>
              </button>

              {/* Expanded Edit Panel (Admin Only) */}
              {isAdmin && isExpanded && (
                <div className="px-6 pb-6 border-t border-gray-100 pt-4 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                      Role
                    </label>
                    <select
                      value={user.role}
                      onChange={(e) =>
                        handleRoleChange(user.id, e.target.value)
                      }
                      disabled={loading === user.id}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="client">Client</option>
                      <option value="coach">Coach</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                      Access Groups
                    </label>
                    <div className="space-y-2">
                      {nonSystemGroups.map((group) => {
                        const isMember = user.group_members.some(
                          (gm) => gm.group_id === group.id
                        );
                        return (
                          <label
                            key={group.id}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isMember}
                              onChange={() =>
                                handleToggleGroup(user.id, group.id, isMember)
                              }
                              disabled={loading === user.id}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                            />
                            <span className="text-sm text-gray-700">
                              {group.name}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={user.is_active}
                        onChange={() =>
                          handleToggleActive(user.id, user.is_active)
                        }
                        disabled={loading === user.id}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Active Account
                      </span>
                    </label>
                  </div>

                  {loading === user.id && (
                    <div className="flex items-center gap-2 text-xs text-blue-600">
                      <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      Saving changes...
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {users.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg
              className="w-20 h-20 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {searchQuery || roleFilter !== 'all' || groupFilter !== 'all' 
              ? 'No members match your search'
              : 'Welcome to the community!'}
          </h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            {searchQuery || roleFilter !== 'all' || groupFilter !== 'all'
              ? 'Try adjusting your search or filters to find other members.'
              : 'Members will appear here as they join the community. Check back soon to connect with others!'}
          </p>
        </div>
      )}
    </div>
  );
}
