-- SUPABASE_CREATE_EVENT_PHONE_NUMBERS.sql
-- Junction Table für Many-to-Many Beziehung zwischen Events und Phone Numbers

-- 1. Erstelle Junction Table
CREATE TABLE IF NOT EXISTS public.event_phone_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  phone_number_id uuid NOT NULL REFERENCES public.phone_numbers(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT NOW(),
  -- Verhindere Duplikate: Ein Seat kann nur einmal pro Event zugeordnet werden
  CONSTRAINT event_phone_numbers_unique UNIQUE (event_id, phone_number_id)
);

-- 2. Indexe für Performance
CREATE INDEX IF NOT EXISTS idx_event_phone_numbers_event_id 
ON public.event_phone_numbers(event_id);

CREATE INDEX IF NOT EXISTS idx_event_phone_numbers_phone_number_id 
ON public.event_phone_numbers(phone_number_id);

-- 3. Kommentare
COMMENT ON TABLE public.event_phone_numbers IS 
  'Junction Table: Many-to-Many Beziehung zwischen Events und Phone Numbers (Seats)';
COMMENT ON COLUMN public.event_phone_numbers.event_id IS 
  'Event-ID';
COMMENT ON COLUMN public.event_phone_numbers.phone_number_id IS 
  'Phone Number (Seat) ID';

-- 4. Optional: Migriere bestehende Daten von assigned_to_event_id
INSERT INTO public.event_phone_numbers (event_id, phone_number_id)
SELECT assigned_to_event_id, id
FROM public.phone_numbers
WHERE assigned_to_event_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.event_phone_numbers 
    WHERE event_id = phone_numbers.assigned_to_event_id 
      AND phone_number_id = phone_numbers.id
  );

-- 5. Optional: Migriere bestehende Daten von events.phone_number_id
INSERT INTO public.event_phone_numbers (event_id, phone_number_id)
SELECT id, phone_number_id
FROM public.events
WHERE phone_number_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.event_phone_numbers 
    WHERE event_id = events.id 
      AND phone_number_id = events.phone_number_id
  );
