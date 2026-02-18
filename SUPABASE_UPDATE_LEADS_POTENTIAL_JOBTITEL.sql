-- Erweitere leads-Tabelle um Potential und Jobtitel Spalten

-- 1) Füge neue Spalten hinzu
alter table public.leads
add column if not exists potential text,
add column if not exists jobtitel text;

-- 2) Erstelle CHECK Constraint für potential (nur erlaubte Werte)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'leads_potential_check'
  ) then
    alter table public.leads
    add constraint leads_potential_check 
    check (potential is null or potential in ('Hoch', 'Medium', 'Niedrig'));
  end if;
end $$;

-- 4) Erstelle Index auf potential für bessere Performance bei Filtern
create index if not exists idx_leads_potential on public.leads(potential) where potential is not null;

-- 5) Erstelle Index auf jobtitel für bessere Performance bei Suche
create index if not exists idx_leads_jobtitel on public.leads(jobtitel) where jobtitel is not null;
