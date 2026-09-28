import { EventsManager } from "@/components/admin/EventsManager";
import { requireAdmin } from "@/lib/auth/require-admin";

export default async function AdminEventsPage() {
  await requireAdmin();

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Manage Events</h1>
      <EventsManager />
    </div>
  );
}
