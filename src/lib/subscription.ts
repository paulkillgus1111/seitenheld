// Client-safe types and utilities (can be used in Client Components)
export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "canceled"
  | "trialing"
  | "incomplete"
  | "none";

export type PlanType = "yearly" | "messe_pass" | "ltd" | "none";

export type UserSubscription = {
  status: SubscriptionStatus;
  planType: PlanType;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
};

// Client-safe utility functions (no server-only imports)
export function isSubscriptionActive(
  status: SubscriptionStatus | string,
  trialStatus?: "active" | "expired" | "used" | "available"
): boolean {
  // Trial zählt als aktiv
  if (trialStatus === "active") {
    return true;
  }
  
  // Wenn Trial verfügbar ist (noch nicht verwendet), erlaube Zugriff
  // Damit können neue User Events/Leads erstellen, was dann den Trial startet
  if (trialStatus === "available") {
    return true;
  }
  
  return status === "active" || status === "trialing";
}

export function getPlanType(planType: PlanType | string): string {
  const planNames: Record<string, string> = {
    yearly: "Jahresabo",
    messe_pass: "Messe-Pass",
    ltd: "LTD",
    none: "Kein Plan",
  };
  return planNames[planType] || "Unbekannt";
}

export function formatSubscriptionStatus(
  status: SubscriptionStatus | string
): string {
  const statusNames: Record<string, string> = {
    active: "Aktiv",
    past_due: "Überfällig",
    canceled: "Gekündigt",
    trialing: "Testphase",
    incomplete: "Unvollständig",
    none: "Kein Abo",
  };
  return statusNames[status] || "Unbekannt";
}
