"use client";

import { LeadRow } from "./types";
import { normalizeLead } from "./lead-utils";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type LeadTableProps = {
  leads: LeadRow[];
  eventName?: string | null;
};

export function LeadTable({ leads, eventName }: LeadTableProps) {
  const hasLeads = leads.length > 0;

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <div className="inline-block min-w-full align-middle px-4 sm:px-0">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-nowrap">Vorname</TableHead>
            <TableHead className="whitespace-nowrap">Nachname</TableHead>
            <TableHead className="whitespace-nowrap">Firma</TableHead>
            <TableHead className="whitespace-nowrap">Jobtitel</TableHead>
            <TableHead className="whitespace-nowrap">E-Mail</TableHead>
            <TableHead className="whitespace-nowrap">Telefon</TableHead>
            <TableHead className="whitespace-nowrap">Potential</TableHead>
            <TableHead className="whitespace-nowrap">Zusammenfassung</TableHead>
            <TableHead className="whitespace-nowrap">Erfasst</TableHead>
          </TableRow>
        </TableHeader>
      <TableBody>
        {hasLeads ? (
          leads.map((lead) => {
            const normalized = normalizeLead(lead);
            return (
              <TableRow key={lead.id}>
                <TableCell>{normalized.firstName}</TableCell>
                <TableCell>{normalized.lastName}</TableCell>
                <TableCell>{normalized.company}</TableCell>
                <TableCell>{normalized.jobTitle}</TableCell>
                <TableCell>{normalized.email}</TableCell>
                <TableCell>{normalized.phone}</TableCell>
                <TableCell>
                  {normalized.potential && normalized.potential !== "—" ? (
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      normalized.potential === "Hoch" ? "bg-green-100 text-green-800" :
                      normalized.potential === "Medium" ? "bg-yellow-100 text-yellow-800" :
                      normalized.potential === "Niedrig" ? "bg-red-100 text-red-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {normalized.potential}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="max-w-[360px] whitespace-normal">
                  {normalized.summary}
                </TableCell>
                <TableCell>{normalized.createdAt}</TableCell>
              </TableRow>
            );
          })
        ) : (
          <TableRow>
            <TableCell
              colSpan={9}
              className="py-8 text-center text-sm text-muted-foreground"
            >
              Noch keine Leads für {eventName ? `"${eventName}"` : "dieses Event"}.
              Sobald WhatsApp-Nachrichten eingehen, erscheinen sie hier.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
      <TableCaption className="text-left">
        Hier siehst du die extrahierten Daten aus WhatsApp.
      </TableCaption>
    </Table>
      </div>
    </div>
  );
}
