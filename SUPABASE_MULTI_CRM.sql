-- Multi-CRM Integration: Generisches Schema für alle CRMs
-- Führe diese SQL-Befehle in deiner Supabase SQL-Konsole aus
-- WICHTIG: Führe zuerst SUPABASE_SALESFORCE_OAUTH2.sql aus, falls noch nicht geschehen

-- 1. Füge generische CRM-Felder hinzu
ALTER TABLE public.integrations
ADD COLUMN IF NOT EXISTS crm_type text, -- 'salesforce', 'pipedrive', 'hubspot', 'zoho', 'dynamics365'
ADD COLUMN IF NOT EXISTS crm_access_token text,
ADD COLUMN IF NOT EXISTS crm_refresh_token text,
ADD COLUMN IF NOT EXISTS crm_token_expires_at timestamptz,
ADD COLUMN IF NOT EXISTS crm_instance_url text, -- API Base URL (z.B. https://api.salesforce.com, https://api.pipedrive.com)
ADD COLUMN IF NOT EXISTS crm_org_id text, -- Organization/Account ID
ADD COLUMN IF NOT EXISTS crm_user_id text, -- User ID im CRM
ADD COLUMN IF NOT EXISTS crm_connection_type text DEFAULT 'oauth2'; -- 'oauth2' oder 'client_credentials'

-- 2. Migriere bestehende Salesforce-Daten zu generischen Feldern
-- (Nur wenn Salesforce-Felder bereits existieren)
DO $$
BEGIN
  -- Migriere Salesforce-Daten zu generischen Feldern
  UPDATE public.integrations
  SET
    crm_type = 'salesforce',
    crm_access_token = salesforce_access_token,
    crm_refresh_token = salesforce_refresh_token,
    crm_token_expires_at = salesforce_token_expires_at,
    crm_instance_url = salesforce_instance_url,
    crm_org_id = salesforce_org_id,
    crm_user_id = salesforce_user_id,
    crm_connection_type = COALESCE(salesforce_connection_type, 'oauth2')
  WHERE 
    salesforce_access_token IS NOT NULL
    AND crm_type IS NULL; -- Nur migrieren wenn noch nicht migriert
END $$;

-- 3. Index für Performance
CREATE INDEX IF NOT EXISTS idx_integrations_crm_type 
ON public.integrations(crm_type) 
WHERE crm_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_integrations_crm_user_id 
ON public.integrations(crm_user_id) 
WHERE crm_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_integrations_crm_connection_type 
ON public.integrations(crm_connection_type) 
WHERE crm_connection_type IS NOT NULL;

-- 4. Constraint für crm_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_crm_type'
  ) THEN
    ALTER TABLE public.integrations
    ADD CONSTRAINT check_crm_type 
    CHECK (crm_type IN ('salesforce', 'pipedrive', 'hubspot', 'zoho', 'dynamics365'));
  END IF;
END $$;

-- 5. Constraint für crm_connection_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_crm_connection_type'
  ) THEN
    ALTER TABLE public.integrations
    ADD CONSTRAINT check_crm_connection_type 
    CHECK (crm_connection_type IN ('oauth2', 'client_credentials'));
  END IF;
END $$;

-- 6. Kommentare für Dokumentation
COMMENT ON COLUMN public.integrations.crm_type IS 'CRM-Typ: salesforce, pipedrive, hubspot, zoho, dynamics365';
COMMENT ON COLUMN public.integrations.crm_access_token IS 'OAuth2 Access Token (verschlüsselt speichern in Production!)';
COMMENT ON COLUMN public.integrations.crm_refresh_token IS 'OAuth2 Refresh Token (verschlüsselt speichern in Production!)';
COMMENT ON COLUMN public.integrations.crm_token_expires_at IS 'Ablaufdatum des Access Tokens';
COMMENT ON COLUMN public.integrations.crm_instance_url IS 'API Base URL des CRMs';
COMMENT ON COLUMN public.integrations.crm_org_id IS 'Organization/Account ID im CRM';
COMMENT ON COLUMN public.integrations.crm_user_id IS 'User ID im CRM';
COMMENT ON COLUMN public.integrations.crm_connection_type IS 'Verbindungstyp: oauth2 oder client_credentials';

-- 7. Erstelle View für einfachere Abfragen (optional)
CREATE OR REPLACE VIEW public.crm_integrations AS
SELECT 
  user_id,
  crm_type,
  crm_instance_url,
  crm_org_id,
  crm_user_id,
  crm_connection_type,
  salesforce_field_mapping as field_mapping,
  CASE 
    WHEN crm_access_token IS NOT NULL AND crm_instance_url IS NOT NULL THEN true
    ELSE false
  END as is_connected,
  crm_token_expires_at
FROM public.integrations
WHERE crm_type IS NOT NULL;

COMMENT ON VIEW public.crm_integrations IS 'View für alle CRM-Integrationen eines Users';
