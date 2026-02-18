-- Trigger für automatischen Trial-Start beim ersten Lead
-- Führe diese SQL-Befehle in deiner Supabase SQL-Konsole aus
-- Funktioniert auch für Leads, die direkt von n8n in Supabase eingefügt werden

-- 1. Funktion zum Starten des Trials beim ersten Lead
CREATE OR REPLACE FUNCTION start_trial_on_first_lead()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
  v_existing_lead_count integer;
  v_profile_record RECORD;
BEGIN
  -- Hole user_id über event_id
  SELECT user_id INTO v_user_id
  FROM public.events
  WHERE id = NEW.event_id;

  -- Wenn kein Event gefunden, abbrechen
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Prüfe ob bereits Leads für diesen User existieren (außer dem gerade eingefügten)
  SELECT COUNT(*) INTO v_existing_lead_count
  FROM public.leads l
  INNER JOIN public.events e ON l.event_id = e.id
  WHERE e.user_id = v_user_id
    AND l.id != NEW.id
    AND (l.deleted_at IS NULL OR l.deleted_at > NOW());

  -- Wenn bereits Leads existieren, kein Trial starten
  IF v_existing_lead_count > 0 THEN
    RETURN NEW;
  END IF;

  -- Hole Profile-Daten
  SELECT 
    trial_used,
    subscription_status,
    trial_started_at
  INTO v_profile_record
  FROM public.profiles
  WHERE id = v_user_id;

  -- Wenn kein Profile existiert, abbrechen
  IF v_profile_record IS NULL THEN
    RETURN NEW;
  END IF;

  -- Prüfe ob Trial bereits verwendet wurde oder bereits aktiv ist
  IF v_profile_record.trial_used = true 
     OR v_profile_record.subscription_status = 'active'
     OR v_profile_record.trial_started_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Starte Trial: Setze trial_started_at, trial_expires_at und subscription_status
  UPDATE public.profiles
  SET 
    trial_started_at = NOW(),
    trial_expires_at = NOW() + INTERVAL '24 hours',
    subscription_status = 'trialing'
  WHERE id = v_user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger erstellen (AFTER INSERT, damit der Lead bereits in der DB ist)
DROP TRIGGER IF EXISTS trigger_start_trial_on_first_lead ON public.leads;

CREATE TRIGGER trigger_start_trial_on_first_lead
  AFTER INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION start_trial_on_first_lead();

-- 3. Kommentar für Dokumentation
COMMENT ON FUNCTION start_trial_on_first_lead() IS 
  'Startet automatisch einen 24h-Trial beim ersten Lead eines Users (funktioniert auch für Leads von n8n)';

-- 4. Optional: Test-Query zum Prüfen des Triggers
-- Führe diese Query aus, um zu sehen, ob der Trigger korrekt funktioniert:
-- SELECT 
--   p.id as user_id,
--   p.trial_started_at,
--   p.trial_expires_at,
--   p.subscription_status,
--   COUNT(l.id) as lead_count
-- FROM public.profiles p
-- LEFT JOIN public.events e ON e.user_id = p.id
-- LEFT JOIN public.leads l ON l.event_id = e.id AND (l.deleted_at IS NULL)
-- WHERE p.trial_started_at IS NOT NULL
-- GROUP BY p.id, p.trial_started_at, p.trial_expires_at, p.subscription_status;
