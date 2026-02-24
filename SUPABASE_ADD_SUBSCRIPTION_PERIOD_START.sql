-- Füge subscription_current_period_start zur profiles Tabelle hinzu
-- Führe diese SQL-Befehle in deiner Supabase SQL-Konsole aus

-- 1. Füge neue Spalte hinzu
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS subscription_current_period_start timestamptz;

-- 2. Index für Performance
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_period_start 
ON public.profiles(subscription_current_period_start) 
WHERE subscription_current_period_start IS NOT NULL;

-- 3. Kommentar
COMMENT ON COLUMN public.profiles.subscription_current_period_start IS 
  'Startdatum des aktuellen Abo-Zeitraums (für Jahresabo Event-Limit)';
