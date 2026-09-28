import { EventsPageClient } from "@/components/events/EventsPageClient";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { getPreviewState } from "@/lib/preview/preview-helpers";
import { redirect } from "next/navigation";

export default async function EventsPage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/auth/login");
  }

  const isAdmin = profile.role === "admin";
  const previewState = await getPreviewState();
  const showAdminActions = isAdmin && !previewState?.active;

  return <EventsPageClient showAdminActions={showAdminActions} />;
}
