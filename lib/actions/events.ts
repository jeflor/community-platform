"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface Event {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  zoom_url: string | null;
  cover_url: string | null;
  recording_url: string | null;
  locked_message: string | null;
  visibility: "show_locked" | "hide";
  is_visible: boolean;
  capacity: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EventWithGroups extends Event {
  event_groups: Array<{ group_id: string }>;
}

export interface EventWithRsvpCount extends Event {
  rsvp_count: number;
  user_rsvp?: { status: string } | null;
}

export interface EventRsvp {
  event_id: string;
  user_id: string;
  status: "going" | "not_going" | "maybe" | "waitlist";
  created_at: string;
  updated_at: string;
}

export interface EventRsvpWithUser extends EventRsvp {
  user: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

// Get upcoming events (for members)
export async function getUpcomingEvents(): Promise<EventWithRsvpCount[]> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id;

  const { data, error } = await supabase
    .from("events")
    .select("*, event_rsvps!left(count)")
    .gte("starts_at", now)
    .order("starts_at", { ascending: true });

  if (error) {
    console.error("Error fetching upcoming events:", error);
    return [];
  }

  // For each event, get user's RSVP if exists
  const eventsWithRsvp = await Promise.all(
    (data || []).map(async (event) => {
      let userRsvp = null;
      if (userId) {
        const { data: rsvpData } = await supabase
          .from("event_rsvps")
          .select("status")
          .eq("event_id", event.id)
          .eq("user_id", userId)
          .single();
        userRsvp = rsvpData;
      }

      return {
        ...event,
        rsvp_count: event.event_rsvps?.[0]?.count || 0,
        user_rsvp: userRsvp,
      };
    })
  );

  return eventsWithRsvp;
}

// Get past events (for members)
export async function getPastEvents(): Promise<EventWithRsvpCount[]> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id;

  const { data, error } = await supabase
    .from("events")
    .select("*, event_rsvps!left(count)")
    .lt("ends_at", now)
    .order("starts_at", { ascending: false });

  if (error) {
    console.error("Error fetching past events:", error);
    return [];
  }

  const eventsWithRsvp = await Promise.all(
    (data || []).map(async (event) => {
      let userRsvp = null;
      if (userId) {
        const { data: rsvpData } = await supabase
          .from("event_rsvps")
          .select("status")
          .eq("event_id", event.id)
          .eq("user_id", userId)
          .single();
        userRsvp = rsvpData;
      }

      return {
        ...event,
        rsvp_count: event.event_rsvps?.[0]?.count || 0,
        user_rsvp: userRsvp,
      };
    })
  );

  return eventsWithRsvp;
}

// Get single event (for members and admins)
export async function getEvent(eventId: string): Promise<Event | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (error) {
    console.error("Error fetching event:", error);
    return null;
  }

  return data;
}

// Check if user can RSVP to an event
export async function canRsvpToEvent(eventId: string): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) return false;

  // Check if user is admin
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "admin") return true;

  // Check if user is in any group assigned to the event
  const { data } = await supabase
    .from("event_groups")
    .select("group_id")
    .eq("event_id", eventId);

  if (!data || data.length === 0) {
    // No groups assigned, everyone with access can RSVP
    return true;
  }

  // Check if user is in any of the assigned groups
  const groupIds = data.map((eg) => eg.group_id);
  const { data: membership } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id)
    .in("group_id", groupIds)
    .limit(1);

  return !!membership && membership.length > 0;
}

