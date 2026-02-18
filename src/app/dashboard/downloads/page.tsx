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
import { ExportLeadsWithFilter } from "@/components/leads/export-leads-with-filter";


export default async function DownloadsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: leads = [] } = await supabase
    .from("leads")
    .select(
      "id, event_id, vorname, nachname, email, firma, telefon, zusammenfassung, structured_data, created_at, deleted_at"
    )
    .is("deleted_at", null);

  const { data: events = [] } = await supabase
    .from("events")
    .select("id, name")
    .eq("user_id", user.id)
    .order("start_date", { ascending: false });

  return (
    <>
      <header className="flex flex-col gap-2">
        <Badge className="w-fit" variant="secondary">
          Downloads
        </Badge>
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold text-foreground">
            Datenexport & Vorlagen
          </h1>
          <p className="text-muted-foreground">
            Exportiere alle Leads als CSV und lade Beispielvorlagen herunter.
          </p>
        </div>
      </header>

      <Card className="border border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>Leads exportieren</CardTitle>
          <CardDescription>
            Exportiere Leads als CSV-Datei. Filtere nach Event oder exportiere alle Leads.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExportLeadsWithFilter
            leads={leads as LeadRow[]}
            events={events}
          />
        </CardContent>
      </Card>
    </>
  );
}

