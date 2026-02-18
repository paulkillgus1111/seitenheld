import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { SettingsGeneral } from "@/components/settings/settings-general";
import { SettingsSecurity } from "@/components/settings/settings-security";

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_name, subscription_status, plan_type, subscription_current_period_end, stripe_customer_id, seat_count, seats_used")
    .eq("id", user.id)
    .maybeSingle();

  const profileTyped = profile as {
    workspace_name: string | null;
    subscription_status: string | null;
    plan_type: string | null;
    subscription_current_period_end: string | null;
    stripe_customer_id: string | null;
    seat_count: number | null;
    seats_used: number | null;
  } | null;

  return (
    <>
      <header className="flex flex-col gap-2">
        <Badge className="w-fit" variant="secondary">
          Settings
        </Badge>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
            Einstellungen
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Verwalte deine Workspace-Einstellungen und Sicherheit.
          </p>
        </div>
      </header>

      <Card className="border border-border/70 shadow-sm">
        <CardContent className="p-0">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
              <TabsTrigger
                value="general"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
              >
                Allgemein
              </TabsTrigger>
              <TabsTrigger
                value="security"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
              >
                Abonnement
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="m-0 p-6">
              <SettingsGeneral initialWorkspaceName={profileTyped?.workspace_name ?? ""} />
            </TabsContent>

            <TabsContent value="security" className="m-0 p-6">
              <SettingsSecurity
                subscriptionStatus={profileTyped?.subscription_status || null}
                planType={profileTyped?.plan_type || null}
                currentPeriodEnd={
                  profileTyped?.subscription_current_period_end
                    ? new Date(profileTyped.subscription_current_period_end)
                    : null
                }
                hasStripeCustomer={!!profileTyped?.stripe_customer_id}
                seatCount={profileTyped?.seat_count || 1}
                seatsUsed={profileTyped?.seats_used || 0}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </>
  );
}
