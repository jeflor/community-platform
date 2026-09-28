"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PeopleMembersTab } from "./people/PeopleMembersTab";
import { PeopleAccessGroupsTab } from "./people/PeopleAccessGroupsTab";
import { PeopleRolesTab } from "./people/PeopleRolesTab";
import { PeopleSignUpLinksTab } from "./people/PeopleSignUpLinksTab";
import { PeopleOnboardingTab } from "./people/PeopleOnboardingTab";
import { PeopleLeadsTab } from "./people/PeopleLeadsTab";

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
  description: string | null;
  is_system: boolean;
  group_members: { count: number }[];
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

interface PeopleSettingsProps {
  initialTab: string;
  members: User[];
  groups: Group[];
  leads: User[];
  signupLinks: SignupLink[];
  onboardingSettings: any;
}

type Tab = "members" | "leads" | "onboarding" | "signup-links" | "access-groups" | "roles";

export function PeopleSettings({
  initialTab,
  members,
  groups,
  leads,
  signupLinks,
  onboardingSettings,
}: PeopleSettingsProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>(initialTab as Tab);

  const tabs: { id: Tab; label: string }[] = [
    { id: "members", label: "Members" },
    { id: "leads", label: "Leads" },
    { id: "onboarding", label: "Onboarding" },
    { id: "signup-links", label: "Sign Up Links" },
    { id: "access-groups", label: "Access Groups" },
    { id: "roles", label: "Roles" },
  ];

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    router.push(`/dashboard/settings/people?tab=${tab}`);
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`
                whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm
                ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === "members" && (
          <PeopleMembersTab members={members} groups={groups} />
        )}
        {activeTab === "leads" && (
          <PeopleLeadsTab leads={leads} />
        )}
        {activeTab === "onboarding" && (
          <PeopleOnboardingTab settings={onboardingSettings} />
        )}
        {activeTab === "signup-links" && (
          <PeopleSignUpLinksTab groups={groups} signupLinks={signupLinks} />
        )}
        {activeTab === "access-groups" && (
          <PeopleAccessGroupsTab groups={groups} />
        )}
        {activeTab === "roles" && <PeopleRolesTab />}
      </div>
    </div>
  );
}
