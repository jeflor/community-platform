import { getVisibleDocuments } from "@/lib/actions/documents";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function ResourcesPage() {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-yellow-800">Please log in to view resources.</p>
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

  // Get all documents visible to user
  const documents = await getVisibleDocuments();

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Resources</h1>
          <p className="text-gray-600">
            Browse all available resources and documents
          </p>
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
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
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {isAdmin ? "No published resources yet" : "No resources available"}
          </h3>
          <p className="text-gray-600 mb-6">
            {isAdmin
              ? "Resources you add via the sidebar will appear here once created. Click on any sidebar resource link to begin adding content."
              : "Check back later for documents, guides, and other helpful resources."}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((document) => (
            <a
              key={document.id}
              href={`/resources/${document.slug}`}
              className="group bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all overflow-hidden"
            >
              {/* Cover Image */}
              {document.cover_url ? (
                <div
                  className="w-full bg-gray-100 overflow-hidden"
                  style={{ aspectRatio: "16 / 9" }}
                >
                  <img
                    src={document.cover_url}
                    alt={document.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ) : (
                <div
                  className="w-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center"
                  style={{ aspectRatio: "16 / 9" }}
                >
                  <svg
                    className="w-12 h-12 text-blue-300"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              )}

              {/* Content */}
              <div className="p-5">
                <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-2">
                  {document.title}
                </h2>

                {/* Body Preview */}
                {document.body ? (
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                    {stripHtml(document.body).slice(0, 150)}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 italic mb-3">
                    {isAdmin ? "No content yet" : "Content coming soon"}
                  </p>
                )}

                {/* Status Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  {!document.is_published && isAdmin && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Draft
                    </span>
                  )}
                  {document.video_url && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      📹 Video
                    </span>
                  )}
                  {document.attachments && document.attachments.length > 0 && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      📎 {document.attachments.length}
                    </span>
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper to strip HTML tags for preview
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
