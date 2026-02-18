-- Team-Funktion: Seats/Telefonnummern
-- Führe diese SQL-Befehle in deiner Supabase SQL-Konsole aus

-- 1. Erstelle phone_numbers Tabelle
CREATE TABLE IF NOT EXISTS public.phone_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  assigned_to_event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT NOW(),
  CONSTRAINT phone_numbers_phone_number_unique UNIQUE (phone_number)
);

-- 2. Index für Performance
CREATE INDEX IF NOT EXISTS idx_phone_numbers_user_id 
ON public.phone_numbers(user_id);

CREATE INDEX IF NOT EXISTS idx_phone_numbers_assigned_to_event_id 
ON public.phone_numbers(assigned_to_event_id) 
WHERE assigned_to_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_phone_numbers_is_active 
ON public.phone_numbers(is_active) 
WHERE is_active = true;

-- 3. Erweitere profiles Tabelle um Seat-Felder
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS seat_count integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS seats_used integer DEFAULT 0;

-- 4. Index für seat_count
CREATE INDEX IF NOT EXISTS idx_profiles_seat_count 
ON public.profiles(seat_count) 
WHERE seat_count > 1;

-- 5. Erweitere events Tabelle um phone_number_id
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS phone_number_id uuid REFERENCES public.phone_numbers(id) ON DELETE RESTRICT;

-- 5.1 Setze phone_number_id auf NOT NULL (nach Migration bestehender Daten)
-- WICHTIG: Führe dies NUR aus, wenn alle Events bereits eine phone_number_id haben!
-- DO $$
-- BEGIN
--   -- Prüfe ob alle Events eine phone_number_id haben
--   IF NOT EXISTS (
--     SELECT 1 FROM public.events WHERE phone_number_id IS NULL
--   ) THEN
--     ALTER TABLE public.events
--     ALTER COLUMN phone_number_id SET NOT NULL;
--   END IF;
-- END $$;

-- 6. Index für phone_number_id
CREATE INDEX IF NOT EXISTS idx_events_phone_number_id 
ON public.events(phone_number_id) 
WHERE phone_number_id IS NOT NULL;

-- 7. Kommentare für Dokumentation
COMMENT ON TABLE public.phone_numbers IS 'Telefonnummern/Seats pro User - ermöglicht mehrere Seats pro Account';
COMMENT ON COLUMN public.phone_numbers.user_id IS 'User-ID (bleibt für alle Seats eines Users gleich)';
COMMENT ON COLUMN public.phone_numbers.phone_number IS 'Telefonnummer (eindeutig, für n8n-Integration)';
COMMENT ON COLUMN public.phone_numbers.assigned_to_event_id IS 'Optional: Standard-Event für diese Telefonnummer';
COMMENT ON COLUMN public.profiles.seat_count IS 'Anzahl der gekauften Seats';
COMMENT ON COLUMN public.profiles.seats_used IS 'Anzahl der aktuell genutzten Seats';
COMMENT ON COLUMN public.events.phone_number_id IS 'Optional: Zugeordnete Telefonnummer für dieses Event';

-- 8. Funktion zum Aktualisieren von seats_used (wird automatisch aufgerufen)
CREATE OR REPLACE FUNCTION update_seats_used()
RETURNS TRIGGER AS $$
BEGIN
  -- Aktualisiere seats_used basierend auf aktiven Seats
  UPDATE public.profiles
  SET seats_used = (
    SELECT COUNT(*) 
    FROM public.phone_numbers 
    WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
      AND is_active = true
  )
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 8.1. Atomare Funktion zum Erstellen eines Seats mit Prüfung (verhindert Race Conditions)
CREATE OR REPLACE FUNCTION create_seat_atomic(
  p_user_id uuid,
  p_phone_number text,
  p_assigned_to_event_id uuid DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_seat_count integer;
  v_seats_used integer;
  v_new_seat_id uuid;
BEGIN
  -- Hole seat_count und seats_used mit Row-Level Lock (FOR UPDATE)
  SELECT seat_count, seats_used
  INTO v_seat_count, v_seats_used
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE; -- Wichtig: Lock verhindert Race Conditions

  -- Wenn kein Profil gefunden, Fehler
  IF v_seat_count IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Prüfe ob noch Platz vorhanden ist
  IF v_seats_used >= v_seat_count THEN
    RAISE EXCEPTION 'Maximale Anzahl an Seats erreicht';
  END IF;

  -- Prüfe ob Telefonnummer bereits existiert
  IF EXISTS (
    SELECT 1 FROM public.phone_numbers
    WHERE phone_number = p_phone_number
  ) THEN
    RAISE EXCEPTION 'Telefonnummer bereits vorhanden';
  END IF;

  -- Erstelle Seat
  INSERT INTO public.phone_numbers (user_id, phone_number, assigned_to_event_id, is_active)
  VALUES (p_user_id, p_phone_number, p_assigned_to_event_id, true)
  RETURNING id INTO v_new_seat_id;

  -- Trigger aktualisiert automatisch seats_used

  RETURN v_new_seat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Trigger für automatische Aktualisierung von seats_used
DROP TRIGGER IF EXISTS trigger_update_seats_used ON public.phone_numbers;

CREATE TRIGGER trigger_update_seats_used
  AFTER INSERT OR UPDATE OR DELETE ON public.phone_numbers
  FOR EACH ROW
  EXECUTE FUNCTION update_seats_used();

COMMENT ON FUNCTION update_seats_used() IS 
  'Aktualisiert automatisch seats_used in profiles basierend auf aktiven Seats';

-- 10. Constraint: seats_used darf nicht größer als seat_count sein
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_seats_used_not_exceed_count'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT check_seats_used_not_exceed_count 
    CHECK (seats_used <= seat_count);
  END IF;
END $$;

-- 11. Migration: Bestehende phone_number aus profiles zu phone_numbers migrieren
DO $$
DECLARE
  profile_record RECORD;
  new_seat_id uuid;
BEGIN
  -- Für jeden User mit phone_number, aber ohne Seats
  FOR profile_record IN
    SELECT id, phone_number
    FROM public.profiles
    WHERE phone_number IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.phone_numbers 
        WHERE user_id = profiles.id
      )
  LOOP
    -- Erstelle ersten Seat
    INSERT INTO public.phone_numbers (user_id, phone_number, is_active)
    VALUES (profile_record.id, profile_record.phone_number, true)
    RETURNING id INTO new_seat_id;
    
    -- Setze seat_count und seats_used auf 1
    UPDATE public.profiles
    SET seat_count = 1, seats_used = 1
    WHERE id = profile_record.id;
    
    -- Ordne ersten Seat dem ersten Event zu (falls vorhanden)
    -- Sortiere nach start_date (falls vorhanden) oder id (als Fallback)
    UPDATE public.events
    SET phone_number_id = new_seat_id
    WHERE user_id = profile_record.id
      AND phone_number_id IS NULL
      AND id = (
        SELECT id FROM public.events 
        WHERE user_id = profile_record.id 
        ORDER BY 
          CASE WHEN start_date IS NOT NULL THEN start_date ELSE '1970-01-01'::date END ASC,
          id ASC
        LIMIT 1
      );
  END LOOP;
END $$;
