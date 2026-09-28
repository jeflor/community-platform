import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NotificationsList } from "@/components/notifications/NotificationsList";
import { getNotifications } from "@/lib/actions/notifications";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { notifications, unreadCount } = await getNotifications(100);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-600 mt-1">
            Stay updated on mentions, comments, messages, and events
          </p>
        </div>
        {unreadCount > 0 && (
          <span className="inline-flex items-center justify-center px-3 py-1 text-sm font-medium text-blue-700 bg-blue-100 rounded-full">
            {unreadCount} unread
          </span>
        )}
      </div>

      <NotificationsList
        initialNotifications={notifications}
        initialUnreadCount={unreadCount}
      />
    </div>
  );
}
