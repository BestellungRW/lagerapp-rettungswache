-- ============================================================
--  LagerApp Rettungswache – Datenbank-Schema (Supabase/PostgreSQL)
--  Ausführen: Supabase Dashboard → SQL Editor → komplettes Skript einfügen → Run
-- ============================================================

-- ---------- Rettungswachen ----------
create table if not exists public.stations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- ---------- E-Mail-Empfänger für Bestelllisten (pro Wache, mehrere) ----------
create table if not exists public.order_email_recipients (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  unique (station_id, email)
);

-- ---------- Medizinische Produkte (je Rettungswache) ----------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations (id) on delete cascade,
  barcode text not null,
  name text not null,
  soll integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (station_id, barcode)
);

-- ---------- Accounts (Profile) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text check (role in ('admin','mpg','benutzer')),
  station_id uuid references public.stations (id) on delete set null,
  email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Profil automatisch bei Anlage eines Accounts erzeugen
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- Hilfsfunktionen (RLS-sicher) ----------
create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.current_station()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select station_id from public.profiles where id = auth.uid()
$$;

-- ---------- Row Level Security ----------
alter table public.stations enable row level security;
alter table public.order_email_recipients enable row level security;
alter table public.products enable row level security;
alter table public.profiles enable row level security;

-- Bestehende Policies vorab entfernen (Skript kann gefahrlos mehrmals laufen)
do $$
declare tbl text; pol text;
begin
  for tbl in
    select unnest(array[
      'stations','order_email_recipients','products','profiles'
    ])
  loop
    for pol in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = tbl
    loop
      execute format('drop policy if exists %I on public.%I', pol, tbl);
    end loop;
  end loop;
end $$;

-- ---------- stations ----------
create policy "stations_read_own" on public.stations for select to authenticated
  using (id = public.current_station() or public.current_role() = 'admin');
create policy "stations_write_admin" on public.stations for all to authenticated
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- ---------- order_email_recipients (nur Admin, Abfrage über Service-Role) ----------
create policy "recipients_read_admin" on public.order_email_recipients for select to authenticated
  using (public.current_role() = 'admin');
create policy "recipients_write_admin" on public.order_email_recipients for all to authenticated
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- ---------- products ----------
create policy "products_read_own_station" on public.products for select to authenticated
  using (station_id = public.current_station() or public.current_role() = 'admin');
create policy "products_write_own_station" on public.products for all to authenticated
  using (
    (public.current_role() = 'mpg' and station_id = public.current_station())
    or public.current_role() = 'admin'
  )
  with check (
    (public.current_role() = 'mpg' and station_id = public.current_station())
    or public.current_role() = 'admin'
  );

-- ---------- profiles ----------
create policy "profiles_read_own" on public.profiles for select to authenticated
  using (id = auth.uid());
create policy "profiles_read_admin" on public.profiles for select to authenticated
  using (public.current_role() = 'admin');
create policy "profiles_write_admin" on public.profiles for all to authenticated
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- Benutzer dürfen eigene Profilfelder über RLS nicht direkt ändern –
-- Rollen/Stationen verwaltet ausschließlich der Admin (Service-Role).
revoke update on table public.profiles from authenticated;

-- ============================================================
--  Erster Admin-Account (nach Anlage über das Dashboard)
--  Supabase Dashboard → Authentication → Users → „Add user“
--  E-Mail + Passwort eingeben (verifiziert). Danach hier ausführen:
--  update public.profiles set role = 'admin' where email = 'admin@beispiel.de';
-- ============================================================