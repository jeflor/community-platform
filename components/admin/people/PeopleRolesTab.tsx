"use client";

export function PeopleRolesTab() {
  const roles = [
    {
      id: "admin",
      name: "Administrator",
      description:
        "Full administrative access to the community. Can manage settings, members, roles, content, and all community features.",
      permissions: [
        "Manage site settings and theme",
        "Manage community sidebar and navigation",
        "Manage all members, roles, and access groups",
        "Create and manage courses, lessons, and events",
        "Manage documents and content",
        "Access all locked content",
        "Configure banners and locked messages",
      ],
    },
    {
      id: "coach",
      name: "Coach",
      description:
        "Can view student profiles, add notes, and manage assigned content. Limited administrative access.",
      permissions: [
        "View student profiles and notes",
        "Add coaching notes",
        "Access assigned courses",
        "Limited member management",
      ],
    },
    {
      id: "client",
      name: "Member",
      description: "Standard community member with access to content based on their group memberships.",
      permissions: [
        "Access permitted content",
        "Participate in community",
        "Update own profile",
        "Join channels and events",
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-900">
          Configure permission sets for members who help manage your community.
        </p>
      </div>

      {/* Roles List */}
      <div className="space-y-4">
        {roles.map((role) => (
          <div key={role.id} className="border border-gray-200 rounded-lg p-6 bg-white">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{role.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{role.description}</p>
              </div>
            </div>

            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Permissions</h4>
              <ul className="space-y-2">
                {role.permissions.map((permission, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                    <svg
                      className="w-5 h-5 text-green-500 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>{permission}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>Note:</strong> Community Platform uses a fixed three-role system (Administrator, Coach, Member).
          Custom roles and granular permission toggles are not currently supported. Permissions shown above
          reflect the actual access control enforced by the application.
        </p>
      </div>
    </div>
  );
}
