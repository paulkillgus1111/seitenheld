// Server-only trial functions (use in Server Components only)
import { createSupabaseServerClient } from "./supabase-server";
import type { TrialStatus } from "./trial";

export async function getTrialStatus(userId: string): Promise<TrialStatus> {
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("trial_started_at, trial_used, trial_expires_at, subscription_status")
    .eq("id", userId)
    .maybeSingle();

  const profileTyped = profile as {
    trial_started_at: string | null;
    trial_used: boolean | null;
    trial_expires_at: string | null;
    subscription_status: string | null;
  } | null;

  if (!profileTyped) return "available";

  // Wenn bereits bezahlt, kein Trial mehr
  if (profileTyped.subscription_status === "active") {
    return "used";
  }

  // Wenn Trial bereits verwendet wurde
  if (profileTyped.trial_used) {
    return "used";
  }

  // Wenn Trial aktiv ist
  if (profileTyped.trial_started_at && profileTyped.trial_expires_at) {
    const now = new Date();
    const expiresAt = new Date(profileTyped.trial_expires_at);

    // ✅ NEU: Prüfe ob Trial abgelaufen ist und aktualisiere subscription_status automatisch
    if (now >= expiresAt && profileTyped.subscription_status === "trialing") {
      // Trial ist abgelaufen - aktualisiere subscription_status automatisch
      await ((supabase.from("profiles") as any)
        .update({
          subscription_status: "none",
          trial_used: true,
        })
        .eq("id", userId)
        .eq("subscription_status", "trialing")); // Zusätzliche Bedingung verhindert Race Conditions
      
      return "expired";
    }

    if (now < expiresAt) {
      return "active";
    } else {
      return "expired";
    }
  }

  return "available";
}

export async function startTrialOnFirstLead(userId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();

  // Prüfe direkt über Events (sauberer Ansatz)
  const { data: userEvents } = await supabase
    .from("events")
    .select("id")
    .eq("user_id", userId);

  const userEventsTyped = userEvents as { id: string }[] | null;

  // Wenn bereits Events existieren, prüfe ob Leads existieren
  if (userEventsTyped && userEventsTyped.length > 0) {
    const eventIds = userEventsTyped.map((e) => e.id);
    const { count: actualLeadCount } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .in("event_id", eventIds);

    // Wenn bereits Leads existieren, kein Trial mehr
    if (actualLeadCount && actualLeadCount > 0) {
      return false;
    }
  }

  // Prüfe ob Trial bereits verwendet wurde
  const { data: profile } = await supabase
    .from("profiles")
    .select("trial_used, subscription_status, trial_started_at")
    .eq("id", userId)
    .maybeSingle();

  const profileTyped = profile as {
    trial_used: boolean | null;
    subscription_status: string | null;
    trial_started_at: string | null;
  } | null;

  if (profileTyped?.trial_used || profileTyped?.subscription_status === "active") {
    return false;
  }

  // Wenn Trial bereits gestartet wurde, nicht erneut starten
  if (profileTyped?.trial_started_at) {
    return false;
  }

  // Starte Trial
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setHours(expiresAt.getHours() + 24); // 24 Stunden Trial

  const { error } = await ((supabase.from("profiles") as any)
    .update({
      trial_started_at: now.toISOString(),
      trial_expires_at: expiresAt.toISOString(),
      subscription_status: "trialing",
    })
    .eq("id", userId));

  return !error;
}

export async function getTrialExpiresAt(
  userId: string
): Promise<Date | null> {
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("trial_expires_at")
    .eq("id", userId)
    .maybeSingle();

  const profileTyped = profile as {
    trial_expires_at: string | null;
  } | null;

  if (!profileTyped?.trial_expires_at) {
    return null;
  }

  return new Date(profileTyped.trial_expires_at);
}
