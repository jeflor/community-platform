import { EventDetail } from "@/components/events/EventDetail";
import { getEventWithDetails, getEventComments } from "@/lib/actions/events";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { getLockedSettings, getActiveProductInfo } from "@/lib/settings/get-locked-settings";
import { getPreviewState } from "@/lib/preview/preview-helpers";
import { LockedContent } from "@/components/LockedContent";
import { EventComments } from "@/components/events/EventComments";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

interface EventDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const profile = await getCurrentProfile();
  const { id } = await params;

  if (!profile) {
    redirect("/auth/login");
  }

  const isAdmin = profile.role === "admin";
  const previewState = await getPreviewState();
  const showAdminActions = isAdmin && !previewState?.active;

  const event = await getEventWithDetails(id);

  if (!event) {
    notFound();
  }

  // If user cannot RSVP and event has show_locked visibility, show locked content
  if (!event.can_rsvp && event.visibility === "show_locked") {
    const lockedSettings = await getLockedSettings();
    const productInfo = await getActiveProductInfo();
    
    const message = event.locked_message || (lockedSettings.enabled 
      ? lockedSettings.messages.event 
      : "This event is available to premium members.");

    const ctaLabel = productInfo.singleProductName || "View offers";

    return (
      <div className="max-w-4xl mx-auto py-6 px-4">
        <nav className="flex items-center text-sm text-gray-500 mb-4">
          <Link href="/dashboard/events" className="hover:text-gray-700">
            Events
          </Link>
          <span className="mx-2">&gt;</span>
          <span className="text-gray-900">{event.title}</span>
        </nav>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {event.cover_url && (
            <div className="relative w-full h-64">
              <img
                src={event.cover_url}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          <div className="p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{event.title}</h1>
            
            <div className="mb-4 text-sm text-gray-600">
              <p className="font-medium">
                {new Date(event.starts_at).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <p>
                {new Date(event.starts_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZoneName: "short",
                })} - {new Date(event.ends_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZoneName: "short",
                })}
              </p>
            </div>

            {event.description && (
              <p className="text-gray-700 mb-6 whitespace-pre-wrap">
                {event.description}
              </p>
            )}
            
            <LockedContent
              contentType="event"
              message={message}
              ctaLabel={ctaLabel}
            />
          </div>
        </div>
      </div>
    );
  }

  // Get comments for the event
  const comments = await getEventComments(id);

  return (
    <div className="max-w-4xl mx-auto">
      <EventDetail event={event} profile={profile} showAdminActions={showAdminActions} />
      
      {/* Comments section - only show if user can RSVP (has access) */}
      {event.can_rsvp && (
        <div className="bg-white rounded-lg shadow-sm mx-4 mb-8 p-6">
          <EventComments
            eventId={id}
            initialComments={comments}
            currentUserId={profile.id}
            currentUserRole={profile.role}
            canComment={event.can_rsvp}
          />
        </div>
      )}
    </div>
  );
}
