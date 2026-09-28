"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateSiteSetting } from "@/lib/actions/admin";

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

interface PeopleOnboardingTabProps {
  settings: OnboardingSettings | null;
}

export function PeopleOnboardingTab({ settings }: PeopleOnboardingTabProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const defaultSettings: OnboardingSettings = {
    enabled: true,
    questions: [
      {
        id: "1",
        text: "Where are you joining us from? Please include your state and county, province or country.",
        required: true,
        include_in_bio: true,
        private: false,
      },
      {
        id: "2",
        text: "Which area are you most interested in exploring: tax lien certificates, tax deeds, both... or are you still learning?",
        required: true,
        include_in_bio: false,
        private: false,
      },
      {
        id: "3",
        text: "What is one fun or unexpected fact about you that might help other members get to know you?",
        required: true,
        include_in_bio: true,
        private: false,
      },
    ],
    profile_picture_required: false,
    code_of_conduct_slug: null,
  };

  const [formData, setFormData] = useState<OnboardingSettings>(settings || defaultSettings);

  const handleSave = async () => {
    setLoading(true);
    setSuccess(false);
    setError("");

    const result = await updateSiteSetting({
      key: "onboarding",
      value: formData,
    });

    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  const [error, setError] = useState("");

  const handleAddQuestion = () => {
    setFormData({
      ...formData,
      questions: [
        ...formData.questions,
        {
          id: Date.now().toString(),
          text: "",
          required: false,
          include_in_bio: false,
          private: false,
        },
      ],
    });
  };

  const handleRemoveQuestion = (id: string) => {
    setFormData({
      ...formData,
      questions: formData.questions.filter((q) => q.id !== id),
    });
  };

  const handleQuestionChange = (id: string, field: keyof OnboardingQuestion, value: any) => {
    setFormData({
      ...formData,
      questions: formData.questions.map((q) => (q.id === id ? { ...q, [field]: value } : q)),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-900">
          Configure the steps new members complete before entering your community.
        </p>
      </div>

      {/* Enable/Disable */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="enabled"
          checked={formData.enabled}
          onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="enabled" className="text-sm font-medium text-gray-900">
          Enable onboarding flow
        </label>
      </div>

      {/* Questions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Questions</h3>
          <button
            onClick={handleAddQuestion}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            + Add Question
          </button>
        </div>

        <div className="space-y-4">
          {formData.questions.map((question) => (
            <div key={question.id} className="border border-gray-200 rounded-lg p-4 bg-white">
              <div className="space-y-3">
                <div>
                  <input
                    type="text"
                    value={question.text}
                    onChange={(e) => handleQuestionChange(question.id, "text", e.target.value)}
                    placeholder="Enter question text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>

                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={question.required}
                      onChange={(e) =>
                        handleQuestionChange(question.id, "required", e.target.checked)
                      }
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-900">Required</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={question.include_in_bio}
                      onChange={(e) =>
                        handleQuestionChange(question.id, "include_in_bio", e.target.checked)
                      }
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-900">Include answer in user bio</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={question.private}
                      onChange={(e) =>
                        handleQuestionChange(question.id, "private", e.target.checked)
                      }
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-900">Private</span>
                  </label>
                </div>

                <div>
                  <button
                    onClick={() => handleRemoveQuestion(question.id)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Remove Question
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Profile Picture */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="profile_picture"
          checked={formData.profile_picture_required}
          onChange={(e) =>
            setFormData({ ...formData, profile_picture_required: e.target.checked })
          }
          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="profile_picture" className="text-sm font-medium text-gray-900">
          Require profile picture
        </label>
      </div>

      {/* Code of Conduct */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-1">
          Code of Conduct Document (optional)
        </label>
        <input
          type="text"
          value={formData.code_of_conduct_slug || ""}
          onChange={(e) =>
            setFormData({ ...formData, code_of_conduct_slug: e.target.value || null })
          }
          placeholder="Enter document slug"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
        />
        <p className="mt-1 text-xs text-gray-500">
          Enter the slug of a document to require acceptance during onboarding
        </p>
      </div>

      {/* Save Button */}
      <div className="space-y-3 pt-4 border-t border-gray-200">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
            Settings saved successfully!
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium"
        >
          {loading ? "Saving..." : "Save Settings"}
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-sm text-amber-900">
          <strong>Note:</strong> Onboarding settings are saved to site_settings. Full integration with the
          signup/profile completion flow is partially implemented. Questions will be displayed during profile
          setup when the feature is fully wired.
        </p>
      </div>
    </div>
  );
}
