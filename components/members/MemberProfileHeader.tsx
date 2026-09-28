"use client";

import type { MemberProfile } from "@/lib/actions/members";
import { formatLastSeen } from "@/lib/utils/date";
import { MemberDeactivateButton } from "./MemberDeactivateButton";
import { useState } from "react";
import { EditProfileForm } from "./EditProfileForm";

interface MemberProfileHeaderProps {
  member: MemberProfile;
  isAdmin: boolean;
  currentUserId: string;
}

export function MemberProfileHeader({
  member,
  isAdmin,
  currentUserId,
}: MemberProfileHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const isOwnProfile = currentUserId === member.id;
  const displayName = member.full_name || member.email;
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const nonSystemGroups = member.group_members.filter(
    (gm) => !["everyone", "team"].includes(gm.access_groups.slug)
  );

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
    if (slug === "paid-students")
      return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    if (slug === "free-members")
      return "bg-sky-100 text-sky-700 border border-sky-200";
    return "bg-orange-100 text-orange-700 border border-orange-200";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Show edit form if editing
  if (isEditing) {
    return (
      <div className="p-6 sm:p-8">
        <EditProfileForm
          initialData={{
            full_name: member.full_name,
            bio: member.bio,
            headline: member.headline,
            location: member.location,
          }}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-start gap-6">
        {/* Avatar */}
        {member.avatar_url ? (
          <img
            src={member.avatar_url}
            alt={displayName}
            className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover flex-shrink-0 shadow-lg"
          />
        ) : (
          <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-emerald-400 via-blue-500 to-purple-500 text-white rounded-full flex items-center justify-center text-3xl sm:text-4xl font-semibold flex-shrink-0 shadow-lg">
            {initials}
          </div>
        )}

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">
              {displayName}
            </h1>
            
            {/* Edit Button for Own Profile */}
            {isOwnProfile && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-600 rounded-lg hover:bg-blue-50 transition flex-shrink-0"
              >
                Edit Profile
              </button>
            )}
          </div>

          {/* Headline */}
          {member.headline && (
            <p className="text-lg text-gray-700 font-medium mb-2 break-words">
              {member.headline}
            </p>
          )}

          {/* Location */}
          {member.location && (
            <p className="text-sm text-gray-600 mb-3 break-words flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {member.location}
            </p>
          )}

          {/* Bio */}
          {member.bio && (
            <p className="text-sm text-gray-700 mb-4 break-words whitespace-pre-wrap">
              {member.bio}
            </p>
          )}

          {/* Email (admin only) */}
          {isAdmin && member.email && (
            <p className="text-base text-gray-600 mb-4 break-words">
              {member.email}
            </p>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-semibold ${getRoleBadgeColor(
                member.role
              )}`}
            >
              {member.role === "admin"
                ? "Moderator"
                : member.role.charAt(0).toUpperCase() + member.role.slice(1)}
            </span>

            {nonSystemGroups.map((gm) => (
              <span
                key={gm.group_id}
                className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-semibold ${getGroupBadgeColor(
                  gm.access_groups.slug
                )}`}
              >
                {gm.access_groups.name}
              </span>
            ))}

            {!member.is_active && (
              <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-semibold bg-red-100 text-red-700 border border-red-200">
                Inactive
              </span>
            )}
          </div>

          {/* Member Since */}
          <p className="text-sm text-gray-500">
            Member since {formatDate(member.created_at)}
          </p>

          {/* Last Seen */}
          {(() => {
            const lastSeenStatus = formatLastSeen(member.last_seen);
            if (lastSeenStatus) {
              return (
                <p className={`text-sm mt-1 ${lastSeenStatus.isOnline ? 'text-green-600 font-semibold' : 'text-gray-400'}`}>
                  {lastSeenStatus.text}
                </p>
              );
            }
            return null;
          })()}
        </div>
      </div>

      {/* Admin Deactivate/Reactivate Button */}
      {isAdmin && currentUserId !== member.id && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <MemberDeactivateButton
            userId={member.id}
            isActive={member.is_active}
            memberName={member.full_name || member.email}
          />
        </div>
      )}
    </div>
  );
}
