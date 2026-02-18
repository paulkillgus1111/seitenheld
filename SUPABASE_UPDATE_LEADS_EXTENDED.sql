-- Erweiterte Updates für die leads Tabelle
-- Führe diese SQL-Befehle in deiner Supabase SQL-Konsole aus

-- 1. Neue Spalten hinzufügen
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
ADD COLUMN IF NOT EXISTS followup_mail_sent_at timestamptz;

-- 2. sent_emails Tabelle erstellen
CREATE TABLE IF NOT EXISTS public.sent_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  subject text NOT NULL,
  body text NOT NULL,
  sent_at timestamptz DEFAULT now()
);

-- 3. RLS Policies für sent_emails
ALTER TABLE public.sent_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sent emails"
  ON public.sent_emails
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sent emails"
  ON public.sent_emails
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 4. integrations Tabelle erweitern (falls noch nicht vorhanden)
ALTER TABLE public.integrations
ADD COLUMN IF NOT EXISTS n8n_webhook_url text;

-- 5. mail_templates Tabelle erweitern (falls noch nicht vorhanden)
ALTER TABLE public.mail_templates
ADD COLUMN IF NOT EXISTS subject text DEFAULT '';

-- 6. Index für deleted_at für bessere Performance
CREATE INDEX IF NOT EXISTS idx_leads_deleted_at ON public.leads(deleted_at) WHERE deleted_at IS NULL;

-- 7. Index für followup_mail_sent_at
CREATE INDEX IF NOT EXISTS idx_leads_followup_mail_sent_at ON public.leads(followup_mail_sent_at);
