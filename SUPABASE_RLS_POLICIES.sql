-- Row Level Security (RLS) Policies für alle kritischen Tabellen
-- Führe diese SQL-Befehle in deiner Supabase SQL-Konsole aus
-- WICHTIG: Diese Policies stellen sicher, dass User nur auf ihre eigenen Daten zugreifen können

-- ============================================
-- 1. PROFILES Tabelle
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users können nur ihr eigenes Profil lesen
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Users können nur ihr eigenes Profil aktualisieren
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users können nur ihr eigenes Profil erstellen (wird normalerweise durch Trigger gemacht)
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users können ihr Profil nicht löschen (nur über Auth)
-- Keine DELETE Policy - Löschen nur über Supabase Auth möglich

-- ============================================
-- 2. EVENTS Tabelle
-- ============================================
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Users können nur ihre eigenen Events lesen
DROP POLICY IF EXISTS "Users can view their own events" ON public.events;
CREATE POLICY "Users can view their own events"
  ON public.events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users können nur ihre eigenen Events erstellen
DROP POLICY IF EXISTS "Users can insert their own events" ON public.events;
CREATE POLICY "Users can insert their own events"
  ON public.events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users können nur ihre eigenen Events aktualisieren
DROP POLICY IF EXISTS "Users can update their own events" ON public.events;
CREATE POLICY "Users can update their own events"
  ON public.events
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users können nur ihre eigenen Events löschen
DROP POLICY IF EXISTS "Users can delete their own events" ON public.events;
CREATE POLICY "Users can delete their own events"
  ON public.events
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 3. LEADS Tabelle
-- ============================================
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Users können nur Leads ihrer eigenen Events lesen
DROP POLICY IF EXISTS "Users can view leads from their own events" ON public.leads;
CREATE POLICY "Users can view leads from their own events"
  ON public.leads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = leads.event_id
        AND events.user_id = auth.uid()
    )
  );

-- Users können nur Leads zu ihren eigenen Events erstellen
DROP POLICY IF EXISTS "Users can insert leads to their own events" ON public.leads;
CREATE POLICY "Users can insert leads to their own events"
  ON public.leads
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = leads.event_id
        AND events.user_id = auth.uid()
    )
  );

-- Users können nur Leads ihrer eigenen Events aktualisieren
DROP POLICY IF EXISTS "Users can update leads from their own events" ON public.leads;
CREATE POLICY "Users can update leads from their own events"
  ON public.leads
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = leads.event_id
        AND events.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = leads.event_id
        AND events.user_id = auth.uid()
    )
  );

-- Users können nur Leads ihrer eigenen Events löschen (soft delete via deleted_at)
DROP POLICY IF EXISTS "Users can delete leads from their own events" ON public.leads;
CREATE POLICY "Users can delete leads from their own events"
  ON public.leads
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = leads.event_id
        AND events.user_id = auth.uid()
    )
  );

-- ============================================
-- 4. PHONE_NUMBERS Tabelle
-- ============================================
ALTER TABLE public.phone_numbers ENABLE ROW LEVEL SECURITY;

-- Users können nur ihre eigenen Phone Numbers lesen
DROP POLICY IF EXISTS "Users can view their own phone numbers" ON public.phone_numbers;
CREATE POLICY "Users can view their own phone numbers"
  ON public.phone_numbers
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users können nur ihre eigenen Phone Numbers erstellen
DROP POLICY IF EXISTS "Users can insert their own phone numbers" ON public.phone_numbers;
CREATE POLICY "Users can insert their own phone numbers"
  ON public.phone_numbers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users können nur ihre eigenen Phone Numbers aktualisieren
DROP POLICY IF EXISTS "Users can update their own phone numbers" ON public.phone_numbers;
CREATE POLICY "Users can update their own phone numbers"
  ON public.phone_numbers
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users können nur ihre eigenen Phone Numbers löschen
DROP POLICY IF EXISTS "Users can delete their own phone numbers" ON public.phone_numbers;
CREATE POLICY "Users can delete their own phone numbers"
  ON public.phone_numbers
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 5. MAIL_TEMPLATES Tabelle (falls vorhanden)
-- ============================================
-- Prüfe ob Tabelle existiert, dann RLS aktivieren
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'mail_templates'
  ) THEN
    ALTER TABLE public.mail_templates ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view their own mail templates" ON public.mail_templates;
    CREATE POLICY "Users can view their own mail templates"
      ON public.mail_templates
      FOR SELECT
      USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can insert their own mail templates" ON public.mail_templates;
    CREATE POLICY "Users can insert their own mail templates"
      ON public.mail_templates
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can update their own mail templates" ON public.mail_templates;
    CREATE POLICY "Users can update their own mail templates"
      ON public.mail_templates
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can delete their own mail templates" ON public.mail_templates;
    CREATE POLICY "Users can delete their own mail templates"
      ON public.mail_templates
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- 6. INTEGRATIONS Tabelle (falls vorhanden)
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'integrations'
  ) THEN
    ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view their own integrations" ON public.integrations;
    CREATE POLICY "Users can view their own integrations"
      ON public.integrations
      FOR SELECT
      USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can insert their own integrations" ON public.integrations;
    CREATE POLICY "Users can insert their own integrations"
      ON public.integrations
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can update their own integrations" ON public.integrations;
    CREATE POLICY "Users can update their own integrations"
      ON public.integrations
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can delete their own integrations" ON public.integrations;
    CREATE POLICY "Users can delete their own integrations"
      ON public.integrations
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- Kommentare für Dokumentation
-- ============================================
COMMENT ON POLICY "Users can view their own profile" ON public.profiles IS 
  'RLS Policy: Users können nur ihr eigenes Profil lesen';

COMMENT ON POLICY "Users can view their own events" ON public.events IS 
  'RLS Policy: Users können nur ihre eigenen Events lesen';

COMMENT ON POLICY "Users can view leads from their own events" ON public.leads IS 
  'RLS Policy: Users können nur Leads ihrer eigenen Events lesen';

COMMENT ON POLICY "Users can view their own phone numbers" ON public.phone_numbers IS 
  'RLS Policy: Users können nur ihre eigenen Phone Numbers lesen';
