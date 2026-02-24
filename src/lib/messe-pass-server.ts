// Server-only messe_pass functions
import { createSupabaseServerClient } from "./supabase-server";

/**
 * Aktiviert Messe-Pass für ein Event beim ersten Lead.
 * Setzt subscription_current_period_end auf das Event-Enddatum.
 */
export async function activateMessePassForEvent(
  userId: string,
  eventId: string
): Promise<boolean> {
  const supabase = await createSupabaseServerClient();

  // 1. Prüfe ob User Messe-Pass hat
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_type, subscription_status, subscription_current_period_end")
    .eq("id", userId)
    .maybeSingle();

  const profileTyped = profile as {
    plan_type: string | null;
    subscription_status: string | null;
    subscription_current_period_end: string | null;
  } | null;

  // Nur wenn Messe-Pass aktiv ist
  if (profileTyped?.plan_type !== "messe_pass" || profileTyped?.subscription_status !== "active") {
    return false;
  }

  // Wenn bereits ein Ablaufdatum gesetzt ist, nicht überschreiben
  if (profileTyped.subscription_current_period_end) {
    return false;
  }

  // 2. Prüfe ob dies der erste Lead für dieses Event ist
  const { count: leadCount } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId)
    .is("deleted_at", null);

  // Nur wenn genau 1 Lead existiert (der gerade erstellte)
  if (leadCount !== 1) {
    return false;
  }

  // 3. Hole Event-Enddatum
  const { data: event } = await supabase
    .from("events")
    .select("end_date")
    .eq("id", eventId)
    .eq("user_id", userId)
    .maybeSingle();

  const eventTyped = event as { end_date: string | null } | null;

  if (!eventTyped?.end_date) {
    console.warn("⚠️ [MESSE-PASS] Event has no end_date, cannot activate messe_pass", {
      userId,
      eventId,
    });
    return false;
  }

  // 4. Setze subscription_current_period_end auf Event-Enddatum
  const { error } = await ((supabase.from("profiles") as any)
    .update({
      subscription_current_period_end: eventTyped.end_date,
    })
    .eq("id", userId)
    .eq("plan_type", "messe_pass")
    .is("subscription_current_period_end", null)); // Nur wenn noch nicht gesetzt

  if (error) {
    console.error("❌ [MESSE-PASS] Failed to set subscription_current_period_end:", error);
    return false;
  }

  console.log("✅ [MESSE-PASS] Activated messe_pass for event", {
    userId,
    eventId,
    endDate: eventTyped.end_date,
  });

  return true;
}
