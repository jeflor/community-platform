"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  last_seen: string | null;
  created_at: string;
}

interface PeopleLeadsTabProps {
  leads: User[];
}

export function PeopleLeadsTab({ leads }: PeopleLeadsTabProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filteredLeads = leads.filter((lead) => {
    const name = lead.full_name || lead.email;
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const handleExportCSV = async () => {
    // Create CSV content
    const headers = ["Name", "Email", "Status", "Last Seen"];
    const rows = filteredLeads.map((lead) => [
      lead.full_name || lead.email,
      lead.email,
      "Onboarding",
      lead.last_seen ? new Date(lead.last_seen).toLocaleDateString() : "Never",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // Download
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads.csv";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-900">
            Manage your onboarding, hot, warm, and cold leads.
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium text-sm"
        >
          Export CSV
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">All</span>
        <span className="text-sm font-semibold text-gray-900">{filteredLeads.length}</span>
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Leads Table */}
      {filteredLeads.length > 0 ? (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lead
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Seen
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLeads.map((lead) => {
                const displayName = lead.full_name || lead.email;
                const lastSeen = lead.last_seen
                  ? new Date(lead.last_seen).toLocaleDateString()
                  : "Never";

                return (
                  <tr
                    key={lead.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/dashboard/members/${lead.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {lead.avatar_url ? (
                            <img
                              src={lead.avatar_url}
                              alt={displayName}
                              className="h-10 w-10 rounded-full"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-400 flex items-center justify-center text-white font-medium">
                              {displayName[0]?.toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{displayName}</div>
                          <div className="text-sm text-gray-500">{lead.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        Onboarding
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lastSeen}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <p>No leads found</p>
          <p className="text-sm mt-2">Users with incomplete profiles (missing name or both headline and bio) will appear here</p>
        </div>
      )}
    </div>
  );
}
