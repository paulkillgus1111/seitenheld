import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { SubscriptionGuard } from "@/components/dashboard/subscription-guard";
import { getTrialStatus } from "@/lib/trial-server";
import { isSubscriptionActive } from "@/lib/subscription";

export const dynamic = "force-dynamic";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Lade Subscription-Status und Trial-Status für Guard
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status")
    .eq("id", user.id)
    .maybeSingle();

  const profileTyped = profile as {
    subscription_status: string | null;
  } | null;

  const status = (profileTyped?.subscription_status ||
    "none") as "active" | "past_due" | "canceled" | "trialing" | "incomplete" | "none";

  // Prüfe Trial-Status
  const trialStatus = await getTrialStatus(user.id);
  const hasAccess = isSubscriptionActive(status, trialStatus);

  return (
    <SubscriptionGuard
      subscriptionStatus={profileTyped?.subscription_status || null}
      trialStatus={trialStatus}
    >
      <div className="h-screen overflow-hidden bg-neutral-50">
        <MobileHeader />
        <div className="mx-auto flex h-[calc(100vh-4rem)] w-full max-w-6xl overflow-hidden md:h-screen">
          <div className="hidden shrink-0 md:block md:w-60 lg:w-64">
            <div className="h-full border-r bg-white/80 backdrop-blur-sm">
              <Sidebar hideHeader={false} />
            </div>
          </div>
          <div className="flex-1 min-w-0 overflow-y-auto bg-gradient-to-b from-white via-white to-neutral-50 md:border-l">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 pb-12 pt-4 sm:gap-6 sm:px-6 sm:pt-6 lg:gap-8 lg:px-8 md:pt-8">
              {children}
            </div>
          </div>
        </div>
      </div>
    </SubscriptionGuard>
  );
}

