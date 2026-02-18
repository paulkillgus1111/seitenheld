// Client-safe types and utilities (can be used in Client Components)
export type TrialStatus = "available" | "active" | "expired" | "used";

// Client-safe utility functions (no server-only imports)
export function isTrialActive(trialStatus: TrialStatus): boolean {
  return trialStatus === "active";
}

export function formatTrialStatus(trialStatus: TrialStatus): string {
  const statusNames: Record<TrialStatus, string> = {
    available: "Verfügbar",
    active: "Aktiv",
    expired: "Abgelaufen",
    used: "Verwendet",
  };
  return statusNames[trialStatus] || "Unbekannt";
}
