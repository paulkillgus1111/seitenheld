-- Füge Zeitzone-Feld zu Events hinzu
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'Europe/Berlin';

-- Index für Performance
CREATE INDEX IF NOT EXISTS idx_events_timezone 
ON public.events(timezone);

COMMENT ON COLUMN public.events.timezone IS 
  'IANA Timezone (z.B. Europe/Berlin, America/New_York, Asia/Tokyo)';