// Get single event with RSVP info and host details
export async function getEventWithDetails(
  eventId: string
): Promise<(EventWithRsvpCount & { 
    host: { full_name: string | null; avatar_url: string | null } | null;
    attendees: Array<{ id: string; full_name: string | null; avatar_url: string | null }>;
    can_rsvp: boolean;
    capacity: number | null;
    spots_left: number | null;
    waitlist_count: number;
    user_waitlist_position: number | null;
  }) | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id;

  const { data: event, error } = await supabase
    .from("events")
    .select("*, host:users!events_created_by_fkey(full_name, avatar_url)")
    .eq("id", eventId)
    .single();

  if (error) {
    console.error("Error fetching event details:", error);
    return null;
  }

  let userRsvp = null;
  if (userId) {
    const { data: rsvpData } = await supabase
      .from("event_rsvps")
      .select("status")
      .eq("event_id", event.id)
      .eq("user_id", userId)
      .single();
    userRsvp = rsvpData;
  }

  const { count } = await supabase
    .from("event_rsvps")
    .select("*", { count: "exact", head: true })
    .eq("event_id", event.id)
    .eq("status", "going");

  const attendees = await getEventAttendees(event.id);
  const canRsvp = await canRsvpToEvent(event.id);
  const capacityInfo = await getEventCapacityInfo(event.id);
  const waitlistPosition = await getUserWaitlistPosition(event.id);

  return {
    ...event,
    rsvp_count: count || 0,
    user_rsvp: userRsvp,
    host: Array.isArray(event.host) ? event.host[0] : event.host,
    attendees,
    can_rsvp: canRsvp,
    capacity: capacityInfo?.capacity || null,
    spots_left: capacityInfo?.spotsLeft || null,
    waitlist_count: capacityInfo?.waitlistCount || 0,
    user_waitlist_position: waitlistPosition,
  };
}

// Get user's RSVP for an event
export async function getUserRsvp(
  eventId: string
): Promise<EventRsvp | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("event_rsvps")
    .select("*")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .single();

  if (error) {
    return null;
  }

  return data;
}

// Get all events with groups (admin only)
export async function getAllEventsWithGroups(): Promise<EventWithGroups[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select("*, event_groups(group_id)")
    .order("starts_at", { ascending: false });

  if (error) {
    console.error("Error fetching events with groups:", error);
    return [];
  }

  return data || [];
}

// Create event (admin only)
export async function createEvent(formData: {
  title: string;
  description?: string;
  starts_at: string;
  ends_at: string;
  zoom_url?: string;
  cover_url?: string;
  recording_url?: string;
  locked_message?: string;
  visibility?: "show_locked" | "hide";
  is_visible?: boolean;
  capacity?: string | number;
  groupIds?: string[];
}): Promise<{ success: boolean; error?: string; eventId?: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Parse capacity to integer or null
    let capacity: number | null = null;
    if (formData.capacity) {
      const parsedCapacity = typeof formData.capacity === 'string' 
        ? parseInt(formData.capacity, 10) 
        : formData.capacity;
      if (!isNaN(parsedCapacity) && parsedCapacity > 0) {
        capacity = parsedCapacity;
      }
    }

    const { data: event, error: eventError } = await supabase
      .from("events")
      .insert({
        title: formData.title,
        description: formData.description || null,
        starts_at: formData.starts_at,
        ends_at: formData.ends_at,
        zoom_url: formData.zoom_url || null,
        cover_url: formData.cover_url || null,
        recording_url: formData.recording_url || null,
        locked_message: formData.locked_message || null,
        visibility: formData.visibility || "show_locked",
        is_visible: formData.is_visible ?? true,
        capacity: capacity,
        created_by: user.id,
      })
      .select()
      .single();

    if (eventError) {
      return { success: false, error: eventError.message };
    }

    if (formData.groupIds && formData.groupIds.length > 0) {
      const eventGroups = formData.groupIds.map((groupId) => ({
        event_id: event.id,
        group_id: groupId,
      }));

      const { error: groupsError } = await supabase
        .from("event_groups")
        .insert(eventGroups);

      if (groupsError) {
        return { success: false, error: groupsError.message };
      }
    }

    revalidatePath("/dashboard/events");
    revalidatePath("/dashboard/admin/events");

    return { success: true, eventId: event.id };
  } catch (error) {
    console.error("Error creating event:", error);
    return { success: false, error: "Failed to create event" };
  }
}

