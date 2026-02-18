"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LeadTable } from "@/components/leads/lead-table";
import { ExportButton } from "@/components/leads/export-button";
import { EventSwitcher } from "@/components/leads/event-switcher";
import { PotentialChart } from "@/components/dashboard/potential-chart";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { LeadRow } from "@/components/leads/types";

type Event = {
  id: string;
  name: string;
  estimated_costs: number | null;
};

type DashboardContentProps = {
  events: Event[];
  allLeads: LeadRow[];
};

export function DashboardContent({ events, allLeads }: DashboardContentProps) {
  const searchParams = useSearchParams();
  const requestedEventId = searchParams.get("eventId");

  const selectedEvent = useMemo(() => {
    if (requestedEventId) {
      return events.find((evt) => evt.id === requestedEventId) ?? events[0] ?? null;
    }
    return events[0] ?? null;
  }, [events, requestedEventId]);

  const leads = useMemo(() => {
    if (!selectedEvent) return [];
    if (!allLeads || !Array.isArray(allLeads)) return [];
    return allLeads.filter((lead) => lead.event_id === selectedEvent.id);
  }, [allLeads, selectedEvent]);

  const leadCount = leads.length;
  const budget = selectedEvent?.estimated_costs ?? 0;
  const cpl = leadCount > 0 ? budget / leadCount : 0;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    }).format(value || 0);

  return (
    <>
      <header className="flex flex-col gap-2">
        <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
              Leads & KPIs
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Hier siehst du strukturierte Leads und deine Kennzahlen.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:gap-4">
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <EventSwitcher
                events={events}
                selectedEventId={selectedEvent?.id ?? null}
              />
              <ExportButton leads={leads} eventName={selectedEvent?.name} />
            </div>
            <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
              <Link href="/dashboard/events">Event anlegen</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>Gesamt-Leads</CardTitle>
            <CardDescription>Alle Leads des Events</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold text-foreground">
              {leadCount}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>Cost per Lead (CPL)</CardTitle>
            <CardDescription>
              Budget / Anzahl Leads · zeigt €0.00 wenn keine Leads vorliegen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold text-foreground">
              {formatCurrency(cpl)}
            </p>
            <p className="text-sm text-muted-foreground">
              Budget: {formatCurrency(budget)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Potential Chart */}
      <PotentialChart leads={leads} />

      <Card className="border border-border/70 shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle>Lead-Tabelle</CardTitle>
          <CardDescription>
            Vorname, Nachname, Firma, Kontakt und Zusammenfassung aus WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-0 sm:p-6">
          <div className="px-4 sm:px-0 pb-4 sm:pb-0">
            <LeadTable leads={leads} eventName={selectedEvent?.name} />
          </div>
        </CardContent>
      </Card>
    </>
  );
}
