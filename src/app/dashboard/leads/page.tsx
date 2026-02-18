import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { LeadRow } from "@/components/leads/types";
import { LeadsDataTable } from "@/components/leads/leads-data-table";
import { AddLeadForm } from "@/components/leads/add-lead-form";

type LeadsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: events = [] } = await supabase
    .from("events")
    .select("id,name")
    .eq("user_id", user.id)
    .order("start_date", { ascending: false });

  const { data: leads = [] } = await supabase
    .from("leads")
    .select(
      "id, event_id, vorname, nachname, email, firma, telefon, zusammenfassung, potential, jobtitel, structured_data, created_at"
    );

  // Next.js 15: searchParams ist jetzt ein Promise
  const resolvedSearchParams = await searchParams;
  const eventIdParam =
    typeof resolvedSearchParams?.eventId === "string" ? resolvedSearchParams.eventId : null;

  return (
    <>
      <header className="flex flex-col gap-2">
        <Badge className="w-fit" variant="secondary">
          Leads verwalten
        </Badge>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
            Alle Leads im Überblick
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Suche, filtere und inspiziere alle Leads deiner Events.
          </p>
        </div>
      </header>

      <div className="space-y-6">
        <AddLeadForm events={events} />

        <Card className="border border-border/70 shadow-sm overflow-hidden">
          <CardHeader>
            <CardTitle>Lead-Tabelle</CardTitle>
            <CardDescription>
              Suche nach Namen oder Firma und filtere nach Event.{" "}
              <span className="font-medium text-foreground">
                Klicke auf einen Lead in der Tabelle, um ihn zu bearbeiten.
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-0 sm:p-6">
            <div className="px-4 sm:px-0 pb-4 sm:pb-0">
              <LeadsDataTable
                leads={(leads || []) as LeadRow[]}
                events={events}
                initialEventId={eventIdParam}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

