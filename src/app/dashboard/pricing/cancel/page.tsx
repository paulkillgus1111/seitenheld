import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { XCircle } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function PricingCancelPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return (
    <>
      <header className="flex flex-col gap-2">
        <Badge className="w-fit" variant="secondary">
          Zahlung abgebrochen
        </Badge>
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold text-foreground">
            Zahlung abgebrochen
          </h1>
        </div>
      </header>

      <Card className="border border-orange-200 bg-orange-50">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <XCircle className="h-16 w-16 text-orange-600" />
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-orange-900">
                Zahlung wurde abgebrochen
              </h2>
              <p className="text-sm text-orange-700">
                Du kannst jederzeit einen Plan auswählen und abonnieren.
              </p>
            </div>
            <div className="flex gap-3 mt-4">
              <Link href="/dashboard/pricing">
                <Button>Zurück zur Preisübersicht</Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline">Zum Dashboard</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
