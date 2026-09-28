"use client";

import { useState } from "react";
import { updateOwnProfile } from "@/lib/actions/profile";
import { useRouter } from "next/navigation";

interface EditProfileFormProps {
  initialData: {
    full_name: string | null;
    bio: string | null;
    headline: string | null;
    location: string | null;
  };
  onCancel: () => void;
}

export function EditProfileForm({ initialData, onCancel }: EditProfileFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: initialData.full_name || "",
    bio: initialData.bio || "",
    headline: initialData.headline || "",
    location: initialData.location || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await updateOwnProfile(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.refresh();
      onCancel();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg shadow p-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Edit Profile</h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
          Full Name
        </label>
        <input
          type="text"
          id="full_name"
          value={formData.full_name}
          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Your full name"
        />
      </div>

      <div>
        <label htmlFor="headline" className="block text-sm font-medium text-gray-700 mb-2">
          Headline
          <span className="text-gray-500 font-normal ml-1">(Optional, max 80 chars)</span>
        </label>
        <input
          type="text"
          id="headline"
          value={formData.headline}
          onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
          maxLength={80}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Your role or tagline"
        />
        <p className="text-xs text-gray-500 mt-1">
          {formData.headline.length}/80 characters
        </p>
      </div>

      <div>
        <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
          Location
          <span className="text-gray-500 font-normal ml-1">(Optional)</span>
        </label>
        <input
          type="text"
          id="location"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          maxLength={80}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="City, Country"
        />
      </div>

      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
          Bio
          <span className="text-gray-500 font-normal ml-1">(Optional, max 500 chars)</span>
        </label>
        <textarea
          id="bio"
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          maxLength={500}
          rows={5}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Tell other members about yourself..."
        />
        <p className="text-xs text-gray-500 mt-1">
          {formData.bio.length}/500 characters
        </p>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
