import type { DocumentWithAccess } from "@/lib/actions/documents";
import type { SidebarItem } from "@/lib/actions/sidebar";
import { DocumentComments } from "./DocumentComments";

interface DocumentViewerProps {
  document: DocumentWithAccess;
  isAdmin: boolean;
  currentUserId: string;
  sidebarItem?: SidebarItem;
}

export function DocumentViewer({ document, isAdmin, currentUserId, sidebarItem }: DocumentViewerProps) {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center justify-between">
        <a
          href="/resources"
          className="text-blue-600 hover:text-blue-700 text-sm"
        >
          ← Resources
        </a>
        {isAdmin && (
          <a
            href={`/resources/${document.slug}?edit=true`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
          >
            Edit
          </a>
        )}
      </div>

      {/* Banner Image (from sidebar_items) */}
      {sidebarItem?.banner_image && (
        <div className="mb-6 rounded-lg overflow-hidden bg-gray-100" style={{ aspectRatio: "16 / 9" }}>
          <img
            src={sidebarItem.banner_image}
            alt={document.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Title */}
      <h1 className="text-4xl font-bold text-gray-900 mb-6">
        {document.title}
      </h1>

      {/* Description (from sidebar_items) */}
      {sidebarItem?.description && (
        <div
          className="prose prose-lg max-w-none mb-6 text-gray-600"
          dangerouslySetInnerHTML={{ __html: sidebarItem.description }}
        />
      )}

      {/* Cover Image */}
      {document.cover_url && (
        <div className="mb-6 rounded-lg overflow-hidden bg-gray-100" style={{ aspectRatio: "16 / 9" }}>
          <img
            src={document.cover_url}
            alt={document.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Video Embed */}
      {document.video_url && (
        <div className="mb-6 rounded-lg overflow-hidden bg-gray-900" style={{ aspectRatio: "16 / 9" }}>
          <iframe
            src={getEmbedUrl(document.video_url)}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {/* Body Content */}
      {document.body ? (
        <div
          className="prose prose-lg max-w-none mb-8"
          dangerouslySetInnerHTML={{ __html: document.body }}
        />
      ) : document.slug === "voice-room" ? (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-12 text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <span className="text-3xl">🔊</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">
            Voice chat isn&apos;t available yet
          </h3>
          <p className="text-gray-600 max-w-lg mx-auto">
            Use <a href="/dashboard/events" className="text-blue-600 hover:text-blue-700 underline">Events</a> for live sessions.
          </p>
        </div>
      ) : (
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-12 text-center mb-8">
          <svg
            className="w-12 h-12 text-gray-300 mx-auto mb-3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {isAdmin ? (
            <>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                This document is ready for content
              </h3>
              <p className="text-gray-600 mb-4">
                Click <strong>Edit</strong> above to add rich text, videos, images, and attachments.
              </p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Content coming soon
              </h3>
              <p className="text-gray-600">
                This resource is being prepared and will be available shortly.
              </p>
            </>
          )}
        </div>
      )}

      {/* Attachments */}
      {document.attachments && document.attachments.length > 0 && (
        <div className="mt-8 border-t border-gray-200 pt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Attachments
          </h2>
          <div className="space-y-2">
            {document.attachments.map((attachment, index) => (
              <a
                key={index}
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <span className="text-2xl">📎</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {attachment.name}
                  </div>
                  {attachment.type && (
                    <div className="text-sm text-gray-500">{attachment.type}</div>
                  )}
                </div>
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Comments */}
      <DocumentComments
        documentId={document.id}
        isAdmin={isAdmin}
        currentUserId={currentUserId}
        readOnly={sidebarItem?.read_only || false}
      />
    </div>
  );
}

function getEmbedUrl(url: string): string {
  // YouTube
  if (url.includes("youtube.com/watch")) {
    const videoId = url.split("v=")[1]?.split("&")[0];
    return `https://www.youtube.com/embed/${videoId}`;
  }
  if (url.includes("youtu.be/")) {
    const videoId = url.split("youtu.be/")[1]?.split("?")[0];
    return `https://www.youtube.com/embed/${videoId}`;
  }

  // Vimeo
  if (url.includes("vimeo.com/")) {
    const videoId = url.split("vimeo.com/")[1]?.split("?")[0];
    return `https://player.vimeo.com/video/${videoId}`;
  }

  // Loom
  if (url.includes("loom.com/share/")) {
    const videoId = url.split("loom.com/share/")[1]?.split("?")[0];
    return `https://www.loom.com/embed/${videoId}`;
  }

  // Return as-is if already an embed URL or unknown format
  return url;
}
