/**
 * Event Reminder System (Phase 7 - Email Integration)
 * 
 * This file contains stub functions for event reminder emails.
 * Phase 7 will integrate with Resend for actual email delivery.
 * 
 * Reminder Schedule:
 * - 24 hours before event start
 * - 1 hour before event start
 * 
 * Only send to users with RSVP status = 'going'
 */

import { createClient } from "@/lib/supabase/server";

interface EventReminder {
  eventId: string;
  eventTitle: string;
  startsAt: string;
  endsAt: string;
  zoomUrl?: string;
  recipientEmail: string;
  recipientName: string;
}

/**
 * TODO Phase 7: Implement with Resend
 * Send a 24-hour reminder email to all users who RSVP'd 'going'
 * 
 * Suggested cron schedule: Run hourly and check for events starting in 24h ± 30min
 * 
 * @param reminder - Event and recipient details
 * @returns Promise<boolean> - true if email sent successfully
 */
export async function send24HourReminder(
  reminder: EventReminder
): Promise<boolean> {
  console.log("TODO Phase 7: Send 24h reminder email", {
    to: reminder.recipientEmail,
    event: reminder.eventTitle,
    startsAt: reminder.startsAt,
  });

  // TODO Phase 7: Integrate with Resend
  // import { Resend } from 'resend';
  // const resend = new Resend(process.env.RESEND_API_KEY);
  //
  // await resend.emails.send({
  //   from: 'events@yourdomain.com',
  //   to: reminder.recipientEmail,
  //   subject: `Reminder: ${reminder.eventTitle} tomorrow`,
  //   html: `
  //     <h1>Event Tomorrow</h1>
  //     <p>Hi ${reminder.recipientName},</p>
  //     <p>This is a reminder that ${reminder.eventTitle} is starting tomorrow.</p>
  //     <p><strong>When:</strong> ${new Date(reminder.startsAt).toLocaleString()}</p>
  //     ${reminder.zoomUrl ? `<p><a href="${reminder.zoomUrl}">Join Zoom Meeting</a></p>` : ''}
  //   `
  // });

  return true;
}

/**
 * TODO Phase 7: Implement with Resend
 * Send a 1-hour reminder email to all users who RSVP'd 'going'
 * 
 * Suggested cron schedule: Run every 15 minutes and check for events starting in 1h ± 15min
 * 
 * @param reminder - Event and recipient details
 * @returns Promise<boolean> - true if email sent successfully
 */
export async function send1HourReminder(
  reminder: EventReminder
): Promise<boolean> {
  console.log("TODO Phase 7: Send 1h reminder email", {
    to: reminder.recipientEmail,
    event: reminder.eventTitle,
    startsAt: reminder.startsAt,
  });

  // TODO Phase 7: Integrate with Resend
  // import { Resend } from 'resend';
  // const resend = new Resend(process.env.RESEND_API_KEY);
  //
  // await resend.emails.send({
  //   from: 'events@yourdomain.com',
  //   to: reminder.recipientEmail,
  //   subject: `Starting soon: ${reminder.eventTitle}`,
  //   html: `
  //     <h1>Event Starting Soon</h1>
  //     <p>Hi ${reminder.recipientName},</p>
  //     <p>This is a reminder that ${reminder.eventTitle} is starting in 1 hour.</p>
  //     <p><strong>When:</strong> ${new Date(reminder.startsAt).toLocaleString()}</p>
  //     ${reminder.zoomUrl ? `<p><a href="${reminder.zoomUrl}">Join Zoom Meeting</a></p>` : ''}
  //   `
  // });

  return true;
}

/**
 * TODO Phase 7: Implement cron job
 * Fetch events starting in ~24 hours and send reminders
 * 
 * Suggested implementation:
 * - Use Vercel Cron or similar scheduler
 * - Run hourly: 0 * * * *
 * - Query events where starts_at BETWEEN NOW() + 23.5h AND NOW() + 24.5h
 * - Join with event_rsvps where status = 'going'
 * - Send email to each recipient
 */
