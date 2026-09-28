"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const createCheckoutSessionSchema = z.object({
  priceId: z.string().min(1, "Price ID is required"),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export async function createCheckoutSession(
  data: z.infer<typeof createCheckoutSessionSchema>
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const validation = createCheckoutSessionSchema.safeParse(data);
  if (!validation.success) {
    return { error: validation.error.errors[0].message };
  }

  // Check if Stripe is configured
  if (!process.env.STRIPE_SECRET_KEY) {
    return {
      error:
        "Stripe is not configured. Add STRIPE_SECRET_KEY to your environment variables.",
    };
  }

  try {
    // Dynamically import Stripe to avoid build errors when keys are missing
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-08-26.dahlia",
    });

    // Get user email
    const { data: userData } = await supabase
      .from("users")
      .select("email")
      .eq("id", user.id)
      .single();

    if (!userData) {
      return { error: "User not found" };
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: userData.email,
      line_items: [
        {
          price: validation.data.priceId,
          quantity: 1,
        },
      ],
      success_url: validation.data.successUrl,
      cancel_url: validation.data.cancelUrl,
      metadata: {
        user_id: user.id,
      },
    });

    return { success: true, url: session.url };
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to create checkout session",
    };
  }
}

export async function createCustomerPortalSession(returnUrl: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Check if Stripe is configured
  if (!process.env.STRIPE_SECRET_KEY) {
    return {
      error:
        "Stripe is not configured. Add STRIPE_SECRET_KEY to your environment variables.",
    };
  }

  try {
    // Get user's Stripe customer ID from their purchases
    const { data: purchase } = await supabase
      .from("purchases")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .not("stripe_customer_id", "is", null)
      .limit(1)
      .single();

    if (!purchase?.stripe_customer_id) {
      return { error: "No active subscription found" };
    }

    // Dynamically import Stripe
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-08-26.dahlia",
    });

    // Create Customer Portal Session
    const session = await stripe.billingPortal.sessions.create({
      customer: purchase.stripe_customer_id,
      return_url: returnUrl,
    });

    return { success: true, url: session.url };
  } catch (error) {
    console.error("Stripe portal error:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to create portal session",
    };
  }
}
