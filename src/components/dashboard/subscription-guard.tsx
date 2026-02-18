"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

function isSubscriptionActive(
  status: string,
  trialStatus?: string
): boolean {
  // Trial zählt als aktiv
  if (trialStatus === "active") {
    return true;
  }
  
  // Wenn Trial verfügbar ist (noch nicht gestartet), erlaube Zugriff
  // Damit können neue User Events/Leads erstellen, was dann den Trial startet
  if (trialStatus === "available") {
    return true;
  }
  
  return status === "active" || status === "trialing";
}

type SubscriptionGuardProps = {
  subscriptionStatus: string | null;
  trialStatus?: string;
  children: React.ReactNode;
};

export function SubscriptionGuard({
  subscriptionStatus,
  trialStatus,
  children,
}: SubscriptionGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // Pricing-Seite ist immer erreichbar
    const isPricingPage = pathname?.includes("/dashboard/pricing");
    
    if (isPricingPage) {
      return; // Keine Blockierung auf Pricing-Seite
    }
    
    const status = (subscriptionStatus ||
      "none") as
      | "active"
      | "past_due"
      | "canceled"
      | "trialing"
      | "incomplete"
      | "none";

    // ✅ KORRIGIERT: Blockiere wenn:
    // - Trial abgelaufen (expired) UND keine aktive Subscription
    // - Trial verwendet (used) UND keine aktive Subscription
    // - Subscription nicht aktiv UND kein aktiver Trial UND kein verfügbarer Trial
    const hasAccess = isSubscriptionActive(status, trialStatus);
    
    if (!hasAccess) {
      startTransition(() => {
        router.push("/dashboard/pricing");
      });
    }
  }, [pathname, subscriptionStatus, trialStatus, router]);

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Wird geladen...</p>
      </div>
    );
  }

  return <>{children}</>;
}
