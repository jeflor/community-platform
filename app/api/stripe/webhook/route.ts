import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const GRACE_PERIOD_DAYS = 3;

export async function POST(request: NextRequest) {
  // Check if Stripe is configured
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 500 }
    );
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "No signature provided" },
      { status: 400 }
    );
  }

  try {
    // Dynamically import Stripe
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-08-26.dahlia",
    });

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook handler failed" },
      { status: 400 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: any) {
  const supabase = createAdminClient();
  const userId = session.metadata?.user_id;

  if (!userId) {
    console.error("No user_id in session metadata");
    return;
  }

  // Get the subscription details
  const subscriptionId = session.subscription;
  const customerId = session.customer;

  // Get the line items to find the price ID
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-08-26.dahlia",
  });

  const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
  const priceId = lineItems.data[0]?.price?.id;

  if (!priceId) {
    console.error("No price ID found in checkout session");
    return;
  }

  // Find the product by price ID
  const { data: product } = await supabase
    .from("products")
    .select("id")
    .eq("stripe_price_id", priceId)
    .single();

  if (!product) {
    console.error(`No product found for price ID: ${priceId}`);
    return;
  }

  // Create or update purchase
  const { error } = await supabase.from("purchases").upsert(
    {
      user_id: userId,
      product_id: product.id,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      stripe_checkout_session_id: session.id,
      status: "active",
      payment_status: "paid",
      purchased_at: new Date().toISOString(),
    },
    { onConflict: "user_id,product_id" }
  );

  if (error) {
    console.error("Error creating purchase:", error);
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  const supabase = createAdminClient();

  // Get the price ID from the subscription
  const priceId = subscription.items.data[0]?.price?.id;

  if (!priceId) {
    console.error("No price ID found in subscription");
    return;
  }

  // Find the product by price ID
  const { data: product } = await supabase
    .from("products")
    .select("id")
    .eq("stripe_price_id", priceId)
    .single();

  if (!product) {
    console.error(`No product found for price ID: ${priceId}`);
    return;
  }

  // Determine status based on subscription status
  let status = "active";
  let expiresAt = null;
  let gracePeriodUntil = null;

  if (subscription.status === "active") {
    status = "active";
  } else if (subscription.status === "past_due") {
    status = "past_due";
    // Set grace period
    gracePeriodUntil = new Date();
    gracePeriodUntil.setDate(gracePeriodUntil.getDate() + GRACE_PERIOD_DAYS);
  } else if (
    subscription.status === "canceled" ||
    subscription.status === "unpaid"
  ) {
    status = "cancelled";
    expiresAt = new Date(subscription.current_period_end * 1000);
  }

  // Update purchase
  const { error } = await supabase
    .from("purchases")
    .update({
      status,
      expires_at: expiresAt?.toISOString(),
      grace_period_until: gracePeriodUntil?.toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    console.error("Error updating purchase:", error);
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  const supabase = createAdminClient();

  // Mark purchase as cancelled
  const { error } = await supabase
    .from("purchases")
    .update({
      status: "cancelled",
      expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    console.error("Error cancelling purchase:", error);
  }
}

async function handleInvoicePaymentFailed(invoice: any) {
  const supabase = createAdminClient();

  const subscriptionId = invoice.subscription;

  if (!subscriptionId) {
    console.error("No subscription ID in invoice");
    return;
  }

  // Set grace period for the purchase
  const gracePeriodUntil = new Date();
  gracePeriodUntil.setDate(gracePeriodUntil.getDate() + GRACE_PERIOD_DAYS);

  const { error } = await supabase
    .from("purchases")
    .update({
      status: "past_due",
      payment_status: "failed",
      grace_period_until: gracePeriodUntil.toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId);

  if (error) {
    console.error("Error updating purchase after payment failure:", error);
  }
}
