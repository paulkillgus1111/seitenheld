-- Automatische Deaktivierung abgelaufener Trials via pg_cron (Backup)
-- Führe diese SQL-Befehle in deiner Supabase SQL-Konsole aus
-- 
-- WICHTIG: Falls pg_cron nicht verfügbar ist, funktioniert das Lazy Update in trial-server.ts trotzdem.
-- Das Lazy Update aktualisiert subscription_status automatisch, wenn getTrialStatus() aufgerufen wird.

-- 1. Erstelle/Update die Funktion (falls noch nicht vorhanden)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Versuche Cron-Job zu erstellen (nur wenn pg_cron verfügbar ist)
-- Falls pg_cron nicht verfügbar ist, wird dieser Teil fehlschlagen - das ist OK
DO $$
BEGIN
  -- Entferne alten Job falls vorhanden
  PERFORM cron.unschedule('deactivate-expired-trials');
EXCEPTION
  WHEN OTHERS THEN
    -- Ignoriere Fehler wenn pg_cron nicht verfügbar ist
    NULL;
END $$;

DO $$
BEGIN
  -- Erstelle neuen Cron-Job, der jede Stunde läuft
  PERFORM cron.schedule(
    'deactivate-expired-trials',  -- Job-Name
    '0 * * * *',                  -- Jede Stunde (minute 0)
    $$SELECT deactivate_expired_trials()$$
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Ignoriere Fehler wenn pg_cron nicht verfügbar ist
    -- Lazy Update in trial-server.ts funktioniert trotzdem
    RAISE NOTICE 'pg_cron nicht verfügbar - Lazy Update wird verwendet';
END $$;

-- 3. Kommentar für Dokumentation
COMMENT ON FUNCTION deactivate_expired_trials() IS 
  'Deaktiviert automatisch abgelaufene Trials. Wird von pg_cron stündlich aufgerufen (falls verfügbar). Lazy Update in trial-server.ts funktioniert als Backup.';

-- 4. Optional: Prüfe ob Job erstellt wurde
-- SELECT * FROM cron.job WHERE jobname = 'deactivate-expired-trials';
