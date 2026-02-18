export type LeadRow = {
  id: string;
  event_id?: string;
  vorname?: string | null;
  nachname?: string | null;
  email?: string | null;
  firma?: string | null;
  telefon?: string | null;
  zusammenfassung?: string | null;
  potential?: "Hoch" | "Medium" | "Niedrig" | null;
  jobtitel?: string | null;
  structured_data?: unknown;
  created_at: string | null;
  deleted_at?: string | null;
  followup_mail_sent_at?: string | null;
};
