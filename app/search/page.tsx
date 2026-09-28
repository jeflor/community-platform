import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { searchContent } from "@/lib/actions/search";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const results = query ? await searchContent(query) : [];

  const groupedResults = {
    user: results.filter((r) => r.type === "user"),
    course: results.filter((r) => r.type === "course"),
    event: results.filter((r) => r.type === "event"),
    document: results.filter((r) => r.type === "document"),
    pulse: results.filter((r) => r.type === "pulse"),
  };

  const hasResults =
    groupedResults.user.length > 0 ||
    groupedResults.course.length > 0 ||
    groupedResults.event.length > 0 ||
    groupedResults.document.length > 0 ||
    groupedResults.pulse.length > 0;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {query ? (
            <>
              Search results for <span className="text-blue-600">&quot;{query}&quot;</span>
            </>
          ) : (
            "Search"
          )}
        </h1>
        {query && hasResults && (
          <p className="text-gray-600">
            Found{" "}
            {groupedResults.user.length +
              groupedResults.course.length +
              groupedResults.event.length +
              groupedResults.document.length +
              groupedResults.pulse.length}{" "}
            results across all content types
          </p>
        )}
      </div>

      {!query ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="max-w-md mx-auto">
            <svg
              className="w-20 h-20 text-gray-300 mx-auto mb-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Search across everything
            </h3>
            <p className="text-gray-600 mb-4">
              Find people, courses, events, resources, and pulse posts all in one place.
            </p>
            <p className="text-sm text-gray-500">
              Use the search bar above or press{" "}
              <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
                /
              </kbd>{" "}
              to start searching
            </p>
          </div>
        </div>
      ) : !hasResults ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="max-w-md mx-auto">
            <svg
              className="w-20 h-20 text-gray-300 mx-auto mb-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No results found for &quot;{query}&quot;
            </h3>
            <p className="text-gray-600 mb-4">
              We couldn&apos;t find any matches in people, courses, events, resources, or pulse.
            </p>
            <div className="text-sm text-gray-500 space-y-1">
              <p>Try:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Using different keywords</li>
                <li>Checking your spelling</li>
                <li>Using fewer or more general terms</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedResults.user.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
                <span>People</span>
                <span className="text-sm font-normal text-gray-500">
                  ({groupedResults.user.length})
                </span>
              </h2>
              <div className="bg-white rounded-lg shadow divide-y divide-gray-100">
                {groupedResults.user.map((result) => (
                  <Link
                    key={result.id}
                    href={result.href}
                    className="block px-6 py-4 hover:bg-gray-50 transition group"
                  >
                    <h3 className="font-medium text-gray-900 group-hover:text-blue-600">
                      {result.title}
                    </h3>
                    {result.description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {result.description}
                      </p>
                    )}
                    {result.metadata?.location && (
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {result.metadata.location}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {groupedResults.course.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
                <span>Courses</span>
                <span className="text-sm font-normal text-gray-500">
                  ({groupedResults.course.length})
                </span>
              </h2>
              <div className="bg-white rounded-lg shadow divide-y divide-gray-100">
                {groupedResults.course.map((result) => (
                  <Link
                    key={result.id}
                    href={result.href}
                    className="block px-6 py-4 hover:bg-gray-50 transition group"
                  >
                    <h3 className="font-medium text-gray-900 group-hover:text-purple-600">
                      {result.title}
                    </h3>
                    {result.description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {result.description}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {groupedResults.event.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span>Events</span>
                <span className="text-sm font-normal text-gray-500">
                  ({groupedResults.event.length})
                </span>
              </h2>
              <div className="bg-white rounded-lg shadow divide-y divide-gray-100">
                {groupedResults.event.map((result) => (
                  <Link
                    key={result.id}
                    href={result.href}
                    className="block px-6 py-4 hover:bg-gray-50 transition group"
                  >
                    <h3 className="font-medium text-gray-900 group-hover:text-green-600">
                      {result.title}
                    </h3>
                    {result.metadata?.date && (
                      <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {result.metadata.date}
                      </p>
                    )}
                    {result.description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {result.description}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {groupedResults.document.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span>Resources</span>
                <span className="text-sm font-normal text-gray-500">
                  ({groupedResults.document.length})
                </span>
              </h2>
              <div className="bg-white rounded-lg shadow divide-y divide-gray-100">
                {groupedResults.document.map((result) => (
                  <Link
                    key={result.id}
                    href={result.href}
                    className="block px-6 py-4 hover:bg-gray-50 transition group"
                  >
                    <h3 className="font-medium text-gray-900 group-hover:text-amber-600">
                      {result.title}
                    </h3>
                    {result.description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {result.description}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {groupedResults.pulse.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-rose-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <span>Pulse</span>
                <span className="text-sm font-normal text-gray-500">
                  ({groupedResults.pulse.length})
                </span>
              </h2>
              <div className="bg-white rounded-lg shadow divide-y divide-gray-100">
                {groupedResults.pulse.map((result) => (
                  <Link
                    key={result.id}
                    href={result.href}
                    className="block px-6 py-4 hover:bg-gray-50 transition group"
                  >
                    <div className="flex items-start gap-3">
                      <svg
                        className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 group-hover:text-rose-600 line-clamp-3">
                          {result.title}
                        </p>
                        {result.metadata?.author && (
                          <p className="text-xs text-gray-500 mt-1">
                            by {result.metadata.author}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
