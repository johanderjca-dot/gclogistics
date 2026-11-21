-- GC Logis · Prospectos (captación de empresas para Premier Pack Renacimiento).
-- Ejecutar en el SQL Editor de Supabase. Es idempotente: se puede correr más de una vez.
begin;

create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  company_name text not null check (length(trim(company_name)) > 0),
  industry text,
  province text,
  city text,
  phone text,
  whatsapp text,
  instagram text,
  email text,
  website text,
  address text,
  source text,
  status text not null default 'nuevo'
    check (status in ('nuevo','contactado','interesado','cotizacion','cliente','descartado')),
  estimated_plan text check (estimated_plan is null or estimated_plan in ('start','plus','upgrade','max')),
  owner_name text,
  next_follow_up date,
  last_contact_at date,
  notes text,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prospects_status_idx on public.prospects (status);
create index if not exists prospects_province_idx on public.prospects (province);
create unique index if not exists prospects_name_city_uniq
  on public.prospects (lower(company_name), lower(coalesce(city, '')));

create or replace function public.gc_prospects_touch() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end; $$;
drop trigger if exists prospects_touch on public.prospects;
create trigger prospects_touch before update on public.prospects
  for each row execute function public.gc_prospects_touch();

-- Cualquier usuario del panel (con perfil en public.profiles) puede trabajar los prospectos.
create or replace function public.is_gc_member()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()));
$$;
revoke all on function public.is_gc_member() from public, anon;
grant execute on function public.is_gc_member() to authenticated;

alter table public.prospects enable row level security;
revoke all on public.prospects from anon;
grant select, insert, update, delete on public.prospects to authenticated;

drop policy if exists "Panel members read prospects" on public.prospects;
create policy "Panel members read prospects" on public.prospects
  for select to authenticated using ((select public.is_gc_member()));

drop policy if exists "Panel members add prospects" on public.prospects;
create policy "Panel members add prospects" on public.prospects
  for insert to authenticated with check ((select public.is_gc_member()));

drop policy if exists "Panel members edit prospects" on public.prospects;
create policy "Panel members edit prospects" on public.prospects
  for update to authenticated using ((select public.is_gc_member())) with check ((select public.is_gc_member()));

-- Borrar solo lo hace un administrador; el equipo usa el estado "descartado".
drop policy if exists "Admins delete prospects" on public.prospects;
create policy "Admins delete prospects" on public.prospects
  for delete to authenticated using (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
  );

commit;