// Update event (admin only)
export async function updateEvent(
  eventId: string,
  formData: {
    title?: string;
    description?: string;
    starts_at?: string;
    ends_at?: string;
    zoom_url?: string;
    cover_url?: string;
    recording_url?: string;
    locked_message?: string;
    visibility?: "show_locked" | "hide";
    is_visible?: boolean;
    capacity?: string | number | null;
    groupIds?: string[];
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const updates: Partial<Event> = {};
    if (formData.title !== undefined) updates.title = formData.title;
    if (formData.description !== undefined)
      updates.description = formData.description;
    if (formData.starts_at !== undefined) updates.starts_at = formData.starts_at;
    if (formData.ends_at !== undefined) updates.ends_at = formData.ends_at;
    if (formData.zoom_url !== undefined) updates.zoom_url = formData.zoom_url;
    if (formData.cover_url !== undefined) updates.cover_url = formData.cover_url;
    if (formData.recording_url !== undefined) updates.recording_url = formData.recording_url;
    if (formData.locked_message !== undefined)
      updates.locked_message = formData.locked_message;
    if (formData.visibility !== undefined)
      updates.visibility = formData.visibility;
    if (formData.is_visible !== undefined)
      updates.is_visible = formData.is_visible;
    
    // Handle capacity update
    if (formData.capacity !== undefined) {
      if (formData.capacity === null || formData.capacity === '') {
        updates.capacity = null;
      } else {
        const parsedCapacity = typeof formData.capacity === 'string' 
          ? parseInt(formData.capacity, 10) 
          : formData.capacity;
        if (!isNaN(parsedCapacity) && parsedCapacity > 0) {
          updates.capacity = parsedCapacity;
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from("events")
        .update(updates)
        .eq("id", eventId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }
    }

    if (formData.groupIds !== undefined) {
      await supabase.from("event_groups").delete().eq("event_id", eventId);

      if (formData.groupIds.length > 0) {
        const eventGroups = formData.groupIds.map((groupId) => ({
          event_id: eventId,
          group_id: groupId,
        }));

        const { error: groupsError } = await supabase
          .from("event_groups")
          .insert(eventGroups);

        if (groupsError) {
          return { success: false, error: groupsError.message };
        }
      }
    }

    revalidatePath("/dashboard/events");
    revalidatePath("/dashboard/admin/events");

    return { success: true };
  } catch (error) {
    console.error("Error updating event:", error);
    return { success: false, error: "Failed to update event" };
  }
}

// Delete event (admin only)
export async function deleteEvent(
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from("events").delete().eq("id", eventId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/events");
    revalidatePath("/dashboard/admin/events");

    return { success: true };
  } catch (error) {
    console.error("Error deleting event:", error);
    return { success: false, error: "Failed to delete event" };
  }
}

// Create or update RSVP
export async function upsertRsvp(
  eventId: string,
  status: "going" | "not_going" | "maybe" | "waitlist"
): Promise<{ success: boolean; error?: string; actualStatus?: string; waitlistPosition?: number }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Use the manage_event_rsvp function which handles capacity and waitlist logic
    const { data, error } = await supabase.rpc("manage_event_rsvp", {
      p_event_id: eventId,
      p_user_id: user.id,
      p_desired_status: status,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/events");

    // Return the actual status (may be 'waitlist' if capacity reached) and position
    const result = Array.isArray(data) ? data[0] : data;
    return { 
      success: true, 
      actualStatus: result?.actual_status,
      waitlistPosition: result?.waitlist_position 
    };
  } catch (error) {
    console.error("Error upserting RSVP:", error);
    return { success: false, error: "Failed to update RSVP" };
  }
}

// Delete RSVP
export async function deleteRsvp(
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Use delete_rsvp_and_promote function to handle waitlist promotion
    const { error } = await supabase.rpc("delete_rsvp_and_promote", {
      p_event_id: eventId,
      p_user_id: user.id,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/events");

    return { success: true };
  } catch (error) {
    console.error("Error deleting RSVP:", error);
    return { success: false, error: "Failed to delete RSVP" };
  }
}

// Get all RSVPs for an event (admin only)
export async function getEventRsvps(
  eventId: string
): Promise<EventRsvpWithUser[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("event_rsvps")
    .select("*, user:users(id, full_name, email, avatar_url)")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching event RSVPs:", error);
    return [];
  }

  return (data || []).map((rsvp) => ({
    event_id: rsvp.event_id,
    user_id: rsvp.user_id,
    status: rsvp.status,
    created_at: rsvp.created_at,
    updated_at: rsvp.updated_at,
    user: Array.isArray(rsvp.user) ? rsvp.user[0] : rsvp.user,
  }));
}

// Get attendees (going) for an event with avatars
export async function getEventAttendees(
  eventId: string
): Promise<Array<{ id: string; full_name: string | null; avatar_url: string | null }>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("event_rsvps")
    .select("user:users(id, full_name, avatar_url)")
    .eq("event_id", eventId)
    .eq("status", "going")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error fetching event attendees:", error);
    return [];
  }

  return (data || [])
    .map((rsvp) => {
      const user = Array.isArray(rsvp.user) ? rsvp.user[0] : rsvp.user;
      return user ? { id: user.id, full_name: user.full_name, avatar_url: user.avatar_url } : null;
    })
    .filter((user): user is { id: string; full_name: string | null; avatar_url: string | null } => user !== null);
}

