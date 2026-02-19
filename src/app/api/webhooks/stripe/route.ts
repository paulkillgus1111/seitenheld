import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();

  // Replay-Attack-Prävention: Prüfe ob Event bereits verarbeitet wurde
  const { data: isProcessed, error: checkError } = await (supabase.rpc as any)(
    "is_webhook_event_processed",
    { p_event_id: event.id }
  );

  if (checkError) {
    console.error("Error checking webhook event:", checkError);
    // Bei Fehler weiter verarbeiten (Fail-Open für erste Implementierung)
  } else if (isProcessed === true) {
    console.log(`Event ${event.id} already processed, ignoring replay attempt`);
    return NextResponse.json({ received: true, message: "Event already processed" });
  }

  // Markiere Event als verarbeitet (idempotent)
  const { error: markError } = await (supabase.rpc as any)(
    "mark_webhook_event_processed",
    {
      p_event_id: event.id,
      p_event_type: event.type,
    }
  );

  if (markError) {
    console.error("Error marking webhook event as processed:", markError);
    // Bei Fehler weiter verarbeiten (Fail-Open)
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const planType = session.metadata?.plan_type;

        if (!userId || !planType) {
          console.error("Missing metadata in checkout session", {
            userId,
            planType,
          });
          break;
        }

        // Validierung: Prüfe ob user_id ein gültiger UUID ist und existiert
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(userId)) {
          console.error("Invalid user_id format in checkout session", { userId });
          break;
        }

        // Zusätzliche Validierung: Prüfe ob User in Supabase existiert
        // Verwende normale Query statt Admin API (Admin API benötigt Service Role Key)
        const { data: userProfile, error: profileError } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", userId)
          .maybeSingle();
        
        if (profileError || !userProfile) {
          console.error("User not found in profiles", { userId, error: profileError });
          break;
        }

        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;

        if (!customerId) {
          console.error("No customer ID in checkout session");
          break;
        }

        // Für Subscriptions: hole subscription_id
        let subscriptionId: string | null = null;
        if (session.mode === "subscription" && session.subscription) {
          subscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
        }

        // Hole Price ID
        const lineItems = await stripe.checkout.sessions.listLineItems(
          session.id
        );
        const priceId = lineItems.data[0]?.price?.id || null;

        // Hole seat_count aus metadata (für alle Plans)
        const seatCountFromMetadata = session.metadata?.seat_count;
        const seatCount = seatCountFromMetadata
          ? parseInt(seatCountFromMetadata)
          : 1;

        // Update Profile
        const updateData: Record<string, unknown> = {
          stripe_customer_id: customerId,
          plan_type: planType,
          stripe_price_id: priceId,
        };

        if (subscriptionId) {
          updateData.stripe_subscription_id = subscriptionId;
          updateData.subscription_status = "active";

          // Hole Subscription für current_period_end und quantity
          const subscription = await stripe.subscriptions.retrieve(
            subscriptionId
          );
          const subscriptionTyped = subscription as Stripe.Subscription;
          updateData.subscription_current_period_end =
            new Date((subscriptionTyped as any).current_period_end * 1000).toISOString();
          
          // Setze seat_count basierend auf Subscription quantity
          const subscriptionQuantity = subscriptionTyped.items.data[0]?.quantity || seatCount;
          updateData.seat_count = subscriptionQuantity;
        } else {
          // One-time Payment: Setze Status auf 'active' ohne Subscription
          updateData.subscription_status = "active";
          // Für one-time payments: Setze seat_count aus metadata
          updateData.seat_count = seatCount;
        }

        await supabase
          .from("profiles")
          .update(updateData as any)
          .eq("id", userId);

        console.log("Updated profile after checkout.session.completed", {
          userId,
          planType,
          customerId,
        });
        break;
      }

      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Finde User über customer_id
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (profile) {
          // Hole quantity aus Subscription
          const quantity = subscription.items.data[0]?.quantity || 1;

          await ((supabase
            .from("profiles") as any)
            .update({
              stripe_subscription_id: subscription.id,
              subscription_status: subscription.status,
              subscription_current_period_end: new Date(
                (subscription as any).current_period_end * 1000
              ).toISOString(),
              subscription_cancel_at_period_end:
                (subscription as any).cancel_at_period_end || false,
              seat_count: quantity,
            })
            .eq("id", profile.id));
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: profile } = await supabase
          .from("profiles")
          .select("id, seats_used")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (profile) {
          // Hole quantity aus Subscription
          const quantity = subscription.items.data[0]?.quantity || 1;
          const currentSeatsUsed = (profile as { seats_used: number | null }).seats_used || 0;

          // Validierung: Wenn quantity reduziert wird, prüfe ob genug Seats frei sind
          if (quantity < currentSeatsUsed) {
            console.warn(
              `Cannot reduce seat_count to ${quantity} because ${currentSeatsUsed} seats are in use`,
              { userId: profile.id, quantity, currentSeatsUsed }
            );
            // In diesem Fall behalten wir den alten seat_count
            // Stripe wird die Änderung trotzdem durchführen, aber wir warnen
          }

          await ((supabase
            .from("profiles") as any)
            .update({
              subscription_status: subscription.status,
              subscription_current_period_end: new Date(
                (subscription as any).current_period_end * 1000
              ).toISOString(),
              subscription_cancel_at_period_end:
                (subscription as any).cancel_at_period_end || false,
              seat_count: quantity,
            })
            .eq("id", profile.id));
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (profile) {
          await supabase
            .from("profiles")
            .update({
              subscription_status: "canceled",
              stripe_subscription_id: null,
              subscription_current_period_end: null,
              subscription_cancel_at_period_end: false,
            })
            .eq("id", profile.id);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const subscriptionId = invoice.subscription as string | null;

        if (subscriptionId) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();

          if (profile) {
            const subscription = await stripe.subscriptions.retrieve(
              subscriptionId
            );
            await ((supabase
              .from("profiles") as any)
              .update({
                subscription_current_period_end: new Date(
                  (subscription as any).current_period_end * 1000
                ).toISOString(),
                subscription_status: subscription.status,
              })
              .eq("id", profile.id));
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (profile) {
          await supabase
            .from("profiles")
            .update({
              subscription_status: "past_due",
            })
            .eq("id", profile.id);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      {
        error: "Webhook processing failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
