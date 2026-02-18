import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createCustomerPortalSession } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Lade User-Profile für Stripe Customer ID
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", session.user.id)
      .maybeSingle();

    const profileTyped = profile as {
      stripe_customer_id: string | null;
    } | null;

    if (!profileTyped?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No Stripe customer found. Please subscribe first." },
        { status: 400 }
      );
    }

    const returnUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const portalUrl = `${returnUrl}/dashboard/settings`;

    const portalSession = await createCustomerPortalSession({
      customerId: profileTyped.stripe_customer_id,
      returnUrl: portalUrl,
    });

    return NextResponse.json({
      url: portalSession.url,
    });
  } catch (error) {
    console.error("Customer portal session creation error:", error);
    return NextResponse.json(
      {
        error: "Failed to create portal session",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
