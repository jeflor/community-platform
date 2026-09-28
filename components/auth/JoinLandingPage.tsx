"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ThemeSettings } from "@/lib/settings/get-theme";
import Image from "next/image";

interface JoinLandingPageProps {
  token: string;
  linkName: string;
  groupName?: string;
  theme: ThemeSettings;
  siteName: string;
}

export function JoinLandingPage({
  token,
  linkName,
  groupName,
  theme,
  siteName,
}: JoinLandingPageProps) {
  const router = useRouter();

  const handleJoin = () => {
    router.push(`/auth/signup?token=${token}`);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Banner side */}
      <div
        className="hidden lg:flex lg:w-1/2 p-12 items-center justify-center relative overflow-hidden"
        style={{
          background: theme.logo_url
            ? "transparent"
            : `linear-gradient(to bottom right, ${theme.gradient_start}, ${theme.gradient_end})`,
        }}
      >
        {theme.logo_url ? (
          <div className="relative w-full h-full">
            <Image
              src={theme.logo_url}
              alt={siteName}
              fill
              className="object-cover"
              style={{ aspectRatio: "auto" }}
              priority
            />
            <div className="absolute inset-0 bg-black/20" />
          </div>
        ) : null}
        <div className="max-w-md text-gray-900 z-10 relative">
          <h1 className="text-4xl font-bold mb-4">{siteName}</h1>
          <p className="text-lg opacity-90">
            Join our community and get started today
          </p>
        </div>
      </div>

      {/* Mobile banner */}
      <div
        className="lg:hidden w-full p-8 text-center"
        style={{
          background: theme.logo_url
            ? "transparent"
            : `linear-gradient(to bottom right, ${theme.gradient_start}, ${theme.gradient_end})`,
        }}
      >
        {theme.logo_url ? (
          <div className="relative w-full h-48 mb-4">
            <Image
              src={theme.logo_url}
              alt={siteName}
              fill
              className="object-cover rounded-lg"
              style={{ aspectRatio: "auto" }}
              priority
            />
          </div>
        ) : null}
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{siteName}</h1>
        <p className="text-gray-800 opacity-90">
          Join our community and get started today
        </p>
      </div>

      {/* Content side */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              You&apos;re invited to join
            </h2>
            <p className="text-xl text-gray-700 font-medium mb-2">
              {linkName}
            </p>
            {groupName && (
              <p className="text-sm text-gray-600">
                You&apos;ll get access to: <span className="font-medium">{groupName}</span>
              </p>
            )}
          </div>

          <div className="space-y-4">
            <button
              onClick={handleJoin}
              className="w-full text-white py-3 rounded-lg font-medium transition hover:opacity-90"
              style={{ backgroundColor: theme.primary_color }}
            >
              Continue to Sign Up
            </button>

            <div className="text-center text-sm text-gray-600">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="font-medium hover:underline"
                style={{ color: theme.primary_color }}
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
