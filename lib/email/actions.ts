import { sendEmail } from "./send";
import { getWelcomeEmailHtml } from "./templates/welcome";
import { getDMNotificationEmailHtml } from "./templates/dm-notification";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Send welcome email to a new user
 * 
 * SECURITY: This is a server-only module, NOT a server action.
 * Only call from authenticated server actions.
 */
export async function sendWelcomeEmail(params: {
  userId: string;
  userEmail: string;
  fullName: string;
  siteName: string;
}): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  const { userId, userEmail, fullName, siteName } = params;

  const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/dashboard`;
  
  const html = getWelcomeEmailHtml({
    fullName,
    siteName,
    dashboardUrl,
  });

  return sendEmail({
    to: userEmail,
    subject: `Welcome to ${siteName}!`,
    html,
    userId,
    // Welcome emails don't have a specific pref type - they're always sent if API key exists
  });
}

/**
 * Send DM notification email when a user receives a new direct message
 */
export async function sendDMNotificationEmail(params: {
  recipientUserId: string;
  senderUserId: string;
  threadId: string;
  messageBody: string;
}): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  const { recipientUserId, senderUserId, threadId, messageBody } = params;

  try {
    const adminClient = createAdminClient();

    // Get recipient info
    const { data: recipient } = await adminClient
      .from("users")
      .select("email, full_name")
      .eq("id", recipientUserId)
      .single();

    if (!recipient) {
      return { success: false, error: "Recipient not found" };
    }

    // Get sender info
    const { data: sender } = await adminClient
      .from("users")
      .select("full_name")
      .eq("id", senderUserId)
      .single();

    if (!sender) {
      return { success: false, error: "Sender not found" };
    }

    // Get site name
    const { data: siteNameSetting } = await adminClient
      .from("site_settings")
      .select("value")
      .eq("key", "site_name")
      .single();

    const siteName = (siteNameSetting?.value as string) || "Community Platform";
    const threadUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/dashboard/messages/${threadId}`;

    const html = getDMNotificationEmailHtml({
      recipientName: recipient.full_name || "there",
      senderName: sender.full_name || "Someone",
      messagePreview: messageBody,
      threadUrl,
      siteName,
    });

    return sendEmail({
      to: recipient.email,
      subject: `New message from ${sender.full_name || "a team member"}`,
      html,
      userId: recipientUserId,
      prefType: "dm_email",
    });
  } catch (error) {
    console.error("[Email] Error sending DM notification:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to send DM notification" };
  }
}
