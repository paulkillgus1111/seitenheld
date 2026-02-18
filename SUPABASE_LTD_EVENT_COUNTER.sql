-- Event-Zähler für LTD-User (50-Messen-Limit)
-- Führe diese SQL-Befehle in deiner Supabase SQL-Konsole aus

-- 1. Erweitere profiles Tabelle um Event-Zähler für LTD
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS ltd_events_used integer DEFAULT 0;

-- 2. Index für Performance
CREATE INDEX IF NOT EXISTS idx_profiles_ltd_events_used 
ON public.profiles(ltd_events_used) 
WHERE plan_type = 'ltd';

-- 3. Constraint: ltd_events_used darf nicht negativ sein
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_ltd_events_used_not_negative'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT check_ltd_events_used_not_negative 
    CHECK (ltd_events_used >= 0);
  END IF;
END $$;

-- 4. Constraint: ltd_events_used darf maximal 50 sein (nur für LTD-User)
-- Hinweis: Dies wird in der Anwendungslogik geprüft, da CHECK Constraints
-- keine bedingten Constraints unterstützen (nur für plan_type = 'ltd')

-- 5. Funktion zum atomaren Inkrementieren des Event-Zählers
-- Prüft ob Limit erreicht ist und inkrementiert nur wenn noch Platz vorhanden
CREATE OR REPLACE FUNCTION increment_ltd_event_count(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_plan_type text;
  v_events_used integer;
  v_max_events integer := 50;
BEGIN
  -- Hole Plan-Type und aktuelle Event-Anzahl
  SELECT plan_type, ltd_events_used
  INTO v_plan_type, v_events_used
  FROM public.profiles
  WHERE id = p_user_id;

  -- Wenn kein Profil gefunden, Fehler
  IF v_plan_type IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Nur für LTD-User prüfen
  IF v_plan_type != 'ltd' THEN
    -- Nicht-LTD-User können unbegrenzt Events erstellen
    RETURN true;
  END IF;

  -- Prüfe ob Limit erreicht ist
  IF v_events_used >= v_max_events THEN
    RETURN false; -- Limit erreicht
  END IF;

  -- Atomares Inkrementieren (mit Row-Level Lock)
  UPDATE public.profiles
  SET ltd_events_used = ltd_events_used + 1
  WHERE id = p_user_id
    AND plan_type = 'ltd'
    AND ltd_events_used < v_max_events;

  -- Prüfe ob Update erfolgreich war
  IF FOUND THEN
    RETURN true; -- Erfolgreich inkrementiert
  ELSE
    RETURN false; -- Limit erreicht oder Race Condition
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Funktion zum Prüfen ob noch Events verfügbar sind (ohne Inkrementierung)
CREATE OR REPLACE FUNCTION check_ltd_event_limit(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_plan_type text;
  v_events_used integer;
  v_max_events integer := 50;
BEGIN
  SELECT plan_type, ltd_events_used
  INTO v_plan_type, v_events_used
  FROM public.profiles
  WHERE id = p_user_id;

  -- Wenn kein Profil gefunden, Fehler
  IF v_plan_type IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Nur für LTD-User prüfen
  IF v_plan_type != 'ltd' THEN
    RETURN true; -- Nicht-LTD-User haben kein Limit
  END IF;

  -- Prüfe ob noch Platz vorhanden ist
  RETURN v_events_used < v_max_events;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Funktion zum Dekrementieren (falls Event gelöscht wird)
CREATE OR REPLACE FUNCTION decrement_ltd_event_count(p_user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET ltd_events_used = GREATEST(0, ltd_events_used - 1)
  WHERE id = p_user_id
    AND plan_type = 'ltd'
    AND ltd_events_used > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Trigger: Automatisches Inkrementieren beim Event-Erstellen (nur für LTD)
CREATE OR REPLACE FUNCTION trigger_increment_ltd_event_count()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_type text;
BEGIN
  -- Hole Plan-Type des Users
  SELECT plan_type INTO v_plan_type
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- Nur für LTD-User inkrementieren
  IF v_plan_type = 'ltd' THEN
    -- Prüfe ob Limit erreicht ist
    IF NOT check_ltd_event_limit(NEW.user_id) THEN
      RAISE EXCEPTION 'LTD Event limit reached (50 events maximum)';
    END IF;

    -- Inkrementiere Zähler
    PERFORM increment_ltd_event_count(NEW.user_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Trigger: Automatisches Dekrementieren beim Event-Löschen (nur für LTD)
CREATE OR REPLACE FUNCTION trigger_decrement_ltd_event_count()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_type text;
BEGIN
  -- Hole Plan-Type des Users
  SELECT plan_type INTO v_plan_type
  FROM public.profiles
  WHERE id = OLD.user_id;

  -- Nur für LTD-User dekrementieren
  IF v_plan_type = 'ltd' THEN
    PERFORM decrement_ltd_event_count(OLD.user_id);
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Erstelle Trigger (AFTER INSERT)
DROP TRIGGER IF EXISTS trigger_increment_ltd_event_count ON public.events;
CREATE TRIGGER trigger_increment_ltd_event_count
  AFTER INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION trigger_increment_ltd_event_count();

-- 11. Erstelle Trigger (AFTER DELETE)
DROP TRIGGER IF EXISTS trigger_decrement_ltd_event_count ON public.events;
CREATE TRIGGER trigger_decrement_ltd_event_count
  AFTER DELETE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION trigger_decrement_ltd_event_count();

-- 12. Kommentare für Dokumentation
COMMENT ON COLUMN public.profiles.ltd_events_used IS 
  'Anzahl der erstellten Events für LTD-User (max. 50)';

COMMENT ON FUNCTION increment_ltd_event_count(uuid) IS 
  'Atomares Inkrementieren des Event-Zählers für LTD-User (max. 50)';

COMMENT ON FUNCTION check_ltd_event_limit(uuid) IS 
  'Prüft ob noch Events für LTD-User verfügbar sind';

COMMENT ON FUNCTION decrement_ltd_event_count(uuid) IS 
  'Dekrementiert den Event-Zähler wenn ein Event gelöscht wird';
