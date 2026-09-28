"use client";

import { useState } from "react";
import { signOut } from "@/lib/actions/auth";
import { updateProfile, updatePassword, updateNotificationPrefs, uploadAvatar } from "@/lib/actions/user";
import type { ThemeSettings } from "@/lib/settings/get-theme";
import Image from "next/image";

interface AccountSettingsProps {
  user: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string;
    bio?: string | null;
    headline?: string | null;
    location?: string | null;
  };
  notificationPrefs: {
    dm_email: boolean;
    mention_email: boolean;
    event_reminder_email: boolean;
    weekly_digest_email: boolean;
  };
  theme: ThemeSettings;
}

export function AccountSettings({ user, notificationPrefs, theme }: AccountSettingsProps) {
  const [fullName, setFullName] = useState(user.full_name);
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url);
  const [bio, setBio] = useState(user.bio || "");
  const [headline, setHeadline] = useState(user.headline || "");
  const [location, setLocation] = useState(user.location || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [prefs, setPrefs] = useState(notificationPrefs);
  const [uploading, setUploading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  async function handleProfileUpdate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!fullName.trim()) {
      setError("Full name is required");
      return;
    }

    setSavingProfile(true);

    try {
      const result = await updateProfile({ 
        fullName, 
        avatarUrl, 
        bio, 
        headline, 
        location 
      });

      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess("Profile updated successfully!");
      }
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!newPassword || !confirmPassword) {
      setError("Please enter both password fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setSavingPassword(true);

    try {
      const result = await updatePassword(newPassword);

      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess("Password updated successfully!");
        setNewPassword("");
        setConfirmPassword("");
      }
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleNotificationPrefsUpdate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSavingPrefs(true);

    try {
      const result = await updateNotificationPrefs(prefs);

      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess("Notification preferences updated!");
      }
    } finally {
      setSavingPrefs(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setSuccess("");

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a valid image file (JPG, PNG, GIF, or WEBP)");
      e.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("File size must be less than 2MB");
      e.target.value = "";
      return;
    }

    setUploading(true);

    try {
      const result = await uploadAvatar(file);

      if (result?.error) {
        setError(result.error);
      } else if (result?.url) {
        setAvatarUrl(result.url);
        setSuccess("Avatar uploaded successfully!");
      }
    } catch (err) {
      setError("Failed to upload avatar. Please try again.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleLogout() {
    await signOut();
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Profile Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Profile Information</h2>
          <p className="text-sm text-gray-600">Update your personal information and profile details</p>
        </div>
        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Avatar
            </label>
            <div className="flex items-center gap-4">
              {avatarUrl ? (
                <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200">
                  <Image
                    src={avatarUrl}
                    alt="Avatar"
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-semibold border-2 border-gray-200"
                  style={{ backgroundColor: theme.primary_color }}
                >
                  {fullName ? fullName.charAt(0).toUpperCase() : "?"}
                </div>
              )}
              <div className="flex-1">
                <label className="cursor-pointer inline-block">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleAvatarUpload}
                    disabled={uploading}
                    className="hidden"
                    id="avatar-upload"
                  />
                  <span 
                    className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition inline-block disabled:opacity-50 disabled:cursor-not-allowed"
                    style={uploading ? { opacity: 0.5, cursor: "not-allowed" } : {}}
                  >
                    {uploading ? "Uploading..." : "Upload New Photo"}
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1">JPG, PNG, GIF, or WEBP. Max 2MB.</p>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="avatarUrl" className="block text-sm font-medium text-gray-900 mb-1">
              Avatar URL
            </label>
            <input
              id="avatarUrl"
              type="url"
              value={avatarUrl}
              onChange={(e) => {
                setAvatarUrl(e.target.value);
                clearMessages();
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent text-gray-900"
              style={{ "--tw-ring-color": theme.primary_color } as React.CSSProperties}
              placeholder="https://example.com/avatar.jpg"
            />
            <p className="text-xs text-gray-500 mt-1">Or upload a file above</p>
          </div>

          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-900 mb-1">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                clearMessages();
              }}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent text-gray-900"
              style={{ "--tw-ring-color": theme.primary_color } as React.CSSProperties}
            />
          </div>

          <div>
            <label htmlFor="headline" className="block text-sm font-medium text-gray-900 mb-1">
              Headline
            </label>
            <input
              id="headline"
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value.slice(0, 80))}
              maxLength={80}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent text-gray-900"
              style={{ "--tw-ring-color": theme.primary_color } as React.CSSProperties}
              placeholder="Your professional headline or tagline"
            />
            <p className="text-xs text-gray-500 mt-1">{headline.length}/80 characters</p>
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-900 mb-1">
              Location
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value.slice(0, 80))}
              maxLength={80}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent text-gray-900"
              style={{ "--tw-ring-color": theme.primary_color } as React.CSSProperties}
              placeholder="Your city, state, or country"
            />
            <p className="text-xs text-gray-500 mt-1">{location.length}/80 characters</p>
          </div>

          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-900 mb-1">
              Bio
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 500))}
              maxLength={500}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent resize-none text-gray-900"
              style={{ "--tw-ring-color": theme.primary_color } as React.CSSProperties}
              placeholder="Tell us about yourself..."
            />
            <p className="text-xs text-gray-500 mt-1">{bio.length}/500 characters</p>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={user.email}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
            />
          </div>

          <button
            type="submit"
            disabled={savingProfile || uploading}
            className="px-6 py-2 text-white rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: theme.primary_color }}
          >
            {savingProfile ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </div>

      {/* Password Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Change Password</h2>
          <p className="text-sm text-gray-600">Update your password to keep your account secure</p>
        </div>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-900 mb-1">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                clearMessages();
              }}
              minLength={8}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent text-gray-900"
              style={{ "--tw-ring-color": theme.primary_color } as React.CSSProperties}
              placeholder="••••••••"
            />
            <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-900 mb-1">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                clearMessages();
              }}
              minLength={8}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent text-gray-900"
              style={{ "--tw-ring-color": theme.primary_color } as React.CSSProperties}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={savingPassword}
            className="px-6 py-2 text-white rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: theme.primary_color }}
          >
            {savingPassword ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>

      {/* Notification Preferences Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Notification Preferences</h2>
          <p className="text-sm text-gray-600">Manage your email notification settings</p>
          <p className="text-xs text-gray-500 mt-1">Note: Email delivery is not yet configured</p>
        </div>
        <form onSubmit={handleNotificationPrefsUpdate} className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.dm_email}
              onChange={(e) => setPrefs({ ...prefs, dm_email: e.target.checked })}
              className="w-4 h-4 rounded"
              style={{ accentColor: theme.primary_color }}
            />
            <span className="text-sm text-gray-900">Email me about direct messages</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.mention_email}
              onChange={(e) => setPrefs({ ...prefs, mention_email: e.target.checked })}
              className="w-4 h-4 rounded"
              style={{ accentColor: theme.primary_color }}
            />
            <span className="text-sm text-gray-900">Email me when I&apos;m mentioned</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.event_reminder_email}
              onChange={(e) => setPrefs({ ...prefs, event_reminder_email: e.target.checked })}
              className="w-4 h-4 rounded"
              style={{ accentColor: theme.primary_color }}
            />
            <span className="text-sm text-gray-900">Email me event reminders</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.weekly_digest_email}
              onChange={(e) => setPrefs({ ...prefs, weekly_digest_email: e.target.checked })}
              className="w-4 h-4 rounded"
              style={{ accentColor: theme.primary_color }}
            />
            <span className="text-sm text-gray-900">Send me weekly digest emails</span>
          </label>

          <button
            type="submit"
            disabled={savingPrefs}
            className="px-6 py-2 text-white rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: theme.primary_color }}
          >
            {savingPrefs ? "Saving..." : "Save Preferences"}
          </button>
        </form>
      </div>

      {/* Logout Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Session</h2>
          <p className="text-sm text-gray-600">Sign out from your account</p>
        </div>
        <button
          onClick={handleLogout}
          className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition"
        >
          Log Out
        </button>
      </div>
    </div>
  );
}
