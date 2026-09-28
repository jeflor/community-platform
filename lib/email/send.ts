import { Resend } from "resend";
import { getSupportEmail } from "@/lib/settings/get-support-email";
import { createAdminClient } from "@/lib/supabase/admin";

type EmailPrefType = "dm_email" | "mention_email" | "event_reminder_email" | "weekly_digest_email";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  userId?: string;
  prefType?: EmailPrefType;
}

/**
 * Send an email using Resend.
 * Respects notification_prefs if prefType and userId are provided.
 * Returns { skipped: true } if RESEND_API_KEY is missing or user has opted out.
 * 
 * SECURITY: This is a server-only module, NOT a server action.
 * Only call from authenticated server actions.
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  const { to, subject, html, userId, prefType } = options;

  // Check for RESEND_API_KEY
  if (!process.env.RESEND_API_KEY) {
    console.log("[Email] RESEND_API_KEY not configured, skipping email send");
    return { success: true, skipped: true };
  }

  // Check notification preferences if prefType and userId are provided
  if (prefType && userId) {
    try {
      const adminClient = createAdminClient();
      const { data: prefs } = await adminClient
        .from("notification_prefs")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (prefs && (prefs as Record<string, boolean>)[prefType] === false) {
        console.log(`[Email] User ${userId} has opted out of ${prefType}, skipping email`);
        return { success: true, skipped: true };
      }
    } catch (error) {
      console.error("[Email] Error checking notification preferences:", error);
      // Continue with sending email if we can't check preferences
    }
  }

  // Get from address
  const supportEmail = await getSupportEmail();
  const fromAddress = supportEmail || process.env.EMAIL_FROM;

  // Skip if no valid from address is configured
  if (!fromAddress) {
    console.log("[Email] No valid from address configured (support_email or EMAIL_FROM), skipping email send");
    return { success: true, skipped: true };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    await resend.emails.send({
      from: fromAddress,
      to,
      subject,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error("[Email] Failed to send email:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to send email" };
  }
}
