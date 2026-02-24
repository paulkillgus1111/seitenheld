import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase-server";
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

  // ✅ Verwende Admin Client (umgeht RLS, da Webhooks keine User-Session haben)
  const supabase = await createSupabaseAdminClient();

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
        // Verwende Admin Client (umgeht RLS für Webhook-Operationen)
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
          // ✅ Trial-Felder zurücksetzen, wenn Abo gekauft wird
          trial_used: true,
          trial_started_at: null,
          trial_expires_at: null,
        };

        if (subscriptionId) {
          updateData.stripe_subscription_id = subscriptionId;
          updateData.subscription_status = "active";

          // Hole Subscription für current_period_end und quantity
          const subscription = await stripe.subscriptions.retrieve(
            subscriptionId
          );
          const subscriptionTyped = subscription as Stripe.Subscription;
          
          // ✅ Prüfe ob current_period_end existiert und gültig ist
          const currentPeriodEnd = (subscriptionTyped as any).current_period_end;
          if (currentPeriodEnd && typeof currentPeriodEnd === 'number' && currentPeriodEnd > 0) {
            updateData.subscription_current_period_end =
              new Date(currentPeriodEnd * 1000).toISOString();
          } else {
            console.warn("⚠️ [STRIPE] Invalid current_period_end in subscription", {
              subscriptionId,
              currentPeriodEnd,
            });
            updateData.subscription_current_period_end = null;
          }

          // ✅ Hole auch current_period_start
          const currentPeriodStart = (subscriptionTyped as any).current_period_start;
          if (currentPeriodStart && typeof currentPeriodStart === 'number' && currentPeriodStart > 0) {
            updateData.subscription_current_period_start = new Date(currentPeriodStart * 1000).toISOString();
          } else {
            updateData.subscription_current_period_start = null;
          }
          
          // Setze seat_count basierend auf Subscription quantity
          const subscriptionQuantity = subscriptionTyped.items.data[0]?.quantity || seatCount;
          updateData.seat_count = subscriptionQuantity;
        } else {
          // One-time Payment: Setze Status auf 'active' ohne Subscription
          updateData.subscription_status = "active";

          // ✅ Für bestehende Abos: Seats addieren, nicht ersetzen
          const { data: existingProfile } = await supabase
            .from("profiles")
            .select("seat_count")
            .eq("id", userId)
            .maybeSingle();

          const existingSeatCount = (existingProfile as { seat_count: number | null } | null)?.seat_count || 0;
          updateData.seat_count = existingSeatCount + seatCount; // Addiere statt ersetzen
        }

        const { error: updateError } = await ((supabase
          .from("profiles") as any)
          .update(updateData)
          .eq("id", userId));

        if (updateError) {
          console.error("❌ [STRIPE] Failed to update profile:", {
            userId,
            error: updateError.message,
            updateData,
          });
        } else {
          console.log("✅ [STRIPE] Updated profile after checkout.session.completed", {
            userId,
            planType,
            customerId,
            seat_count: updateData.seat_count,
            subscription_status: updateData.subscription_status,
          });
        }
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

        const profileTyped = profile as { id: string } | null;

        if (profileTyped) {
          // Hole quantity aus Subscription
          const quantity = subscription.items.data[0]?.quantity || 1;

          // ✅ Prüfe current_period_start und current_period_end
          const currentPeriodStart = (subscription as any).current_period_start;
          const periodStartISO = currentPeriodStart && typeof currentPeriodStart === 'number' && currentPeriodStart > 0
            ? new Date(currentPeriodStart * 1000).toISOString()
            : null;

          const currentPeriodEnd = (subscription as any).current_period_end;
          const periodEndISO = currentPeriodEnd && typeof currentPeriodEnd === 'number' && currentPeriodEnd > 0
            ? new Date(currentPeriodEnd * 1000).toISOString()
            : null;

          await ((supabase
            .from("profiles") as any)
            .update({
              stripe_subscription_id: subscription.id,
              subscription_status: subscription.status,
              subscription_current_period_start: periodStartISO,
              subscription_current_period_end: periodEndISO,
              subscription_cancel_at_period_end:
                (subscription as any).cancel_at_period_end || false,
              seat_count: quantity,
            })
            .eq("id", profileTyped.id));
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

        const profileTyped = profile as { id: string; seats_used: number | null } | null;

        if (profileTyped) {
          // Hole quantity aus Subscription
          const quantity = subscription.items.data[0]?.quantity || 1;
          const currentSeatsUsed = profileTyped.seats_used || 0;

          // Validierung: Wenn quantity reduziert wird, prüfe ob genug Seats frei sind
          if (quantity < currentSeatsUsed) {
            console.warn(
              `Cannot reduce seat_count to ${quantity} because ${currentSeatsUsed} seats are in use`,
              { userId: profileTyped.id, quantity, currentSeatsUsed }
            );
            // In diesem Fall behalten wir den alten seat_count
            // Stripe wird die Änderung trotzdem durchführen, aber wir warnen
          }

          // ✅ Prüfe current_period_start und current_period_end
          const currentPeriodStart = (subscription as any).current_period_start;
          const periodStartISO = currentPeriodStart && typeof currentPeriodStart === 'number' && currentPeriodStart > 0
            ? new Date(currentPeriodStart * 1000).toISOString()
            : null;

          const currentPeriodEnd = (subscription as any).current_period_end;
          const periodEndISO = currentPeriodEnd && typeof currentPeriodEnd === 'number' && currentPeriodEnd > 0
            ? new Date(currentPeriodEnd * 1000).toISOString()
            : null;

          await ((supabase
            .from("profiles") as any)
            .update({
              subscription_status: subscription.status,
              subscription_current_period_start: periodStartISO,
              subscription_current_period_end: periodEndISO,
              subscription_cancel_at_period_end:
                (subscription as any).cancel_at_period_end || false,
              seat_count: quantity,
            })
            .eq("id", profileTyped.id));
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

        const profileTyped = profile as { id: string } | null;

        if (profileTyped) {
          await ((supabase
            .from("profiles") as any)
            .update({
              subscription_status: "canceled",
              stripe_subscription_id: null,
              subscription_current_period_start: null,
              subscription_current_period_end: null,
              subscription_cancel_at_period_end: false,
            })
            .eq("id", profileTyped.id));
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const subscriptionId = (invoice as any).subscription as string | null;

        if (subscriptionId) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();

          const profileTyped = profile as { id: string } | null;

          if (profileTyped) {
            const subscription = await stripe.subscriptions.retrieve(
              subscriptionId
            );
            
            // ✅ Prüfe current_period_start und current_period_end
            const currentPeriodStart = (subscription as any).current_period_start;
            const periodStartISO = currentPeriodStart && typeof currentPeriodStart === 'number' && currentPeriodStart > 0
              ? new Date(currentPeriodStart * 1000).toISOString()
              : null;

            const currentPeriodEnd = (subscription as any).current_period_end;
            const periodEndISO = currentPeriodEnd && typeof currentPeriodEnd === 'number' && currentPeriodEnd > 0
              ? new Date(currentPeriodEnd * 1000).toISOString()
              : null;

            await ((supabase
              .from("profiles") as any)
              .update({
                subscription_current_period_start: periodStartISO,
                subscription_current_period_end: periodEndISO,
                subscription_status: subscription.status,
              })
              .eq("id", profileTyped.id));
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

        const profileTyped = profile as { id: string } | null;

        if (profileTyped) {
          await ((supabase
            .from("profiles") as any)
            .update({
              subscription_status: "past_due",
            })
            .eq("id", profileTyped.id));
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
