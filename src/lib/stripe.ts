import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-12-15.clover",
  typescript: true,
});

export type PlanType = "yearly" | "messe_pass" | "ltd";

export async function createCheckoutSession({
  customerId,
  customerEmail,
  priceId,
  planType,
  userId,
  mode,
  quantity = 1,
}: {
  customerId?: string;
  customerEmail: string;
  priceId: string;
  planType: PlanType;
  userId: string;
  mode: "subscription" | "payment";
  quantity?: number;
}) {
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode,
    line_items: [
      {
        price: priceId,
        quantity: quantity,
      },
    ],
    metadata: {
      user_id: userId,
      plan_type: planType,
      seat_count: quantity.toString(),
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/pricing/cancel`,
  };

  // WICHTIG: Nur EINES von beiden setzen
  if (customerId) {
    sessionParams.customer = customerId;
    // customer_email NICHT setzen, wenn customer gesetzt ist
  } else {
    sessionParams.customer_email = customerEmail;
  }

  if (mode === "subscription") {
    sessionParams.subscription_data = {
      metadata: {
        user_id: userId,
        plan_type: planType,
        seat_count: quantity.toString(),
      },
    };
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  return session;
}

export async function createCustomerPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

export async function getSubscriptionStatus(
  subscriptionId: string
): Promise<Stripe.Subscription | null> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    console.error("Error retrieving subscription:", error);
    return null;
  }
}
