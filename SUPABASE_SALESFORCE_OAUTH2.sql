-- Erweitere integrations Tabelle für OAuth2 Integration
-- Führe diese SQL-Befehle in deiner Supabase SQL-Konsole aus

-- OAuth2 Felder hinzufügen
ALTER TABLE public.integrations
ADD COLUMN IF NOT EXISTS salesforce_instance_url text,
ADD COLUMN IF NOT EXISTS salesforce_access_token text,
ADD COLUMN IF NOT EXISTS salesforce_refresh_token text,
ADD COLUMN IF NOT EXISTS salesforce_token_expires_at timestamptz,
ADD COLUMN IF NOT EXISTS salesforce_org_id text,
ADD COLUMN IF NOT EXISTS salesforce_user_id text,
ADD COLUMN IF NOT EXISTS salesforce_connection_type text DEFAULT 'oauth2'; -- 'oauth2' oder 'client_credentials'

-- Index für Performance
CREATE INDEX IF NOT EXISTS idx_integrations_salesforce_user_id 
ON public.integrations(salesforce_user_id) 
WHERE salesforce_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_integrations_connection_type 
ON public.integrations(salesforce_connection_type) 
WHERE salesforce_connection_type IS NOT NULL;

-- Constraint für connection_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_salesforce_connection_type'
  ) THEN
    ALTER TABLE public.integrations
    ADD CONSTRAINT check_salesforce_connection_type 
    CHECK (salesforce_connection_type IN ('oauth2', 'client_credentials'));
  END IF;
END $$;

-- Kommentare für Dokumentation
COMMENT ON COLUMN public.integrations.salesforce_instance_url IS 'Salesforce Instance URL (z.B. https://yourinstance.salesforce.com)';
COMMENT ON COLUMN public.integrations.salesforce_access_token IS 'OAuth2 Access Token (verschlüsselt speichern in Production!)';
COMMENT ON COLUMN public.integrations.salesforce_refresh_token IS 'OAuth2 Refresh Token (verschlüsselt speichern in Production!)';
COMMENT ON COLUMN public.integrations.salesforce_token_expires_at IS 'Ablaufdatum des Access Tokens';
COMMENT ON COLUMN public.integrations.salesforce_org_id IS 'Salesforce Organization ID';
COMMENT ON COLUMN public.integrations.salesforce_user_id IS 'Salesforce User ID des verbundenen Users';
COMMENT ON COLUMN public.integrations.salesforce_connection_type IS 'Verbindungstyp: oauth2 oder client_credentials';
