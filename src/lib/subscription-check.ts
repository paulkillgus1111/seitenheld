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
 * - Messe-Pass (wenn Event noch nicht abgelaufen)
 * Blockiert:
 * - Abgelaufener Trial
 * - Verwendeter Trial (ohne aktive Subscription)
 * - Abgelaufener Messe-Pass (Event-Enddatum überschritten)
 */
export async function checkSubscriptionAccess(
  userId: string
): Promise<SubscriptionCheckResult> {
  const supabase = await createSupabaseServerClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status, plan_type, subscription_current_period_end")
    .eq("id", userId)
    .maybeSingle();

  const profileTyped = profile as {
    subscription_status: string | null;
    plan_type: string | null;
    subscription_current_period_end: string | null;
  } | null;

  const status = (profileTyped?.subscription_status ||
    "none") as SubscriptionStatus;

  // ✅ Prüfe Messe-Pass Ablaufdatum
  if (profileTyped?.plan_type === "messe_pass" && profileTyped?.subscription_status === "active") {
    if (profileTyped.subscription_current_period_end) {
      const endDate = new Date(profileTyped.subscription_current_period_end);
      const now = new Date();

      // Wenn Event abgelaufen ist, blockiere Zugriff
      if (now > endDate) {
        return {
          allowed: false,
          response: NextResponse.json(
            {
              error: "Messe-Pass abgelaufen",
              details:
                "Dein Messe-Pass ist abgelaufen. Das Event ist beendet. Bitte wähle einen neuen Plan, um die Funktionen weiter zu nutzen.",
            },
            { status: 403 }
          ),
        };
      }
    }
  }

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