// Get capacity info for an event
export async function getEventCapacityInfo(
  eventId: string
): Promise<{ 
  capacity: number | null; 
  goingCount: number; 
  spotsLeft: number | null;
  waitlistCount: number;
} | null> {
  const supabase = await createClient();

  // Get event capacity
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("capacity")
    .eq("id", eventId)
    .single();

  if (eventError) {
    console.error("Error fetching event capacity:", eventError);
    return null;
  }

  // Count going RSVPs
  const { count: goingCount } = await supabase
    .from("event_rsvps")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("status", "going");

  // Count waitlist RSVPs
  const { count: waitlistCount } = await supabase
    .from("event_rsvps")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("status", "waitlist");

  const capacity = event.capacity;
  const spotsLeft = capacity !== null ? Math.max(0, capacity - (goingCount || 0)) : null;

  return {
    capacity,
    goingCount: goingCount || 0,
    spotsLeft,
    waitlistCount: waitlistCount || 0,
  };
}

// Get user's waitlist position if they are waitlisted
export async function getUserWaitlistPosition(
  eventId: string
): Promise<number | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Get user's RSVP
  const { data: userRsvp } = await supabase
    .from("event_rsvps")
    .select("status, created_at")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .single();

  if (!userRsvp || userRsvp.status !== "waitlist") {
    return null;
  }

  // Count how many people are ahead in the waitlist
  const { count } = await supabase
    .from("event_rsvps")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("status", "waitlist")
    .lt("created_at", userRsvp.created_at);

  return (count || 0) + 1;
}

// Export event attendees as CSV (admin only)
export async function exportEventAttendees(
  eventId: string
): Promise<{ success: boolean; csv?: string; filename?: string; error?: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify user is an actual admin (not previewing)
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return { success: false, error: "Unauthorized: Admin access required" };
    }

    // Verify the event exists and admin can see it
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, title")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return { success: false, error: "Event not found" };
    }

    // Fetch all RSVPs with user details
    const { data: rsvps, error: rsvpsError } = await supabase
      .from("event_rsvps")
      .select("*, user:users(id, full_name, email, avatar_url)")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    if (rsvpsError) {
      return { success: false, error: "Failed to fetch attendees" };
    }

    // Generate CSV
    const csvRows = [
      ["Name", "Email", "Status", "Created At"].join(","),
    ];

    for (const rsvp of rsvps || []) {
      const user = Array.isArray(rsvp.user) ? rsvp.user[0] : rsvp.user;
      const name = (user?.full_name || "").replace(/"/g, '""');
      const email = (user?.email || "").replace(/"/g, '""');
      const status = rsvp.status;
      const createdAt = new Date(rsvp.created_at).toISOString();
      
      csvRows.push(
        [`"${name}"`, `"${email}"`, status, createdAt].join(",")
      );
    }

    const csv = csvRows.join("\n");
    const slug = event.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const filename = `event-${slug || eventId}-attendees.csv`;

    return { success: true, csv, filename };
  } catch (error) {
    console.error("Error exporting event attendees:", error);
    return { success: false, error: "Failed to export attendees" };
  }
}

