import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Community Platform</h1>
        <p className="text-gray-600 mb-8">Phase 1 Foundation</p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/auth/login"
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Sign In
          </Link>
          <Link
            href="/auth/signup"
            className="px-6 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50 transition"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
