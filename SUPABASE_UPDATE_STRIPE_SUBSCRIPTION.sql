-- Erweitere profiles Tabelle um Stripe Subscription Felder
-- Führe diese SQL-Befehle in deiner Supabase SQL-Konsole aus

-- 1. Füge neue Spalten hinzu
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
ADD COLUMN IF NOT EXISTS stripe_price_id text,
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS plan_type text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS subscription_current_period_end timestamptz,
ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end boolean DEFAULT false;

-- 2. Index für Performance
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id 
ON public.profiles(stripe_customer_id) 
WHERE stripe_customer_id IS NOT NULL;

-- 3. Constraint für subscription_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_subscription_status'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT check_subscription_status 
    CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'trialing', 'incomplete', 'none'));
  END IF;
END $$;

-- 4. Constraint für plan_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_plan_type'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT check_plan_type 
    CHECK (plan_type IN ('yearly', 'messe_pass', 'ltd', 'none'));
  END IF;
END $$;

-- 5. Kommentare für Dokumentation
COMMENT ON COLUMN public.profiles.stripe_customer_id IS 'Stripe Customer ID für Abo-Verwaltung';
COMMENT ON COLUMN public.profiles.stripe_subscription_id IS 'Stripe Subscription ID (nur für Jahresabo)';
COMMENT ON COLUMN public.profiles.stripe_price_id IS 'Aktueller Stripe Price ID';
COMMENT ON COLUMN public.profiles.subscription_status IS 'Status: active, past_due, canceled, trialing, incomplete, none';
COMMENT ON COLUMN public.profiles.plan_type IS 'Plan-Typ: yearly, messe_pass, ltd, none';
COMMENT ON COLUMN public.profiles.subscription_current_period_end IS 'Ablaufdatum des aktuellen Abo-Zeitraums';
COMMENT ON COLUMN public.profiles.subscription_cancel_at_period_end IS 'Wird das Abo am Periodenende gekündigt?';
