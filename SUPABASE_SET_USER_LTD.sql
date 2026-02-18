-- Setze Benutzer paul.killgus@seitenheld.com auf LTD-Plan
-- Führe diese SQL-Befehle in deiner Supabase SQL-Konsole aus

UPDATE public.profiles
SET 
  subscription_status = 'active',
  plan_type = 'ltd',
  stripe_price_id = 'price_1SojCjBGOphxYXnW3H8GH9Im',
  trial_used = true,
  ltd_events_used = COALESCE(ltd_events_used, 0)
WHERE email = 'paul.killgus@seitenheld.com';

-- Überprüfe das Ergebnis
SELECT 
  id,
  email,
  subscription_status,
  plan_type,
  stripe_price_id,
  trial_used,
  ltd_events_used
FROM public.profiles
WHERE email = 'paul.killgus@seitenheld.com';
