import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createCheckoutSession, type PlanType } from "@/lib/stripe";
import { withRateLimit } from "@/lib/rate-limit-middleware";
import { rateLimitConfigs } from "@/lib/rate-limit";

const planConfig: Record<
  PlanType,
  { priceId: string; mode: "subscription" | "payment" }
> = {
  yearly: {
    priceId:
      process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY ||
      "price_yearly_placeholder",
    mode: "subscription",
  },
  messe_pass: {
    priceId:
      process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MESSE_PASS ||
      "price_messe_pass_placeholder",
    mode: "payment",
  },
  ltd: {
    priceId:
      process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_LTD || "price_ltd_placeholder",
    mode: "payment",
  },
};

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate Limiting: Payment-Schutz (verhindert Checkout-Spam)
    const rateLimitResult = await withRateLimit(request, {
      config: rateLimitConfigs.checkout,
      identifier: user.id, // User-ID für user-basierte Limits
    });

    if (!rateLimitResult.success) {
      return rateLimitResult.response;
    }

    const body = await request.json();
    const { planType, seatCount } = body;

    if (!planType || !["yearly", "messe_pass", "ltd"].includes(planType)) {
      return NextResponse.json(
        { error: "Invalid plan type" },
        { status: 400 }
      );
    }

    const config = planConfig[planType as PlanType];
    if (!config) {
      return NextResponse.json(
        { error: "Plan configuration not found" },
        { status: 400 }
      );
    }

    // Lade User-Profile für E-Mail
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    const profileTyped = profile as {
      email: string | null;
      stripe_customer_id: string | null;
    } | null;

    const customerEmail =
      profileTyped?.email || user.email || "";
    const customerId = profileTyped?.stripe_customer_id || undefined;

    if (!customerEmail) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    // Quantity für alle Plans (auch one-time payments unterstützen quantity)
    const quantity = Math.max(1, Math.min(10, parseInt(seatCount) || 1));

    const checkoutSession = await createCheckoutSession({
      customerId,
      customerEmail,
      priceId: config.priceId,
      planType: planType as PlanType,
      userId: user.id,
      mode: config.mode,
      quantity: quantity,
    });

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error) {
    console.error("Checkout session creation error:", error);
    return NextResponse.json(
      {
        error: "Failed to create checkout session",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
