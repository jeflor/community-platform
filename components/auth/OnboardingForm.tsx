"use client";

import { useState } from "react";
import { completeOnboarding } from "@/lib/actions/onboarding";
import type { ThemeSettings } from "@/lib/settings/get-theme";

interface OnboardingQuestion {
  id: string;
  text: string;
  required: boolean;
  include_in_bio: boolean;
  private: boolean;
}

interface OnboardingSettings {
  enabled: boolean;
  questions: OnboardingQuestion[];
  profile_picture_required: boolean;
  code_of_conduct_slug: string | null;
}

interface OnboardingFormProps {
  theme: ThemeSettings;
  siteName: string;
  settings: OnboardingSettings;
}

export function OnboardingForm({ theme, siteName, settings }: OnboardingFormProps) {
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [codeOfConductAccepted, setCodeOfConductAccepted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validate required questions
    const missingRequired = settings.questions
      .filter((q) => q.required && !answers[q.id]?.trim())
      .map((q) => q.text);

    if (missingRequired.length > 0) {
      setError(`Please answer all required questions`);
      setLoading(false);
      return;
    }

    // Validate profile picture if required
    if (settings.profile_picture_required && !profilePicture) {
      setError("Profile picture is required");
      setLoading(false);
      return;
    }

    // Validate code of conduct if required
    if (settings.code_of_conduct_slug && !codeOfConductAccepted) {
      setError("You must accept the Code of Conduct to continue");
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("answers", JSON.stringify(answers));
      formData.append("questions", JSON.stringify(settings.questions));
      if (profilePicture) {
        formData.append("profilePicture", profilePicture);
      }

      const result = await completeOnboarding(formData);
      if (result && "error" in result && result.error) {
        setError(result.error);
      }
      // Success redirect is handled by the server action
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to {siteName}!
          </h1>
          <p className="text-gray-600">
            Let's complete your profile to get started
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Picture */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Profile Picture{settings.profile_picture_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setProfilePicture(e.target.files?.[0] || null)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ "--tw-ring-color": theme.primary_color } as React.CSSProperties}
              required={settings.profile_picture_required}
            />
            {profilePicture && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: {profilePicture.name}
              </p>
            )}
          </div>

          {/* Questions */}
          {settings.questions.map((question) => (
            <div key={question.id}>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                {question.text}
                {question.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <textarea
                value={answers[question.id] || ""}
                onChange={(e) =>
                  setAnswers({ ...answers, [question.id]: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent resize-none"
                style={{ "--tw-ring-color": theme.primary_color } as React.CSSProperties}
                placeholder="Your answer..."
                required={question.required}
              />
            </div>
          ))}

          {/* Code of Conduct */}
          {settings.code_of_conduct_slug && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={codeOfConductAccepted}
                  onChange={(e) => setCodeOfConductAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  required
                />
                <span className="text-sm text-gray-900">
                  I have read and agree to the{" "}
                  <a
                    href={`/resources/${settings.code_of_conduct_slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:underline"
                    style={{ color: theme.primary_color }}
                  >
                    Code of Conduct
                  </a>
                  <span className="text-red-500 ml-1">*</span>
                </span>
              </label>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white py-3 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
            style={{ backgroundColor: theme.primary_color }}
          >
            {loading ? "Completing Profile..." : "Complete Profile"}
          </button>
        </form>
      </div>
    </div>
  );
}
