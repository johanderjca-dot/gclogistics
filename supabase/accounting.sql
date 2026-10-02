-- Accounting module for GC Logis.
-- Apply after supabase/setup.sql. All authenticated GC Logis users may read the ledgers;
-- only administrators may create postings through the checked RPC.
create table if not exists public.accounting_accounts (
  code text primary key,
  name text not null,
  account_type text not null check (account_type in ('group','asset','liability','equity','income','cost','expense')),
  nature text not null check (nature in ('debit','credit')),
  parent_code text references public.accounting_accounts(code),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.accounting_investors (
  account_code text primary key references public.accounting_accounts(code),
  display_name text not null,
  is_active boolean not null default true
);
create table if not exists public.accounting_expenses (
  id text primary key,
  expense_date date not null,
  supplier text not null,
  supplier_rnc text,
  invoice_reference text,
  ncf text not null default 'SIN NCF',
  concept text not null,
  account_code text not null references public.accounting_accounts(code),
  net_amount numeric(14,2) not null check (net_amount >= 0),
  itbis_amount numeric(14,2) not null default 0 check (itbis_amount >= 0),
  total_amount numeric(14,2) not null check (total_amount >= 0),
  classification_note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check (round(net_amount + itbis_amount,2) = round(total_amount,2))
);
create table if not exists public.accounting_journal_entries (
  entry_no text primary key,
  entry_date date not null,
  memo text not null,
  source_expense_id text unique references public.accounting_expenses(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create table if not exists public.accounting_journal_lines (
  id bigint generated always as identity primary key,
  entry_no text not null references public.accounting_journal_entries(entry_no) on delete cascade,
  line_no integer not null,
  account_code text not null references public.accounting_accounts(code),
  description text not null,
  party_name text,
  debit numeric(14,2) not null default 0 check (debit >= 0),
  credit numeric(14,2) not null default 0 check (credit >= 0),
  created_at timestamptz not null default now(),
  unique (entry_no,line_no),
  check ((debit > 0 and credit = 0) or (credit > 0 and debit = 0))
);
create index if not exists accounting_journal_lines_account_idx on public.accounting_journal_lines(account_code);
create index if not exists accounting_journal_lines_party_idx on public.accounting_journal_lines(party_name);

alter table public.accounting_accounts enable row level security;
alter table public.accounting_investors enable row level security;
alter table public.accounting_expenses enable row level security;
alter table public.accounting_journal_entries enable row level security;
alter table public.accounting_journal_lines enable row level security;

drop policy if exists "Authenticated users can read accounting accounts" on public.accounting_accounts;
create policy "Authenticated users can read accounting accounts" on public.accounting_accounts for select to authenticated using (true);
drop policy if exists "Authenticated users can read accounting investors" on public.accounting_investors;
create policy "Authenticated users can read accounting investors" on public.accounting_investors for select to authenticated using (true);
drop policy if exists "Authenticated users can read accounting expenses" on public.accounting_expenses;
create policy "Authenticated users can read accounting expenses" on public.accounting_expenses for select to authenticated using (true);
drop policy if exists "Authenticated users can read accounting entries" on public.accounting_journal_entries;
create policy "Authenticated users can read accounting entries" on public.accounting_journal_entries for select to authenticated using (true);
drop policy if exists "Authenticated users can read accounting lines" on public.accounting_journal_lines;
create policy "Authenticated users can read accounting lines" on public.accounting_journal_lines for select to authenticated using (true);

insert into public.accounting_accounts(code,name,account_type,nature,parent_code) values
('1000','Activos','group','debit',null),
('1100','Activos corrientes','group','debit','1000'),
('1120','ITBIS pagado en compras (por validar)','asset','debit','1100'),
('1130','Dominio web pagado por anticipado','asset','debit','1100'),
('1200','Activos intangibles','group','debit','1000'),
('1210','Derecho de franquicia (provisional)','asset','debit','1200'),
('1220','Registro ONAPI (evaluar intangible)','asset','debit','1200'),
('2000','Pasivos','group','credit',null),
('2100','Cuentas por pagar','group','credit','2000'),
('2110','Préstamos por pagar a inversionistas','group','credit','2100'),
('2111','Inversionista 1','liability','credit','2110'),
('2112','Inversionista 2','liability','credit','2110'),
('2113','Inversionista 3','liability','credit','2110'),
('2114','Inversionista 4','liability','credit','2110'),
('2200','Cuentas por pagar a suplidores','group','credit','2100'),
('3000','Patrimonio','group','credit',null),
('3100','Capital aportado','equity','credit','3000'),
('3200','Resultados acumulados','equity','credit','3000'),
('4000','Ingresos','income','credit',null),
('5000','Costos','cost','debit',null),
('6000','Gastos','group','debit',null),
('6101','Suministros de oficina','expense','debit','6000'),
('6102','Gastos legales y de registro','expense','debit','6000'),
('6103','Tasas e impuestos de constitución','expense','debit','6000'),
('6104','Diseño e identidad corporativa','expense','debit','6000')
on conflict (code) do nothing;

insert into public.accounting_investors(account_code,display_name) values
('2111','Inversionista 1'),('2112','Inversionista 2'),('2113','Inversionista 3'),('2114','Inversionista 4')
on conflict (account_code) do nothing;

create or replace function public.record_accounting_expense(p_expense jsonb)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_id text := p_expense->>'id';
  v_date date := (p_expense->>'expense_date')::date;
  v_supplier text := p_expense->>'supplier';
  v_concept text := p_expense->>'concept';
  v_account text := p_expense->>'account_code';
  v_net numeric(14,2) := (p_expense->>'net_amount')::numeric;
  v_itbis numeric(14,2) := coalesce((p_expense->>'itbis_amount')::numeric,0);
  v_total numeric(14,2) := (p_expense->>'total_amount')::numeric;
  v_count integer;
  v_cents integer;
  v_each integer;
  v_remainder integer;
  v_index integer := 0;
  v_credit numeric(14,2);
  v_investor record;
  v_line integer := 0;
begin
  if not public.is_gc_admin() then raise exception 'Solo un administrador puede registrar gastos'; end if;
  if v_id is null or v_date is null or v_supplier is null or v_concept is null then raise exception 'Faltan datos obligatorios'; end if;
  if round(v_net+v_itbis,2) <> round(v_total,2) then raise exception 'El total no coincide con subtotal más ITBIS'; end if;
  if not exists(select 1 from public.accounting_accounts a where a.code=v_account and a.account_type in ('asset','expense')) then raise exception 'La cuenta contable no admite este gasto'; end if;
  if exists(select 1 from public.accounting_expenses e where e.id=v_id) then return v_id; end if;
  select count(*) into v_count from public.accounting_investors i where i.is_active;
  if v_count <> 4 then raise exception 'Configura los cuatro auxiliares de inversionistas antes de registrar'; end if;

  insert into public.accounting_expenses(id,expense_date,supplier,supplier_rnc,invoice_reference,ncf,concept,account_code,net_amount,itbis_amount,total_amount,classification_note,created_by)
  values(v_id,v_date,v_supplier,nullif(p_expense->>'supplier_rnc',''),nullif(p_expense->>'invoice_reference',''),coalesce(nullif(p_expense->>'ncf',''),'SIN NCF'),v_concept,v_account,v_net,v_itbis,v_total,nullif(p_expense->>'classification_note',''),auth.uid());

  insert into public.accounting_journal_entries(entry_no,entry_date,memo,source_expense_id,created_by)
  values(v_id,v_date,v_concept,v_id,auth.uid());

  insert into public.accounting_journal_lines(entry_no,line_no,account_code,description,debit)
  values(v_id,1,v_account,v_concept,v_net);
  v_line:=1;
  if v_itbis > 0 then
    insert into public.accounting_journal_lines(entry_no,line_no,account_code,description,debit)
    values(v_id,2,'1120','ITBIS de factura (crédito sujeto a validar)',v_itbis);
    v_line:=2;
  end if;

  v_cents:=round(v_total*100)::integer;
  v_each:=v_cents / v_count;
  v_remainder:=mod(v_cents,v_count);
  for v_investor in select i.account_code,i.display_name from public.accounting_investors i where i.is_active order by i.account_code loop
    v_index:=v_index+1;
    v_credit:=(v_each+case when v_index<=v_remainder then 1 else 0 end)::numeric/100;
    v_line:=v_line+1;
    insert into public.accounting_journal_lines(entry_no,line_no,account_code,description,party_name,credit)
    values(v_id,v_line,v_investor.account_code,'Préstamo de inversionista por gastos cubiertos',v_investor.display_name,v_credit);
  end loop;
  return v_id;
end;
$$;

revoke all on function public.record_accounting_expense(jsonb) from public, anon;
grant execute on function public.record_accounting_expense(jsonb) to authenticated;
