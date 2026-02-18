import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type SuccessPageProps = {
  searchParams: Promise<{ session_id?: string }>;
};

export default async function PricingSuccessPage({
  searchParams,
}: SuccessPageProps) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Lade aktualisierten Subscription-Status
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_type, subscription_status")
    .eq("id", user.id)
    .maybeSingle();

  const profileTyped = profile as {
    plan_type: string | null;
    subscription_status: string | null;
  } | null;

  return (
    <>
      <header className="flex flex-col gap-2">
        <Badge className="w-fit" variant="secondary">
          Zahlung erfolgreich
        </Badge>
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold text-foreground">
            Vielen Dank für dein Abo!
          </h1>
        </div>
      </header>

      <Card className="border border-emerald-200 bg-emerald-50">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <CheckCircle2 className="h-16 w-16 text-emerald-600" />
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-emerald-900">
                Zahlung erfolgreich abgeschlossen
              </h2>
              <p className="text-sm text-emerald-700">
                Dein Abo ist jetzt aktiv. Du kannst alle Features nutzen.
              </p>
              {profileTyped?.plan_type && (
                <p className="text-sm text-emerald-700">
                  Plan: {profileTyped.plan_type}
                </p>
              )}
            </div>
            <div className="flex gap-3 mt-4">
              <Link href="/dashboard">
                <Button>Zum Dashboard</Button>
              </Link>
              <Link href="/dashboard/settings">
                <Button variant="outline">Abo verwalten</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
