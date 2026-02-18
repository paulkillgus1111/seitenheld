-- Telefonnummer-Verifizierung über WhatsApp
-- Führe diese SQL-Befehle in deiner Supabase SQL-Konsole aus

-- 1. Erweitere phone_numbers Tabelle um Verifizierungsfelder
ALTER TABLE public.phone_numbers
ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_code text,
ADD COLUMN IF NOT EXISTS verification_code_expires_at timestamptz,
ADD COLUMN IF NOT EXISTS verification_attempts integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_verification_request_at timestamptz;

-- 2. Index für Performance
CREATE INDEX IF NOT EXISTS idx_phone_numbers_verification_code 
ON public.phone_numbers(verification_code) 
WHERE verification_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_phone_numbers_verified 
ON public.phone_numbers(verified) 
WHERE verified = false;

-- 3. Constraint: verification_attempts darf nicht negativ sein
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_verification_attempts_not_negative'
  ) THEN
    ALTER TABLE public.phone_numbers
    ADD CONSTRAINT check_verification_attempts_not_negative 
    CHECK (verification_attempts >= 0);
  END IF;
END $$;

-- 4. Kommentare für Dokumentation
COMMENT ON COLUMN public.phone_numbers.verified IS 'Ist die Telefonnummer verifiziert?';
COMMENT ON COLUMN public.phone_numbers.verification_code IS '6-stelliger Verifizierungscode (wird nach Verifizierung gelöscht)';
COMMENT ON COLUMN public.phone_numbers.verification_code_expires_at IS 'Ablaufzeitpunkt des Verifizierungscodes (10 Minuten)';
COMMENT ON COLUMN public.phone_numbers.verification_attempts IS 'Anzahl der fehlgeschlagenen Verifizierungsversuche';
COMMENT ON COLUMN public.phone_numbers.last_verification_request_at IS 'Zeitpunkt der letzten Code-Anfrage (für Rate Limiting)';
