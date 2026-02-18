-- Füge Flag hinzu um zu tracken ob Morgen-Nachricht bereits gesendet wurde
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS morning_message_sent boolean DEFAULT false;

-- Index für Performance
CREATE INDEX IF NOT EXISTS idx_events_morning_message_sent 
ON public.events(morning_message_sent) 
WHERE morning_message_sent = false;

COMMENT ON COLUMN public.events.morning_message_sent IS 
  'Wurde die Morgen-Nachricht für dieses Event bereits gesendet?';
