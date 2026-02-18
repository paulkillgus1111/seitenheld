"use client";

import { useMemo } from "react";
import { Download } from "lucide-react";
import { LeadRow } from "./types";
import { Button } from "@/components/ui/button";

type ExportButtonProps = {
  leads: LeadRow[];
  eventName?: string | null;
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

export function ExportButton({ leads, eventName }: ExportButtonProps) {
  const filename = useMemo(() => {
    const slug =
      eventName
        ?.toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "") || "leads";
    return `seitenheld-${slug}.csv`;
  }, [eventName]);

  const handleExport = () => {
    const activeLeads = leads.filter((lead) => !lead.deleted_at);
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

  return (
    <Button
      type="button"
      onClick={handleExport}
      disabled={!leads.filter((lead) => !lead.deleted_at).length}
      className="bg-blue-600 text-white hover:bg-blue-700"
    >
      <Download className="mr-2 h-4 w-4" />
      Daten exportieren (CSV)
    </Button>
  );
}
