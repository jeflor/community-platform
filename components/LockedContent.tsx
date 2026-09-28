"use client";

import Link from "next/link";

interface LockedContentProps {
  contentType?: "course" | "channel" | "event" | "document";
  title?: string;
  message?: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

export function LockedContent({
  contentType = "course",
  title,
  message,
  ctaLabel = "View offers",
  ctaUrl = "/dashboard/offers",
}: LockedContentProps) {
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-8 text-center max-w-xl mx-auto my-8">
      <div className="mb-5">
        <svg
          className="w-12 h-12 mx-auto text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      </div>

      {title && (
        <h3 className="text-xl font-semibold text-gray-900 mb-3">
          {title}
        </h3>
      )}

      {message && (
        <p className="text-gray-600 mb-6 leading-relaxed">{message}</p>
      )}

      <Link
        href={ctaUrl}
        className="inline-block px-6 py-3 bg-[#1E3A7A] text-white font-semibold rounded-lg hover:bg-[#152a5a] transition-colors"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}

interface LockedContentInlineProps {
  message?: string;
}

export function LockedContentInline({ message }: LockedContentInlineProps) {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
      <svg
        className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
      <div className="flex-1">
        <p className="text-sm text-gray-700">
          {message || "This content requires a premium membership."}
        </p>
        <Link
          href="/dashboard/offers"
          className="text-sm text-blue-600 hover:underline mt-1 inline-block"
        >
          View offers →
        </Link>
      </div>
    </div>
  );
}
