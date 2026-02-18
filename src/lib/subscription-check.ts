// Server-only helper for checking subscription access in API routes
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "./supabase-server";
import { getTrialStatus } from "./trial-server";
import { isSubscriptionActive, type SubscriptionStatus } from "./subscription";

export type SubscriptionCheckResult =
  | { allowed: true }
  | { allowed: false; response: NextResponse };

/**
 * Prüft ob ein User Zugriff auf API-Funktionen hat.
 * Erlaubt:
 * - Aktive Subscription
 * - Aktiver Trial
 * - Verfügbarer Trial (noch nicht gestartet - für ersten Lead)
 * Blockiert:
 * - Abgelaufener Trial
 * - Verwendeter Trial (ohne aktive Subscription)
 */
export async function checkSubscriptionAccess(
  userId: string
): Promise<SubscriptionCheckResult> {
  const supabase = await createSupabaseServerClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status")
    .eq("id", userId)
    .maybeSingle();

  const profileTyped = profile as {
    subscription_status: string | null;
  } | null;

  const status = (profileTyped?.subscription_status ||
    "none") as SubscriptionStatus;

  const trialStatus = await getTrialStatus(userId);

  // Erlaube wenn:
  // - Subscription aktiv ist ODER
  // - Trial aktiv ist ODER
  // - Trial noch verfügbar ist (noch nicht gestartet - erlaubt ersten Lead)
  const hasAccess =
    isSubscriptionActive(status, trialStatus) || trialStatus === "available";

  if (!hasAccess) {
    return {
      allowed: false,
      response: NextResponse.json(
        {
          error: "Subscription required",
          details:
            "Dein Trial ist abgelaufen. Bitte wähle einen Plan, um die Funktionen zu nutzen.",
        },
        { status: 403 }
      ),
    };
  }

  return { allowed: true };
}
