"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";

export interface SearchResult {
  type: "user" | "course" | "event" | "document" | "pulse";
  id: string;
  title: string;
  description?: string;
  href: string;
  metadata?: {
    date?: string;
    author?: string;
    location?: string;
    excerpt?: string;
  };
}

export async function searchContent(query: string): Promise<SearchResult[]> {
  if (!query.trim()) {
    return [];
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const currentProfile = await getCurrentProfile();
  const isAdmin = currentProfile?.role === "admin";

  const results: SearchResult[] = [];
  const searchTerm = `%${query.toLowerCase()}%`;

  // Search users (active members only)
  // Non-admins use member_directory (no email), admins use users table
  if (isAdmin) {
    const { data: users } = await supabase
      .from("users")
      .select("id, full_name, email, headline, bio, location")
      .eq("is_active", true)
      .or(`full_name.ilike.${searchTerm},email.ilike.${searchTerm},headline.ilike.${searchTerm},bio.ilike.${searchTerm}`)
      .limit(10);

    if (users) {
      results.push(
        ...users.map((u) => ({
          type: "user" as const,
          id: u.id,
          title: u.full_name || u.email,
          description: u.headline || u.email,
          href: `/dashboard/members/${u.id}`,
          metadata: u.location ? { location: u.location } : undefined,
        }))
      );
    }
  } else {
    const { data: members } = await supabase
      .from("member_directory")
      .select("id, full_name, headline, bio, location")
      .or(`full_name.ilike.${searchTerm},headline.ilike.${searchTerm},bio.ilike.${searchTerm}`)
      .limit(10);

    if (members) {
      results.push(
        ...members.map((m) => ({
          type: "user" as const,
          id: m.id,
          title: m.full_name || "Member",
          description: m.headline,
          href: `/dashboard/members/${m.id}`,
          metadata: m.location ? { location: m.location } : undefined,
        }))
      );
    }
  }

  // Search courses (only accessible published courses)
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, slug, description")
    .eq("is_published", true)
    .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
    .limit(10);

  if (courses) {
    results.push(
      ...courses.map((c) => ({
        type: "course" as const,
        id: c.id,
        title: c.title,
        description: c.description || undefined,
        href: `/courses/${c.slug}`,
      }))
    );
  }

  // Search events (only accessible events)
  const { data: events } = await supabase
    .from("events")
    .select("id, title, description, starts_at, ends_at")
    .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
    .limit(10);

  if (events) {
    results.push(
      ...events.map((e) => {
        const startDate = new Date(e.starts_at);
        const now = new Date();
        const isPast = startDate < now;
        const dateStr = startDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: startDate.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
        });
        const timeStr = startDate.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });

        return {
          type: "event" as const,
          id: e.id,
          title: e.title,
          description: e.description || undefined,
          href: `/dashboard/events/${e.id}`,
          metadata: {
            date: `${dateStr} at ${timeStr}${isPast ? " (Past)" : ""}`,
          },
        };
      })
    );
  }

  // Search documents (only published documents the viewer can see via RLS)
  const { data: documents } = await supabase
    .from("documents")
    .select("id, title, slug, body")
    .eq("is_published", true)
    .or(`title.ilike.${searchTerm},body.ilike.${searchTerm}`)
    .limit(10);

  if (documents) {
    results.push(
      ...documents.map((d) => {
        let excerpt = "";
        if (d.body) {
          // Remove HTML tags and get excerpt
          const plainText = d.body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
          const lowerText = plainText.toLowerCase();
          const lowerQuery = query.toLowerCase();
          
          // Try to find context around the search term
          const matchIndex = lowerText.indexOf(lowerQuery);
          if (matchIndex !== -1) {
            // Show context around the match
            const start = Math.max(0, matchIndex - 60);
            const end = Math.min(plainText.length, matchIndex + lowerQuery.length + 60);
            excerpt = (start > 0 ? "..." : "") + 
                      plainText.substring(start, end) + 
                      (end < plainText.length ? "..." : "");
          } else {
            // Just show beginning
            excerpt = plainText.substring(0, 120) + (plainText.length > 120 ? "..." : "");
          }
        }

        return {
          type: "document" as const,
          id: d.id,
          title: d.title,
          description: excerpt || undefined,
          href: `/resources/${d.slug}`,
        };
      })
    );
  }

  // Search pulse posts (only posts whose body matches the query)
  const { data: pulsePosts } = await supabase
    .from("pulse_posts")
    .select("id, body, user_id, created_at, users!inner(full_name, email)")
    .ilike("body", searchTerm)
    .order("created_at", { ascending: false })
    .limit(10);

  if (pulsePosts) {
    results.push(
      ...pulsePosts.map((p: any) => {
        const author = p.users;
        const authorName = author?.full_name || (isAdmin ? author?.email : "Member");
        
        // Create a better excerpt showing context around the match
        const lowerBody = p.body.toLowerCase();
        const lowerQuery = query.toLowerCase();
        const matchIndex = lowerBody.indexOf(lowerQuery);
        
        let bodyPreview = "";
        if (matchIndex !== -1) {
          // Show context around match
          const start = Math.max(0, matchIndex - 40);
          const end = Math.min(p.body.length, matchIndex + lowerQuery.length + 80);
          bodyPreview = (start > 0 ? "..." : "") + 
                       p.body.substring(start, end) + 
                       (end < p.body.length ? "..." : "");
        } else {
          bodyPreview = p.body.length > 120 ? p.body.substring(0, 120) + "..." : p.body;
        }

        return {
          type: "pulse" as const,
          id: p.id,
          title: bodyPreview,
          href: `/pulse/${p.id}`,
          metadata: {
            author: authorName,
          },
        };
      })
    );
  }

  return results;
}
