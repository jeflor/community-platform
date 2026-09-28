"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Banner {
  id: string;
  title: string;
  body: string;
  href: string | null;
}

interface CommunityBannerProps {
  banners: Banner[];
}

export function CommunityBanner({ banners }: CommunityBannerProps) {
  const [dismissedBanners, setDismissedBanners] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load dismissed banners from sessionStorage
    const dismissed = sessionStorage.getItem("dismissed_banners");
    if (dismissed) {
      try {
        setDismissedBanners(JSON.parse(dismissed));
      } catch {
        setDismissedBanners([]);
      }
    }
  }, []);

  const handleDismiss = (bannerId: string) => {
    const newDismissed = [...dismissedBanners, bannerId];
    setDismissedBanners(newDismissed);
    sessionStorage.setItem("dismissed_banners", JSON.stringify(newDismissed));
  };

  if (!mounted) return null;

  // Show the first non-dismissed banner
  const activeBanner = banners.find((banner) => !dismissedBanners.includes(banner.id));

  if (!activeBanner) return null;

  return (
    <div className="bg-blue-50 border-b border-blue-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-3 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {activeBanner.href ? (
              <Link href={activeBanner.href} className="group block">
                <h3 className="text-sm font-semibold text-blue-900 group-hover:text-blue-700 transition">
                  {activeBanner.title}
                </h3>
                <p className="text-sm text-blue-800 mt-0.5">{activeBanner.body}</p>
              </Link>
            ) : (
              <>
                <h3 className="text-sm font-semibold text-blue-900">
                  {activeBanner.title}
                </h3>
                <p className="text-sm text-blue-800 mt-0.5">{activeBanner.body}</p>
              </>
            )}
          </div>
          <button
            onClick={() => handleDismiss(activeBanner.id)}
            className="flex-shrink-0 text-blue-600 hover:text-blue-800 transition p-1"
            aria-label="Dismiss banner"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
