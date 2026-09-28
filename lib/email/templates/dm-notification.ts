export function getDMNotificationEmailHtml(params: {
  recipientName: string;
  senderName: string;
  messagePreview: string;
  threadUrl: string;
  siteName: string;
}): string {
  const { recipientName, senderName, messagePreview, threadUrl, siteName } = params;

  // Truncate message preview to 150 characters
  const truncatedPreview = messagePreview.length > 150 
    ? messagePreview.substring(0, 150) + "..." 
    : messagePreview;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Message from ${senderName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 40px 30px; text-align: center; background-color: #10b981;">
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
          💬 New Message
        </h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 30px;">
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 24px; color: #374151;">
          Hi ${recipientName},
        </p>
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 24px; color: #374151;">
          You have a new message from <strong>${senderName}</strong> on ${siteName}.
        </p>
        <div style="margin: 0 0 30px; padding: 20px; background-color: #f3f4f6; border-left: 4px solid #10b981; border-radius: 4px;">
          <p style="margin: 0; font-size: 15px; line-height: 22px; color: #4b5563; font-style: italic;">
            "${truncatedPreview}"
          </p>
        </div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="text-align: center;">
              <a href="${threadUrl}" style="display: inline-block; padding: 14px 28px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 500;">
                View Message
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px; background-color: #f9fafb; text-align: center;">
        <p style="margin: 0 0 10px; font-size: 14px; line-height: 20px; color: #6b7280;">
          You're receiving this because you have DM notifications enabled.
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
