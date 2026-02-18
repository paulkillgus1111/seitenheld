-- Erweitere leads-Tabelle um direkte Spalten für Lead-Daten
-- Email wird als UNIQUE gesetzt, um Dubletten zu vermeiden

-- 1) Füge neue Spalten hinzu
alter table public.leads
add column if not exists vorname text,
add column if not exists nachname text,
add column if not exists email text,
add column if not exists firma text,
add column if not exists telefon text,
add column if not exists zusammenfassung text;

-- 2) Erstelle UNIQUE Constraint auf email (nur wenn noch nicht vorhanden)
-- Hinweis: Falls bereits Einträge mit NULL oder leeren Strings existieren, 
-- müssen diese zuerst bereinigt werden, da UNIQUE NULL-Werte erlaubt, aber nicht mehrere leere Strings
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'leads_email_unique'
  ) then
    -- Entferne leere Strings und setze auf NULL
    update public.leads set email = null where email = '';
    
    -- Erstelle UNIQUE Constraint
    alter table public.leads
    add constraint leads_email_unique unique (email);
  end if;
end $$;

-- 3) Optional: Migriere bestehende Daten aus structured_data in die neuen Spalten
-- (Nur für Leads, die noch keine Werte in den neuen Spalten haben)
update public.leads
set
  vorname = coalesce(
    vorname,
    (structured_data->>'first_name')::text,
    (structured_data->>'firstname')::text,
    (structured_data->>'firstName')::text
  ),
  nachname = coalesce(
    nachname,
    (structured_data->>'last_name')::text,
    (structured_data->>'lastname')::text,
    (structured_data->>'lastName')::text
  ),
  email = coalesce(
    email,
    (structured_data->>'email')::text,
    (structured_data->>'mail')::text
  ),
  firma = coalesce(
    firma,
    (structured_data->>'company')::text,
    (structured_data->>'firma')::text,
    (structured_data->>'organisation')::text
  ),
  telefon = coalesce(
    telefon,
    (structured_data->>'phone')::text,
    (structured_data->>'telephone')::text,
    (structured_data->>'tel')::text
  ),
  zusammenfassung = coalesce(
    zusammenfassung,
    (structured_data->>'summary')::text,
    (structured_data->>'notes')::text,
    (structured_data->>'zusammenfassung')::text
  )
where
  vorname is null
  or nachname is null
  or email is null
  or firma is null
  or telefon is null
  or zusammenfassung is null;

-- 4) Erstelle Index auf email für bessere Performance (UNIQUE erstellt bereits einen Index, aber zur Sicherheit)
-- create index if not exists idx_leads_email on public.leads(email) where email is not null;
