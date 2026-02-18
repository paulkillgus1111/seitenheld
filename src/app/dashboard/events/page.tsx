import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EventForm } from "@/components/forms/event-form";
import { EventList } from "@/components/forms/event-list";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function EventsPage() {
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

  return (
    <>
      <header className="flex flex-col gap-2">
        <Badge className="w-fit" variant="secondary">
          Events · Seitenheld
        </Badge>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
            Events verwalten
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Lege neue Messen an und behalte Budget & Zeitraum im Blick.
          </p>
        </div>
      </header>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1.2fr,1fr]">
        <Card className="border border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>Bestehende Events</CardTitle>
            <CardDescription>
              Übersicht deiner geplanten oder laufenden Messen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EventList events={events} />
          </CardContent>
        </Card>

        <Card className="border border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>Neues Event anlegen</CardTitle>
            <CardDescription>
              Name, Zeitraum & Budget für deine nächste Messe.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EventForm />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

