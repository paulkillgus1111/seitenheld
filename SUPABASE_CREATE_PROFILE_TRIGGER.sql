-- Trigger für automatische Profil-Erstellung beim Signup
-- Führe diese SQL-Befehle in deiner Supabase SQL-Konsole aus

-- Funktion zum Erstellen des Profils beim Signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    seat_count,
    seats_used
  )
  VALUES (
    NEW.id,
    NEW.email,  -- Email aus auth.users
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',  -- full_name aus Signup-Daten
      NULL
    ),
    1,  -- Standard: 1 Seat
    0   -- Noch keine Seats verwendet
  )
  ON CONFLICT (id) DO NOTHING; -- Verhindert Fehler bei doppelter Ausführung
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger erstellen
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Kommentar für Dokumentation
COMMENT ON FUNCTION handle_new_user() IS 
  'Erstellt automatisch ein Profil beim Signup mit email, full_name, seat_count=1 und seats_used=0';
