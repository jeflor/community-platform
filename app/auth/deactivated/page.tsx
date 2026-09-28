import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function DeactivatedPage() {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const handleSignOut = async () => {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          {/* Icon */}
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Account Deactivated
          </h1>

          {/* Message */}
          <p className="text-gray-600 mb-6">
            Your account has been deactivated by an administrator. You no longer
            have access to the community.
          </p>

          {user && (
            <p className="text-sm text-gray-500 mb-6">
              Signed in as: <span className="font-medium">{user.email}</span>
            </p>
          )}

          {/* Help Text */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-gray-700">
              If you believe this is a mistake, please contact the community
              administrators for assistance.
            </p>
          </div>

          {/* Sign Out Button */}
          {user && (
            <form action={handleSignOut}>
              <button
                type="submit"
                className="w-full bg-gray-900 text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition font-medium"
              >
                Sign Out
              </button>
            </form>
          )}

          {/* Link to Home */}
          {!user && (
            <Link
              href="/"
              className="inline-block w-full bg-gray-900 text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition font-medium"
            >
              Return to Home
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
