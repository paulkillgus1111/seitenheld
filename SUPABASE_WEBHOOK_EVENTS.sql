-- Tabelle für Stripe Webhook Event-Tracking
-- Verhindert Replay-Attacks durch Tracking bereits verarbeiteter Events
-- Führe diese SQL-Befehle in deiner Supabase SQL-Konsole aus

-- 1. Erstelle Tabelle für Webhook Event-Tracking
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE, -- Stripe Event ID (z.B. "evt_1234567890")
  event_type text NOT NULL, -- Event Type (z.B. "checkout.session.completed")
  processed_at timestamptz DEFAULT NOW(),
  created_at timestamptz DEFAULT NOW(),
  CONSTRAINT stripe_webhook_events_event_id_unique UNIQUE (event_id)
);

-- 2. Index für schnelle Lookups
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_event_id 
ON public.stripe_webhook_events(event_id);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_processed_at 
ON public.stripe_webhook_events(processed_at);

-- 3. RLS Policies (nur Service Role sollte schreiben können)
-- Diese Tabelle wird nur von Server-Side Code verwendet
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- Keine SELECT Policy - nur Service Role kann lesen
-- Keine INSERT Policy - nur Service Role kann einfügen
-- Keine UPDATE Policy - Events werden nicht aktualisiert
-- Keine DELETE Policy - Events werden nicht gelöscht (Audit-Trail)

-- 4. Funktion zum Prüfen ob Event bereits verarbeitet wurde
CREATE OR REPLACE FUNCTION is_webhook_event_processed(p_event_id text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.stripe_webhook_events
    WHERE event_id = p_event_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Funktion zum Markieren eines Events als verarbeitet
CREATE OR REPLACE FUNCTION mark_webhook_event_processed(
  p_event_id text,
  p_event_type text
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.stripe_webhook_events (event_id, event_type, processed_at)
  VALUES (p_event_id, p_event_type, NOW())
  ON CONFLICT (event_id) DO NOTHING; -- Idempotent: Wenn bereits vorhanden, nichts tun
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Cleanup-Funktion für alte Events (optional, für Performance)
-- Löscht Events die älter als 90 Tage sind
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.stripe_webhook_events
  WHERE processed_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Kommentare für Dokumentation
COMMENT ON TABLE public.stripe_webhook_events IS 
  'Tracking-Tabelle für Stripe Webhook Events - verhindert Replay-Attacks';

COMMENT ON COLUMN public.stripe_webhook_events.event_id IS 
  'Stripe Event ID (z.B. "evt_1234567890") - eindeutig';

COMMENT ON COLUMN public.stripe_webhook_events.event_type IS 
  'Stripe Event Type (z.B. "checkout.session.completed")';

COMMENT ON FUNCTION is_webhook_event_processed(text) IS 
  'Prüft ob ein Stripe Event bereits verarbeitet wurde';

COMMENT ON FUNCTION mark_webhook_event_processed(text, text) IS 
  'Markiert ein Stripe Event als verarbeitet (idempotent)';
