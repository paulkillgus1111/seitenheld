import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { PricingCard } from "@/components/pricing/pricing-card";
import { getUserSubscriptionStatus } from "@/lib/subscription-server";
import { getPlanType } from "@/lib/subscription";
import Link from "next/link";

export default async function PricingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const subscription = await getUserSubscriptionStatus(user.id);

  return (
    <>
      <header className="flex flex-col gap-2">
        <Badge className="w-fit" variant="secondary">
          Pricing
        </Badge>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
            Wähle deinen Plan
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Wähle den Plan, der am besten zu dir passt.
          </p>
        </div>
      </header>

      {subscription && subscription.status === "active" && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
          <p className="font-medium text-emerald-900">
            Aktueller Plan: {getPlanType(subscription.planType)}
          </p>
          {subscription.currentPeriodEnd && (
            <p className="text-emerald-700">
              Läuft ab am:{" "}
              {subscription.currentPeriodEnd.toLocaleDateString("de-DE")}
            </p>
          )}
          <Link href="/dashboard/settings">
            <Button variant="outline" size="sm" className="mt-2">
              Abo verwalten
            </Button>
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
        <PricingCard
          name="Jahresabo"
          price="9,95€"
          originalPrice="16,58€"
          discount="40%"
          description="Monatlich, jährlich abgerechnet"
          features={[
            "Unbegrenzte Leads",
            "Alle Features",
            "E-Mail Support",
            "9,95€ pro Monat",
            "Jährlich kündbar",
          ]}
          planType="yearly"
          isCurrentPlan={subscription?.planType === "yearly"}
        />
        <PricingCard
          name="Messe-Pass"
          price="39,95€"
          originalPrice="59,95€"
          discount="33%"
          description="Einmalig"
          features={[
            "Für eine Messe",
            "Alle Features",
            "E-Mail Support",
            "Einmalige Zahlung",
          ]}
          planType="messe_pass"
          isCurrentPlan={subscription?.planType === "messe_pass"}
        />
        <PricingCard
          name="LTD"
          price="299,95€"
          description="Einmalig"
          features={[
            "Lifetime Zugang",
            "Alle Features",
            "Priority Support",
            "Einmalige Zahlung",
          ]}
          planType="ltd"
          isCurrentPlan={subscription?.planType === "ltd"}
          isPopular
          limitedOffer="Nur für die ersten 100 Kunden des LTD deals"
        />
      </div>
    </>
  );
}