// Event Comments actions (following pulse_comments pattern)

export type EventCommentReaction = {
  emoji: string;
  count: number;
  userReacted: boolean;
};

export interface EventComment {
  id: string;
  event_id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
  reactions?: EventCommentReaction[];
}

// Get comments for an event
export async function getEventComments(
  eventId: string,
  currentUserId?: string
): Promise<EventComment[]> {
  const supabase = await createClient();

  // Get current user if not provided
  let userId = currentUserId;
  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id;
  }

  const { data, error } = await supabase
    .from("event_comments")
    .select(`
      id,
      event_id,
      user_id,
      body,
      created_at,
      updated_at,
      user:user_id (
        id,
        full_name,
        email,
        avatar_url
      )
    `)
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching event comments:", error);
    return [];
  }

  // Fetch reactions for all comments
  const commentsWithReactions = await Promise.all(
    (data || []).map(async (comment: any) => {
      const { data: reactions } = await supabase
        .from("event_comment_reactions")
        .select("emoji, user_id")
        .eq("comment_id", comment.id);

      const reactionEmojis = ["heart", "thumbs_up", "laugh", "clap"];
      const aggregatedReactions = reactionEmojis.map((emoji) => {
        const emojiReactions = reactions?.filter((r) => r.emoji === emoji) || [];
        return {
          emoji,
          count: emojiReactions.length,
          userReacted: emojiReactions.some((r) => r.user_id === userId),
        };
      });

      return {
        id: comment.id,
        event_id: comment.event_id,
        user_id: comment.user_id,
        body: comment.body,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        user: Array.isArray(comment.user) ? comment.user[0] : comment.user,
        reactions: aggregatedReactions,
      };
    })
  );

  return commentsWithReactions;
}

// Create a comment on an event
export async function createEventComment(
  eventId: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", success: false };
  }

  if (!body.trim()) {
    return { error: "Comment body cannot be empty", success: false };
  }

  const { error } = await supabase.from("event_comments").insert({
    event_id: eventId,
    user_id: user.id,
    body: body.trim(),
  });

  if (error) {
    return { error: error.message, success: false };
  }

  revalidatePath(`/dashboard/events/${eventId}`);
  return { success: true };
}

// Update an event comment
export async function updateEventComment(
  commentId: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", success: false };
  }

  if (!body.trim()) {
    return { error: "Comment body cannot be empty", success: false };
  }

  const { error } = await supabase
    .from("event_comments")
    .update({ body: body.trim(), updated_at: new Date().toISOString() })
    .eq("id", commentId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message, success: false };
  }

  revalidatePath(`/dashboard/events`);
  return { success: true };
}

// Delete an event comment
export async function deleteEventComment(
  commentId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", success: false };
  }

  // Check if user is admin
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = userData?.role === "admin";

  // Delete if own comment or admin
  const query = supabase.from("event_comments").delete().eq("id", commentId);

  if (!isAdmin) {
    query.eq("user_id", user.id);
  }

  const { error } = await query;

  if (error) {
    return { error: error.message, success: false };
  }

  revalidatePath(`/dashboard/events`);
  return { success: true };
}

// Toggle a reaction on an event comment
export async function toggleEventCommentReaction(commentId: string, emoji: string) {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Check if reaction already exists
  const { data: existingReaction } = await supabase
    .from("event_comment_reactions")
    .select("id")
    .eq("comment_id", commentId)
    .eq("user_id", user.id)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existingReaction) {
    // Remove reaction
    const { error } = await supabase
      .from("event_comment_reactions")
      .delete()
      .eq("id", existingReaction.id);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/dashboard/events");
    return { success: true, action: "removed" };
  } else {
    // Add reaction
    const { error } = await supabase
      .from("event_comment_reactions")
      .insert({
        comment_id: commentId,
        user_id: user.id,
        emoji,
      });

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/dashboard/events");
    return { success: true, action: "added" };
  }
}
