-- mail_templates Tabelle neu strukturieren für Multi-Template-Support
-- Führe diese SQL-Befehle in deiner Supabase SQL-Konsole aus

ALTER TABLE public.mail_templates 
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT 'Template',
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'mail_templates_pkey'
  ) THEN
    ALTER TABLE public.mail_templates 
      DROP CONSTRAINT mail_templates_pkey;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'mail_templates_pkey'
  ) THEN
    ALTER TABLE public.mail_templates 
      ADD PRIMARY KEY (id);
  END IF;
END $$;

UPDATE public.mail_templates 
SET id = gen_random_uuid() 
WHERE id IS NULL;

WITH numbered_templates AS (
  SELECT 
    id,
    'Template ' || row_number() OVER (PARTITION BY user_id ORDER BY created_at) as new_name
  FROM public.mail_templates
  WHERE name = 'Template' OR name IS NULL
)
UPDATE public.mail_templates mt
SET name = nt.new_name
FROM numbered_templates nt
WHERE mt.id = nt.id;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_mail_templates_updated_at ON public.mail_templates;
CREATE TRIGGER update_mail_templates_updated_at 
  BEFORE UPDATE ON public.mail_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.mail_templates 
  DROP COLUMN IF EXISTS auto_followup_enabled;

CREATE INDEX IF NOT EXISTS idx_mail_templates_user_id ON public.mail_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_mail_templates_created_at ON public.mail_templates(created_at);
