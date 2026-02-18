"use client";

import { useState, useMemo, useEffect } from "react";
import { Download } from "lucide-react";
import { LeadRow } from "./types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ExportLeadsWithFilterProps = {
  leads: LeadRow[];
  events: { id: string; name: string }[];
};

function normalizeValue(value: string) {
  if (!value) return "";
  return value.replace(/"/g, '""');
}

function toCsv(leads: LeadRow[]) {
  const headers = [
    "First Name",
    "Last Name",
    "Company",
    "Email",
    "Phone",
    "Summary",
    "Created At",
  ];

  const escape = (value: string) => `"${normalizeValue(value)}"`;

  const activeLeads = leads.filter((lead) => !lead.deleted_at);
  const rows = activeLeads.map((lead) => {
    // Priorisiere SQL-Spalten, nutze structured_data als Fallback
    const data = (lead.structured_data as Record<string, unknown>) ?? {};
    const pick = (keys: string[]) => {
      for (const key of keys) {
        const v = data[key];
        if (v === undefined || v === null) continue;
        return String(v);
      }
      return "";
    };

    return [
      lead.vorname ?? pick(["first_name", "firstname", "firstName"]),
      lead.nachname ?? pick(["last_name", "lastname", "lastName"]),
      lead.firma ?? pick(["company", "firma", "organisation"]),
      lead.email ?? pick(["email", "mail"]),
      lead.telefon ?? pick(["phone", "telephone", "tel"]),
      lead.zusammenfassung ?? pick(["summary", "notes", "zusammenfassung"]),
      lead.created_at ?? "",
    ]
      .map(escape)
      .join(",");
  });

  return [headers.map(escape).join(","), ...rows].join("\n");
}

export function ExportLeadsWithFilter({
  leads,
  events,
}: ExportLeadsWithFilterProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>("all");

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredLeads = useMemo(() => {
    if (selectedEventId === "all") {
      return leads;
    }
    return leads.filter((lead) => lead.event_id === selectedEventId);
  }, [leads, selectedEventId]);

  const selectedEvent = useMemo(() => {
    if (selectedEventId === "all") return null;
    return events.find((e) => e.id === selectedEventId);
  }, [selectedEventId, events]);

  const filename = useMemo(() => {
    const slug = selectedEvent
      ? selectedEvent.name
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "")
      : "alle-leads";
    return `seitenheld-${slug}.csv`;
  }, [selectedEvent]);

  const handleExport = () => {
    const activeLeads = filteredLeads.filter((lead) => !lead.deleted_at);
    if (!activeLeads.length) return;
    const csv = toCsv(activeLeads);
    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const activeLeadsCount = filteredLeads.filter(
    (lead) => !lead.deleted_at
  ).length;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="event-filter">Event filtern</Label>
        {mounted ? (
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger id="event-filter">
              <SelectValue placeholder="Event auswählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Events</SelectItem>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="h-9 w-full rounded-md border bg-muted animate-pulse" />
        )}
        <p className="text-xs text-muted-foreground">
          {activeLeadsCount} Lead{activeLeadsCount !== 1 ? "s" : ""} werden
          exportiert
          {selectedEvent && ` (${selectedEvent.name})`}
        </p>
      </div>

      <Button
        type="button"
        onClick={handleExport}
        disabled={activeLeadsCount === 0}
        className="bg-blue-600 text-white hover:bg-blue-700"
      >
        <Download className="mr-2 h-4 w-4" />
        Daten exportieren (CSV)
      </Button>
    </div>
  );
}
