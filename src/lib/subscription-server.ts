// Server-only subscription functions (use in Server Components only)
import { createSupabaseServerClient } from "./supabase-server";
import type {
  SubscriptionStatus,
  PlanType,
  UserSubscription,
} from "./subscription";

export async function getUserSubscriptionStatus(
  userId: string
): Promise<UserSubscription | null> {
  const supabase = await createSupabaseServerClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "subscription_status, plan_type, subscription_current_period_end, subscription_cancel_at_period_end, stripe_customer_id, stripe_subscription_id"
    )
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile) {
    return null;
  }

  const profileTyped = profile as {
    subscription_status: SubscriptionStatus;
    plan_type: PlanType;
    subscription_current_period_end: string | null;
    subscription_cancel_at_period_end: boolean | null;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
  };

  return {
    status: profileTyped.subscription_status || "none",
    planType: profileTyped.plan_type || "none",
    currentPeriodEnd: profileTyped.subscription_current_period_end
      ? new Date(profileTyped.subscription_current_period_end)
      : null,
    cancelAtPeriodEnd: profileTyped.subscription_cancel_at_period_end || false,
    stripeCustomerId: profileTyped.stripe_customer_id,
    stripeSubscriptionId: profileTyped.stripe_subscription_id,
  };
}
