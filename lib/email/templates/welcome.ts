export function getWelcomeEmailHtml(params: { 
  fullName: string; 
  siteName: string;
  dashboardUrl: string;
}): string {
  const { fullName, siteName, dashboardUrl } = params;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${siteName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 40px 30px; text-align: center; background-color: #3b82f6;">
        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
          Welcome to ${siteName}!
        </h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 30px;">
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 24px; color: #374151;">
          Hi ${fullName},
        </p>
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 24px; color: #374151;">
          Thank you for joining ${siteName}! We're excited to have you as part of our community.
        </p>
        <p style="margin: 0 0 30px; font-size: 16px; line-height: 24px; color: #374151;">
          You can now access your dashboard, explore courses, connect with other members, and much more.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="text-align: center;">
              <a href="${dashboardUrl}" style="display: inline-block; padding: 14px 28px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 500;">
                Go to Dashboard
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px; background-color: #f9fafb; text-align: center;">
        <p style="margin: 0; font-size: 14px; line-height: 20px; color: #6b7280;">
          If you have any questions, feel free to reach out. We're here to help!
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
