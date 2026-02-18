-- Erweitere profiles Tabelle um Trial-Felder
-- Führe diese SQL-Befehle in deiner Supabase SQL-Konsole aus

-- 1. Füge Trial-Spalten hinzu
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS trial_started_at timestamptz,
ADD COLUMN IF NOT EXISTS trial_used boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS trial_expires_at timestamptz;

-- 2. Index für Performance
CREATE INDEX IF NOT EXISTS idx_profiles_trial_expires_at 
ON public.profiles(trial_expires_at) 
WHERE trial_expires_at IS NOT NULL;

-- 3. Kommentare für Dokumentation
COMMENT ON COLUMN public.profiles.trial_started_at IS 'Zeitpunkt, an dem der kostenlose Messetag-Trial gestartet wurde';
COMMENT ON COLUMN public.profiles.trial_used IS 'Wurde der Trial bereits verwendet?';
COMMENT ON COLUMN public.profiles.trial_expires_at IS 'Zeitpunkt, an dem der Trial abläuft (24h nach Start)';

-- 4. Funktion zum Deaktivieren abgelaufener Trials (optional, für Cron-Job)
CREATE OR REPLACE FUNCTION deactivate_expired_trials()
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET 
    subscription_status = 'none',
    trial_used = true
  WHERE 
    trial_expires_at < NOW()
    AND subscription_status = 'trialing'
    AND trial_used = false;
END;
$$ LANGUAGE plpgsql;
