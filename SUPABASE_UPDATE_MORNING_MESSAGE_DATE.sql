-- Migration: morning_message_sent (boolean) → last_morning_message_date (date)
-- Ermöglicht tägliche Morning Messages während des Events

-- 1. Füge neue Spalte hinzu
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS last_morning_message_date date;

-- 2. Migriere bestehende Daten:
-- - morning_message_sent = true → last_morning_message_date = start_date (falls vorhanden)
-- - morning_message_sent = false → last_morning_message_date = null
UPDATE public.events
SET last_morning_message_date = 
  CASE 
    WHEN morning_message_sent = true AND start_date IS NOT NULL 
    THEN start_date::date
    ELSE NULL
  END;

-- 3. Index für Performance (für Queries die Events ohne heutige Nachricht finden)
CREATE INDEX IF NOT EXISTS idx_events_last_morning_message_date 
ON public.events(last_morning_message_date) 
WHERE last_morning_message_date IS NULL;

-- 4. Optional: Alte Spalte entfernen (nach erfolgreicher Migration)
-- ALTER TABLE public.events DROP COLUMN IF EXISTS morning_message_sent;

-- 5. Kommentar
COMMENT ON COLUMN public.events.last_morning_message_date IS 
  'Datum der letzten gesendeten Morning Message. NULL = noch keine Nachricht gesendet.';
