import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await getCurrentProfile();

  if (!user) {
    redirect("/auth/login");
  }

  const displayName = user.full_name || user.email;
  const displayRole = user.role || "unknown";

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Welcome, {displayName}!
        </h2>
        <p className="text-gray-600">
          You&apos;re logged in as a <span className="font-medium capitalize">{displayRole}</span>.
        </p>
      </div>
    </div>
  );
}
