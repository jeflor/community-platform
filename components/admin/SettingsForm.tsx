"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateSiteSetting, uploadLogo } from "@/lib/actions/admin";
import { BannersManager } from "./BannersManager";

interface SettingsFormProps {
  settings: Record<string, unknown>;
  availableGroups?: Array<{ slug: string; name: string }>;
}

type Section = "community" | "content" | "appearance";
type SubTab = "general" | "members" | "navigation" | "sidebar" | "locked" | "banners" | "theme";

export function SettingsForm({ settings, availableGroups = [] }: SettingsFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState<Section>("community");
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("general");

  const sidebarDefaults = (settings.sidebar_defaults as { admin_width: number; user_width: number }) || {
    admin_width: 320,
    user_width: 280,
  };

  const memberDefaults = (settings.member_defaults as { weekly_digest: boolean; pending_user_followups: boolean }) || {
    weekly_digest: true,
    pending_user_followups: true,
  };

  const lockedMessages = (settings.locked_messages as {
    courses: string;
    channels: string;
    events: string;
    documents: string;
  }) || {
    courses: settings.locked_message_text || "This content is available to premium members.",
    channels: settings.locked_message_text || "This channel is available to premium members.",
    events: settings.locked_message_text || "This event is available to premium members.",
    documents: settings.locked_message_text || "This document is available to premium members.",
  };

  const themeSettings = (settings.theme as { 
    primary_color: string; 
    logo_url: string;
    background_color: string;
    gradient_start: string;
    gradient_end: string;
    sidebar_gradient: boolean;
  }) || {
    primary_color: "#3b82f6",
    logo_url: "",
    background_color: "#FFFFFF",
    gradient_start: "#EAF0FB",
    gradient_end: "#FBF5D6",
    sidebar_gradient: false,
  };

  const navItems = (settings.nav_items as Array<{
    id: string;
    enabled: boolean;
    label: string;
    href: string;
    group_slugs: string[];
    is_custom: boolean;
  }>) || [];

  const [formData, setFormData] = useState({
    siteName: (settings.site_name as string) || process.env.NEXT_PUBLIC_SITE_NAME || "Community Platform",
    siteTagline: (settings.site_tagline as string) || "",
    supportEmail: (settings.support_email as string) || "",
    directMessagingEnabled: settings.direct_messaging_enabled === "true" ? true : (settings.direct_messaging_enabled === "false" ? false : true),
    showPoweredBy: settings.show_powered_by === "true",
    weeklyDigest: memberDefaults.weekly_digest,
    pendingUserFollowups: memberDefaults.pending_user_followups,
    navItems: navItems,
    adminWidth: sidebarDefaults.admin_width,
    userWidth: sidebarDefaults.user_width,
    lockedMessageEnabled: settings.locked_message_enabled === "true",
    lockedMessages: lockedMessages,
    primaryColor: themeSettings.primary_color,
    logoUrl: themeSettings.logo_url,
    backgroundColor: themeSettings.background_color,
    gradientStart: themeSettings.gradient_start,
    gradientEnd: themeSettings.gradient_end,
    sidebarGradient: themeSettings.sidebar_gradient,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess("");

    await updateSiteSetting({
      key: "site_name",
      value: formData.siteName,
    });

    await updateSiteSetting({
      key: "site_tagline",
      value: formData.siteTagline,
    });

    await updateSiteSetting({
      key: "support_email",
      value: formData.supportEmail,
    });

    await updateSiteSetting({
      key: "direct_messaging_enabled",
      value: formData.directMessagingEnabled ? "true" : "false",
    });

    await updateSiteSetting({
      key: "show_powered_by",
      value: formData.showPoweredBy ? "true" : "false",
    });

    await updateSiteSetting({
      key: "member_defaults",
      value: {
        weekly_digest: formData.weeklyDigest,
        pending_user_followups: formData.pendingUserFollowups,
      },
    });

    await updateSiteSetting({
      key: "nav_items",
      value: formData.navItems,
    });

    await updateSiteSetting({
      key: "sidebar_defaults",
      value: {
        admin_width: formData.adminWidth,
        user_width: formData.userWidth,
      },
    });

    await updateSiteSetting({
      key: "locked_message_enabled",
      value: formData.lockedMessageEnabled ? "true" : "false",
    });

    await updateSiteSetting({
      key: "locked_messages",
      value: formData.lockedMessages,
    });

    await updateSiteSetting({
      key: "theme",
      value: {
        primary_color: formData.primaryColor,
        logo_url: formData.logoUrl,
        background_color: formData.backgroundColor,
        gradient_start: formData.gradientStart,
        gradient_end: formData.gradientEnd,
        sidebar_gradient: formData.sidebarGradient,
      },
    });

    setSuccess("Settings updated successfully!");
    setLoading(false);
    setError("");
    router.refresh();
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("File size must be less than 2MB");
      return;
    }

    setUploadingLogo(true);
    setError("");
    setSuccess("");

    try {
      const result = await uploadLogo(file);

      if (result?.error) {
        setError(result.error);
      } else if (result?.url) {
        setFormData({ ...formData, logoUrl: result.url });
        setSuccess("Logo uploaded successfully! Don't forget to save settings.");
      }
    } catch (err) {
      setError("Failed to upload logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const sections: { id: Section; label: string; subTabs: { id: SubTab; label: string }[] }[] = [
    {
      id: "community",
      label: "Community",
      subTabs: [
        { id: "general", label: "General" },
        { id: "members", label: "Member Defaults" },
      ],
    },
    {
      id: "content",
      label: "Content",
      subTabs: [
        { id: "locked", label: "Locked Messages" },
        { id: "banners", label: "Banners" },
        { id: "sidebar", label: "Sidebar" },
        { id: "navigation", label: "Navigation" },
      ],
    },
    {
      id: "appearance",
      label: "Appearance",
      subTabs: [
        { id: "theme", label: "Theme" },
      ],
    },
  ];

  const currentSection = sections.find((s) => s.id === activeSection)!;

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="sticky top-0 bg-white z-10 border-b border-gray-200">
        <nav className="flex -mb-px space-x-8 px-6 overflow-x-auto" aria-label="Sections">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => {
                setActiveSection(section.id);
                setActiveSubTab(section.subTabs[0].id);
              }}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex-shrink-0
                ${
                  activeSection === section.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }
              `}
            >
              {section.label}
            </button>
          ))}
        </nav>
        <nav className="flex flex-wrap gap-2 px-6 py-3 bg-gray-50 border-t border-gray-200" aria-label="Subtabs">
          {currentSection.subTabs.map((subTab) => (
            <button
              key={subTab.id}
              onClick={() => setActiveSubTab(subTab.id)}
              className={`
                px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${
                  activeSubTab === subTab.id
                    ? "bg-blue-100 text-blue-700"
                    : "bg-white text-gray-600 hover:bg-gray-100"
                }
              `}
            >
              {subTab.label}
            </button>
          ))}
        </nav>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        <div className="space-y-6">
          {activeSubTab === "general" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Community Name
                </label>
                <input
                  type="text"
                  value={formData.siteName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      siteName: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Community Platform"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Shown across the app, emails, sign-up pages, and the app.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Tagline (optional)
                </label>
                <input
                  type="text"
                  value={formData.siteTagline}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      siteTagline: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., A community for everyone"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Support Email (optional)
                </label>
                <input
                  type="email"
                  value={formData.supportEmail}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      supportEmail: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="support@example.com"
                />
              </div>
              <div className="space-y-3 pt-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="directMessaging"
                    checked={formData.directMessagingEnabled}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        directMessagingEnabled: e.target.checked,
                      })
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="directMessaging" className="ml-2 text-sm font-medium text-gray-900">
                    Enable direct messaging (feature not yet implemented)
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="showPoweredBy"
                    checked={formData.showPoweredBy}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        showPoweredBy: e.target.checked,
                      })
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="showPoweredBy" className="ml-2 text-sm font-medium text-gray-900">
                    Show &quot;Powered by&quot; branding
                  </label>
                </div>
              </div>
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>Email Delivery (Phase 7):</strong> Email notifications are scaffolded but require <code className="bg-blue-100 px-1.5 py-0.5 rounded text-xs">RESEND_API_KEY</code> environment variable to be set for live delivery.
                </p>
              </div>
            </div>
          )}

          {activeSubTab === "members" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Member Defaults</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Defaults that affect member profiles, messaging, and activity.
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      id="weeklyDigest"
                      checked={formData.weeklyDigest}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          weeklyDigest: e.target.checked,
                        })
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3">
                    <label htmlFor="weeklyDigest" className="text-sm font-medium text-gray-900">
                      Weekly digest
                    </label>
                    <p className="text-sm text-gray-500">
                      Send members a weekly summary of community activity.
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      id="pendingUserFollowups"
                      checked={formData.pendingUserFollowups}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          pendingUserFollowups: e.target.checked,
                        })
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3">
                    <label htmlFor="pendingUserFollowups" className="text-sm font-medium text-gray-900">
                      Pending user follow-ups
                    </label>
                    <p className="text-sm text-gray-500">
                      Send 3 follow-up emails over the course of a week when someone starts onboarding but does not finish.
                      <span className="block mt-1 text-amber-600">
                        Note: Email delivery will be available in Phase 7 (Resend integration).
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === "navigation" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Navigation Items</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Configure top-level navigation items and control which groups can see them.
                </p>
              </div>
              <div className="space-y-3">
                {formData.navItems.map((item, index) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex items-center h-5 pt-1">
                        <input
                          type="checkbox"
                          id={`nav-${item.id}`}
                          checked={item.enabled}
                          onChange={(e) => {
                            const updated = [...formData.navItems];
                            updated[index].enabled = e.target.checked;
                            setFormData({ ...formData, navItems: updated });
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">
                            Label
                          </label>
                          <input
                            type="text"
                            value={item.label}
                            onChange={(e) => {
                              const updated = [...formData.navItems];
                              updated[index].label = e.target.value;
                              setFormData({ ...formData, navItems: updated });
                            }}
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        {item.is_custom && (
                          <div>
                            <label className="block text-sm font-medium text-gray-900 mb-1">
                              URL
                            </label>
                            <input
                              type="text"
                              value={item.href}
                              onChange={(e) => {
                                const updated = [...formData.navItems];
                                updated[index].href = e.target.value;
                                setFormData({ ...formData, navItems: updated });
                              }}
                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        )}
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-900 mb-1">
                            Access Groups (comma-separated slugs)
                          </label>
                          <input
                            type="text"
                            value={item.group_slugs.join(", ")}
                            onChange={(e) => {
                              const updated = [...formData.navItems];
                              updated[index].group_slugs = e.target.value
                                .split(",")
                                .map(s => s.trim())
                                .filter(s => s.length > 0);
                              setFormData({ ...formData, navItems: updated });
                            }}
                            placeholder="e.g., free-members, paid-students"
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Leave empty for all authenticated users. Admins always see all items.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const newItem = {
                      id: `custom-${Date.now()}`,
                      enabled: true,
                      label: "New Link",
                      href: "/",
                      group_slugs: [],
                      is_custom: true,
                    };
                    setFormData({ ...formData, navItems: [...formData.navItems, newItem] });
                  }}
                  className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  + Add Custom Link
                </button>
              </div>
            </div>
          )}

          {activeSubTab === "sidebar" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Sidebar Width Defaults</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Default sidebar widths for admin and regular users (200-480px).
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Admin Default Width (px)
                  </label>
                  <input
                    type="number"
                    min="200"
                    max="480"
                    value={formData.adminWidth}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        adminWidth: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    User Default Width (px)
                  </label>
                  <input
                    type="number"
                    min="200"
                    max="480"
                    value={formData.userWidth}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        userWidth: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {activeSubTab === "banners" && (
            <BannersManager availableGroups={availableGroups} />
          )}

          {activeSubTab === "locked" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Locked Content Messages</h3>
                <div className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    id="lockedMessageEnabled"
                    checked={formData.lockedMessageEnabled}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        lockedMessageEnabled: e.target.checked,
                      })
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="lockedMessageEnabled"
                    className="ml-2 text-sm font-medium text-gray-900"
                  >
                    Enable locked content messages
                  </label>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Courses Locked Message
                  </label>
                  <textarea
                    value={formData.lockedMessages.courses}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        lockedMessages: {
                          ...formData.lockedMessages,
                          courses: e.target.value,
                        },
                      })
                    }
                    rows={2}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Channels Locked Message
                  </label>
                  <textarea
                    value={formData.lockedMessages.channels}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        lockedMessages: {
                          ...formData.lockedMessages,
                          channels: e.target.value,
                        },
                      })
                    }
                    rows={2}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Events Locked Message
                  </label>
                  <textarea
                    value={formData.lockedMessages.events}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        lockedMessages: {
                          ...formData.lockedMessages,
                          events: e.target.value,
                        },
                      })
                    }
                    rows={2}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Documents Locked Message
                  </label>
                  <textarea
                    value={formData.lockedMessages.documents}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        lockedMessages: {
                          ...formData.lockedMessages,
                          documents: e.target.value,
                        },
                      })
                    }
                    rows={2}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {activeSubTab === "theme" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Theme Settings</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Customize the look and feel of your community.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Primary Accent Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        primaryColor: e.target.value,
                      })
                    }
                    className="h-10 w-20 border rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.primaryColor}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        primaryColor: e.target.value,
                      })
                    }
                    className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="#3b82f6"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Logo URL (optional)
                </label>
                <input
                  type="url"
                  value={formData.logoUrl}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      logoUrl: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/logo.png"
                />
                <div className="mt-2">
                  <label className="inline-block cursor-pointer px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm">
                    {uploadingLogo ? "Uploading..." : "Upload Logo"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-1">Max 2MB (JPG, PNG, GIF, WEBP, SVG)</p>
                </div>
                {formData.logoUrl && (
                  <div className="mt-2">
                    <img
                      src={formData.logoUrl}
                      alt="Logo preview"
                      className="h-12 object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Background Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.backgroundColor}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          backgroundColor: e.target.value,
                        })
                      }
                      className="h-10 w-20 border rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.backgroundColor}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          backgroundColor: e.target.value,
                        })
                      }
                      className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="#FFFFFF"
                    />
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Gradient Colors</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Gradient Start
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={formData.gradientStart}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            gradientStart: e.target.value,
                          })
                        }
                        className="h-10 w-20 border rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.gradientStart}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            gradientStart: e.target.value,
                          })
                        }
                        className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="#EAF0FB"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Gradient End
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={formData.gradientEnd}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            gradientEnd: e.target.value,
                          })
                        }
                        className="h-10 w-20 border rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.gradientEnd}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            gradientEnd: e.target.value,
                          })
                        }
                        className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="#FBF5D6"
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center">
                  <input
                    type="checkbox"
                    id="sidebarGradient"
                    checked={formData.sidebarGradient}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sidebarGradient: e.target.checked,
                      })
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="sidebarGradient" className="ml-2 text-sm font-medium text-gray-900">
                    Apply gradient to sidebar background
                  </label>
                </div>
              </div>
            </div>
          )}

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

          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