export async function process24HourReminders(): Promise<void> {
  console.log("TODO Phase 7: Process 24-hour reminders cron job");

  const supabase = await createClient();

  // Example query (not executed in stub):
  // const now = new Date();
  // const start = new Date(now.getTime() + 23.5 * 60 * 60 * 1000);
  // const end = new Date(now.getTime() + 24.5 * 60 * 60 * 1000);
  //
  // const { data: reminders } = await supabase
  //   .from('events')
  //   .select(`
  //     id,
  //     title,
  //     starts_at,
  //     ends_at,
  //     zoom_url,
  //     event_rsvps!inner(
  //       user:users(email, full_name)
  //     )
  //   `)
  //   .gte('starts_at', start.toISOString())
  //   .lte('starts_at', end.toISOString())
  //   .eq('event_rsvps.status', 'going');
  //
  // for (const reminder of reminders) {
  //   await send24HourReminder({
  //     eventId: reminder.id,
  //     eventTitle: reminder.title,
  //     startsAt: reminder.starts_at,
  //     endsAt: reminder.ends_at,
  //     zoomUrl: reminder.zoom_url,
  //     recipientEmail: reminder.event_rsvps[0].user.email,
  //     recipientName: reminder.event_rsvps[0].user.full_name,
  //   });
  // }
}

/**
 * TODO Phase 7: Implement cron job
 * Fetch events starting in ~1 hour and send reminders
 * 
 * Suggested implementation:
 * - Use Vercel Cron or similar scheduler
 * - Run every 15 minutes: "star-slash-15 star star star star" (cron format)
 * - Query events where starts_at BETWEEN NOW() + 45min AND NOW() + 1h15min
 * - Join with event_rsvps where status = 'going'
 * - Send email to each recipient
 */
export async function process1HourReminders(): Promise<void> {
  console.log("TODO Phase 7: Process 1-hour reminders cron job");

  const supabase = await createClient();

  // Example query (not executed in stub):
  // const now = new Date();
  // const start = new Date(now.getTime() + 45 * 60 * 1000);
  // const end = new Date(now.getTime() + 75 * 60 * 1000);
  //
  // const { data: reminders } = await supabase
  //   .from('events')
  //   .select(`
  //     id,
  //     title,
  //     starts_at,
  //     ends_at,
  //     zoom_url,
  //     event_rsvps!inner(
  //       user:users(email, full_name)
  //     )
  //   `)
  //   .gte('starts_at', start.toISOString())
  //   .lte('starts_at', end.toISOString())
  //   .eq('event_rsvps.status', 'going');
  //
  // for (const reminder of reminders) {
  //   await send1HourReminder({
  //     eventId: reminder.id,
  //     eventTitle: reminder.title,
  //     startsAt: reminder.starts_at,
  //     endsAt: reminder.ends_at,
  //     zoomUrl: reminder.zoom_url,
  //     recipientEmail: reminder.event_rsvps[0].user.email,
  //     recipientName: reminder.event_rsvps[0].user.full_name,
  //   });
  // }
}

/**
 * TODO Phase 7: Create API routes for cron triggers
 * 
 * Example Vercel cron config (vercel.json):
 * {
 *   "crons": [
 *     {
 *       "path": "/api/cron/event-reminders-24h",
 *       "schedule": "0 star star star star"
 *     },
 *     {
 *       "path": "/api/cron/event-reminders-1h",
 *       "schedule": "star-slash-15 star star star star"
 *     }
 *   ]
 * }
 * 
 * Note: Replace "star" with * and "star-slash-15" with the actual cron syntax
 * 
 * API route examples:
 * - app/api/cron/event-reminders-24h/route.ts
 * - app/api/cron/event-reminders-1h/route.ts
 * 
 * Both should verify the cron secret from headers:
 * if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
 *   return new Response('Unauthorized', { status: 401 });
 * }
 */
