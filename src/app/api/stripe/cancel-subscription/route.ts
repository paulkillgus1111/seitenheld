import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { stripe } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Lade User-Profile für Stripe Subscription ID
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_subscription_id, plan_type")
      .eq("id", user.id)
      .maybeSingle();

    const profileTyped = profile as {
      stripe_subscription_id: string | null;
      plan_type: string | null;
    } | null;

    if (!profileTyped?.stripe_subscription_id) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 400 }
      );
    }

    // Nur yearly Pläne können gekündigt werden
    if (profileTyped.plan_type !== "yearly") {
      return NextResponse.json(
        { error: "This plan cannot be cancelled" },
        { status: 400 }
      );
    }

    // Kündige das Abo am Ende der Periode (nicht sofort)
    const subscription = await stripe.subscriptions.update(
      profileTyped.stripe_subscription_id,
      {
        cancel_at_period_end: true,
      }
    );

    // Type assertion für Stripe Subscription
    const subscriptionTyped = subscription as Stripe.Subscription;

    // Aktualisiere den Status in der Datenbank
    await ((supabase
      .from("profiles") as any)
      .update({
        subscription_cancel_at_period_end: true,
      })
      .eq("id", user.id));

    return NextResponse.json({
      success: true,
      message: "Subscription will be cancelled at the end of the billing period",
      cancel_at: subscriptionTyped.cancel_at
        ? new Date(subscriptionTyped.cancel_at * 1000).toISOString()
        : subscriptionTyped.current_period_end
        ? new Date(subscriptionTyped.current_period_end * 1000).toISOString()
        : null,
    });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    return NextResponse.json(
      {
        error: "Failed to cancel subscription",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
