"use server";

import { createClient } from "@/lib/supabase/server";

export interface LockedSettings {
  enabled: boolean;
  messages: {
    course: string;
    event: string;
    document: string;
    channel: string;
  };
}

const DEFAULT_MESSAGES = {
  course: "This course is available to premium members.",
  event: "This event is available to premium members.",
  document: "This resource is available to premium members.",
  channel: "This channel is available to premium members.",
};

export async function getLockedSettings(): Promise<LockedSettings> {
  try {
    const supabase = await createClient();
    
    const { data } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["locked_message_enabled", "locked_messages"]);

    if (!data) {
      return {
        enabled: true,
        messages: DEFAULT_MESSAGES,
      };
    }

    const settings = data.reduce(
      (acc: Record<string, any>, row: { key: string; value: any }) => {
        acc[row.key] = row.value;
        return acc;
      },
      {} as Record<string, any>
    );

    const enabled = settings.locked_message_enabled === "true";
    
    let messages = DEFAULT_MESSAGES;
    if (settings.locked_messages) {
      try {
        const parsed = typeof settings.locked_messages === 'string' 
          ? JSON.parse(settings.locked_messages)
          : settings.locked_messages;
        
        messages = {
          course: parsed.courses || DEFAULT_MESSAGES.course,
          event: parsed.events || DEFAULT_MESSAGES.event,
          document: parsed.documents || DEFAULT_MESSAGES.document,
          channel: parsed.channels || DEFAULT_MESSAGES.channel,
        };
      } catch {
        // Use defaults if parsing fails
      }
    }

    return { enabled, messages };
  } catch (error) {
    console.error("Failed to fetch locked settings:", error);
    return {
      enabled: true,
      messages: DEFAULT_MESSAGES,
    };
  }
}

export async function getActiveProductInfo(): Promise<{
  count: number;
  singleProductName: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: products } = await supabase
      .from("products")
      .select("id, name")
      .eq("is_active", true);

    if (!products || products.length === 0) {
      return { count: 0, singleProductName: null };
    }

    return {
      count: products.length,
      singleProductName: products.length === 1 ? products[0].name : null,
    };
  } catch (error) {
    console.error("Failed to fetch active products:", error);
    return { count: 0, singleProductName: null };
  }
}
