import type { LeadRow } from "./types";

export function getFieldValue(data: unknown, keys: string[]): string {
  if (!data || typeof data !== "object") return "";
  for (const key of keys) {
    const value = (data as Record<string, unknown>)[key];
    if (value === undefined || value === null) continue;
    if (typeof value === "string" || typeof value === "number") {
      return String(value);
    }
  }
  return "";
}

export function normalizeLead(lead: LeadRow) {
  // Priorisiere SQL-Spalten, nutze structured_data als Fallback
  const data = (lead.structured_data as Record<string, unknown>) ?? {};
  
  const firstName =
    lead.vorname ??
    getFieldValue(data, ["first_name", "firstname", "firstName"]);
  const lastName =
    lead.nachname ??
    getFieldValue(data, ["last_name", "lastname", "lastName"]);
  const company =
    lead.firma ??
    getFieldValue(data, ["company", "firma", "organisation"]);
  const email = lead.email ?? getFieldValue(data, ["email", "mail"]);
  const phone =
    lead.telefon ?? getFieldValue(data, ["phone", "telephone", "tel"]);
  const summary =
    lead.zusammenfassung ??
    getFieldValue(data, ["summary", "notes", "zusammenfassung"]);

  const potential = lead.potential ?? "—";
  const jobTitle = lead.jobtitel || "—";

  return {
    firstName: firstName || "—",
    lastName: lastName || "—",
    company: company || "—",
    email: email || "—",
    phone: phone || "—",
    summary: summary || "—",
    potential: potential,
    jobTitle: jobTitle,
    createdAt: lead.created_at
      ? new Date(lead.created_at).toLocaleString("de-DE", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—",
  };
}

