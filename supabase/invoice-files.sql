-- GC Logis: respaldo de facturas (fotos y PDF) adjuntas a cada gasto.
-- Correr en Supabase > SQL Editor después de accounting.sql. Es seguro correrlo más de una vez.
-- Solo los administradores pueden ver, subir o quitar archivos.

-- 1. Espacio privado para los archivos (máx. 10 MB por archivo).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('facturas', 'facturas', false, 10485760,
        array['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf'])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins can read invoice files" on storage.objects;
create policy "Admins can read invoice files" on storage.objects
  for select to authenticated using (bucket_id = 'facturas' and (select public.is_gc_admin()));
drop policy if exists "Admins can upload invoice files" on storage.objects;
create policy "Admins can upload invoice files" on storage.objects
  for insert to authenticated with check (bucket_id = 'facturas' and (select public.is_gc_admin()));
drop policy if exists "Admins can delete invoice files" on storage.objects;
create policy "Admins can delete invoice files" on storage.objects
  for delete to authenticated using (bucket_id = 'facturas' and (select public.is_gc_admin()));

-- 2. Qué archivo pertenece a qué factura.
create table if not exists public.accounting_expense_files (
  id uuid primary key default gen_random_uuid(),
  expense_id text not null references public.accounting_expenses(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  content_type text,
  size_bytes bigint,
  uploaded_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists accounting_expense_files_expense_idx on public.accounting_expense_files(expense_id);

alter table public.accounting_expense_files enable row level security;
revoke all on public.accounting_expense_files from anon;
grant select, insert, delete on public.accounting_expense_files to authenticated;

drop policy if exists "Admins can read expense files" on public.accounting_expense_files;
create policy "Admins can read expense files" on public.accounting_expense_files
  for select to authenticated using ((select public.is_gc_admin()));
drop policy if exists "Admins can add expense files" on public.accounting_expense_files;
create policy "Admins can add expense files" on public.accounting_expense_files
  for insert to authenticated with check ((select public.is_gc_admin()) and storage_path like expense_id || '/%');
drop policy if exists "Admins can remove expense files" on public.accounting_expense_files;
create policy "Admins can remove expense files" on public.accounting_expense_files
  for delete to authenticated using ((select public.is_gc_admin()));
