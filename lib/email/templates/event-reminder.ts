export function getEventReminderEmailHtml(params: {
  recipientName: string;
  eventTitle: string;
  eventDateTime: string;
  eventUrl: string;
  siteName: string;
}): string {
  const { recipientName, eventTitle, eventDateTime, eventUrl, siteName } = params;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event Reminder: ${eventTitle}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 40px 30px; text-align: center; background-color: #f59e0b;">
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
          📅 Event Reminder
        </h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 30px;">
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 24px; color: #374151;">
          Hi ${recipientName},
        </p>
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 24px; color: #374151;">
          This is a reminder about an upcoming event on ${siteName}.
        </p>
        <div style="margin: 0 0 30px; padding: 20px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
          <h2 style="margin: 0 0 10px; font-size: 18px; font-weight: 600; color: #92400e;">
            ${eventTitle}
          </h2>
          <p style="margin: 0; font-size: 15px; line-height: 22px; color: #78350f;">
            📅 ${eventDateTime}
          </p>
        </div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="text-align: center;">
              <a href="${eventUrl}" style="display: inline-block; padding: 14px 28px; background-color: #f59e0b; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 500;">
                View Event Details
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px; background-color: #f9fafb; text-align: center;">
        <p style="margin: 0 0 10px; font-size: 14px; line-height: 20px; color: #6b7280;">
          You're receiving this because you have event reminder notifications enabled.
        </p>
        <p style="margin: 0; font-size: 14px; line-height: 20px; color: #6b7280;">
          You can manage your notification preferences in your account settings.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Stub function for sending event reminder emails.
 * This is a placeholder for future event reminder functionality (e.g., cron job).
 */
export async function sendEventReminder(params: {
  userId: string;
  userEmail: string;
  recipientName: string;
  eventTitle: string;
  eventDateTime: string;
  eventUrl: string;
  siteName: string;
}): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  // This is a stub - actual implementation would be triggered by a cron job
  console.log("[Email] Event reminder stub called for:", params.userId);
  return { success: true, skipped: true };
}
