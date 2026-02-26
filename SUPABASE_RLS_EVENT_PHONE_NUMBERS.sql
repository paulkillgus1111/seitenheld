-- SUPABASE_RLS_EVENT_PHONE_NUMBERS.sql
-- RLS Policies für event_phone_numbers Junction Table

ALTER TABLE public.event_phone_numbers ENABLE ROW LEVEL SECURITY;

-- Users können nur Zuordnungen ihrer eigenen Events lesen
DROP POLICY IF EXISTS "Users can view event phone numbers for their events" ON public.event_phone_numbers;
CREATE POLICY "Users can view event phone numbers for their events"
  ON public.event_phone_numbers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_phone_numbers.event_id
        AND events.user_id = auth.uid()
    )
  );

-- Users können nur Zuordnungen für ihre eigenen Events erstellen
DROP POLICY IF EXISTS "Users can insert event phone numbers for their events" ON public.event_phone_numbers;
CREATE POLICY "Users can insert event phone numbers for their events"
  ON public.event_phone_numbers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_phone_numbers.event_id
        AND events.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.phone_numbers
      WHERE phone_numbers.id = event_phone_numbers.phone_number_id
        AND phone_numbers.user_id = auth.uid()
    )
  );

-- Users können nur Zuordnungen ihrer eigenen Events aktualisieren
DROP POLICY IF EXISTS "Users can update event phone numbers for their events" ON public.event_phone_numbers;
CREATE POLICY "Users can update event phone numbers for their events"
  ON public.event_phone_numbers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_phone_numbers.event_id
        AND events.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_phone_numbers.event_id
        AND events.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.phone_numbers
      WHERE phone_numbers.id = event_phone_numbers.phone_number_id
        AND phone_numbers.user_id = auth.uid()
    )
  );

-- Users können nur Zuordnungen ihrer eigenen Events löschen
DROP POLICY IF EXISTS "Users can delete event phone numbers for their events" ON public.event_phone_numbers;
CREATE POLICY "Users can delete event phone numbers for their events"
  ON public.event_phone_numbers
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_phone_numbers.event_id
        AND events.user_id = auth.uid()
    )
  );

