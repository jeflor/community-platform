"use client";

import { useState } from "react";
import { setMemberActive } from "@/lib/actions/admin";
import { useRouter } from "next/navigation";

interface MemberDeactivateButtonProps {
  userId: string;
  isActive: boolean;
  memberName: string;
}

export function MemberDeactivateButton({
  userId,
  isActive,
  memberName,
}: MemberDeactivateButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleToggleActive = async () => {
    setLoading(true);
    setError(null);

    const result = await setMemberActive(userId, !isActive);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setShowConfirm(false);
      setLoading(false);
      router.refresh();
    }
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className={`px-4 py-2 rounded-lg font-medium transition ${
          isActive
            ? "bg-red-600 text-white hover:bg-red-700"
            : "bg-green-600 text-white hover:bg-green-700"
        }`}
      >
        {isActive ? "Deactivate Member" : "Reactivate Member"}
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {isActive ? "Deactivate" : "Reactivate"} {memberName}?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {isActive
                ? "This member will be immediately logged out and unable to sign in until reactivated."
                : "This member will be able to sign in and access the community again."}
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setError(null);
                }}
                disabled={loading}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleActive}
                disabled={loading}
                className={`px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 ${
                  isActive
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-green-600 text-white hover:bg-green-700"
                }`}
              >
                {loading ? "Processing..." : isActive ? "Deactivate" : "Reactivate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
