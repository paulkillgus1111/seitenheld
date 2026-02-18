import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { LeadRow } from "@/components/leads/types";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { TrialBanner } from "@/components/dashboard/trial-banner";
import { PhoneVerificationBanner } from "@/components/dashboard/phone-verification-banner";
import { getTrialStatus, getTrialExpiresAt } from "@/lib/trial-server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: events = [] } = await supabase
    .from("events")
    .select("id,name,start_date,end_date,estimated_costs")
    .eq("user_id", user.id)
    .order("start_date", { ascending: false });

  // Lade alle Leads für alle Events (wird clientseitig gefiltert)
  const { data: allLeads = [] } = await supabase
    .from("leads")
    .select(
      "id, event_id, vorname, nachname, email, firma, telefon, zusammenfassung, potential, jobtitel, structured_data, created_at"
    )
    .order("created_at", { ascending: false });

  // Prüfe Trial-Status für Banner
  const trialStatus = await getTrialStatus(user.id);
  const trialExpiresAt = trialStatus === "active" ? await getTrialExpiresAt(user.id) : null;

  // Prüfe ob verifizierte Telefonnummer vorhanden ist
  const { data: verifiedPhoneNumbers } = await supabase
    .from("phone_numbers")
    .select("id")
    .eq("user_id", user.id)
    .eq("verified", true)
    .limit(1);

  const hasVerifiedPhone = verifiedPhoneNumbers && verifiedPhoneNumbers.length > 0;

  return (
    <>
      <header className="flex flex-col gap-2">
        <Badge className="w-fit" variant="secondary">
          Dashboard · Seitenheld
        </Badge>
      </header>
      {trialExpiresAt && (
        <TrialBanner expiresAt={trialExpiresAt.toISOString()} />
      )}
      {!hasVerifiedPhone && <PhoneVerificationBanner />}
      <DashboardContent
        events={events}
        allLeads={allLeads as LeadRow[]}
      />
    </>
  );
}
