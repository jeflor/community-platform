"use client";

import { useState } from "react";
import { resetPasswordForEmail } from "@/lib/actions/auth";
import Link from "next/link";
import type { ThemeSettings } from "@/lib/settings/get-theme";
import Image from "next/image";

interface ResetPasswordFormProps {
  theme: ThemeSettings;
  siteName: string;
  siteTagline: string;
}

export function ResetPasswordForm({ theme, siteName, siteTagline }: ResetPasswordFormProps) {
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const result = await resetPasswordForEmail(formData);

      if (result && "error" in result && result.error) {
        setError(result.error);
      } else if (result && "success" in result) {
        setSuccess(result.message || "Success!");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
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
          {siteTagline && (
            <p className="text-lg opacity-90">{siteTagline}</p>
          )}
        </div>
      </div>

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
        {siteTagline && (
          <p className="text-gray-800 opacity-90">{siteTagline}</p>
        )}
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Reset Password</h2>
            <p className="text-gray-600">Enter your email to receive a password reset link</p>
          </div>

          <form action={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-900 mb-1"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ "--tw-ring-color": theme.primary_color } as React.CSSProperties}
                placeholder="you@example.com"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white py-3 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              style={{ backgroundColor: theme.primary_color }}
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <Link
              href="/auth/login"
              className="font-medium hover:underline"
              style={{ color: theme.primary_color }}
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
