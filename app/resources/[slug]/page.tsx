import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDocumentBySlug } from "@/lib/actions/documents";
import { getLockedSettings, getActiveProductInfo } from "@/lib/settings/get-locked-settings";
import { DocumentEditor } from "@/components/documents/DocumentEditor";
import { DocumentViewer } from "@/components/documents/DocumentViewer";
import { LockedContent } from "@/components/LockedContent";
import { getSidebarSections, type SidebarItem } from "@/lib/actions/sidebar";
import { getEffectiveGroupSlugs } from "@/lib/preview/preview-helpers";
import Link from "next/link";

export default async function ResourcePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { slug } = await params;
  const { edit } = await searchParams;
  
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-yellow-800">Please log in to view this resource.</p>
        </div>
      </div>
    );
  }

  // Get user role
  const { data: userData } = await adminClient
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = userData?.role === "admin";

  // Get sidebar items to find matching channel settings
  const effectiveGroupSlugs = await getEffectiveGroupSlugs(user.id, isAdmin);
  const sidebarSections = await getSidebarSections(effectiveGroupSlugs, isAdmin);
  const allItems = sidebarSections.flatMap(section => section.items);
  const matchedItem = allItems.find(item => item.href === `/resources/${slug}`);

  // Get document
  const document = await getDocumentBySlug(slug);

  // If document doesn't exist
  if (!document) {
    // Admins can create it
    if (isAdmin) {
      return (
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <a
              href="/resources"
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              ← Back to Resources
            </a>
          </div>
          <div className="bg-white rounded-lg shadow-sm border-2 border-dashed border-gray-300 p-12 text-center">
            <svg
              className="w-16 h-16 text-gray-300 mx-auto mb-4"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Document not yet created
            </h1>
            <p className="text-gray-600 mb-6">
              The resource "<strong>{slug}</strong>" exists in your sidebar but hasn't been initialized yet. Create it to start adding content.
            </p>
            <a
              href={`/resources/${slug}?edit=true`}
              className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
            >
              Create Document
            </a>
          </div>
        </div>
      );
    }

    // Non-admins see 404
    notFound();
  }

  // Check if user can see the document (unpublished or no access)
  if (!document.is_published && !isAdmin) {
    if (document.visibility === "hide") {
      notFound();
    }

    const lockedSettings = await getLockedSettings();
    const productInfo = await getActiveProductInfo();
    
    const message = document.locked_message || (lockedSettings.enabled 
      ? lockedSettings.messages.document 
      : "This document is not available.");

    const ctaLabel = productInfo.singleProductName || "View offers";

    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <Link href="/resources" className="text-blue-600 hover:text-blue-700 text-sm">
            ← Back to Resources
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">{document.title}</h1>
        <LockedContent
          contentType="document"
          message={message}
          ctaLabel={ctaLabel}
        />
      </div>
    );
  }

  // Show editor if admin and edit=true
  if (isAdmin && edit === "true") {
    return <DocumentEditor document={document} />;
  }

  // Show viewer with edit button for admins
  return <DocumentViewer 
    document={document} 
    isAdmin={isAdmin} 
    currentUserId={user.id}
    sidebarItem={matchedItem}
  />;
}
