-- GC Logis · Contabilidad v2 (noviembre 2026)
-- Correr en Supabase > SQL Editor después de setup.sql, accounting.sql, dgii-606.sql e invoice-files.sql.
-- Es seguro correrlo más de una vez.
--
-- Qué agrega:
--  1. Acceso a la contabilidad solo para socios (can_view_accounting) y administradores.
--  2. Aportes de los socios como PATRIMONIO (3111–3114), ya no como préstamo (2111–2114).
--  3. "Pagado por": cada gasto indica qué socio pagó, si fue la empresa o si está pendiente.
--  4. Anular gastos con asiento de reverso.
--  5. Ventas (607), comprobantes anulados (608) y pagos al exterior (609).
--  6. Amortización mensual (dominio web, registro ONAPI).
--  7. Cierre de mes: un período cerrado no se puede modificar.
--  8. Bitácora de cambios.

begin;

-- ───────────────────────── 1. Acceso ─────────────────────────
alter table public.profiles add column if not exists can_view_accounting boolean not null default false;

create or replace function public.is_gc_accountant()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and (p.role = 'admin' or p.can_view_accounting)
  );
$$;
revoke all on function public.is_gc_accountant() from public, anon;
grant execute on function public.is_gc_accountant() to authenticated;

-- Los cuatro socios ven la contabilidad.
update public.profiles set can_view_accounting = true
where lower(email) in ('johanderjca@gmail.com','garrido.ger@gmail.com','eliannycastillo12@gmail.com','luisfgarridor@gmail.com');

-- ───────────────────────── 2. Plan de cuentas ─────────────────────────
update public.accounting_accounts set account_type='group' where code in ('4000','5000') and account_type <> 'group';
update public.accounting_accounts set name='Registro de nombre comercial ONAPI' where code='1220';

insert into public.accounting_accounts(code,name,account_type,nature,parent_code) values
('1110','Caja y bancos','asset','debit','1100'),
('1140','Cuentas por cobrar a clientes','asset','debit','1100'),
('1150','ITBIS retenido por clientes','asset','debit','1100'),
('1160','ISR retenido por clientes (anticipo)','asset','debit','1100'),
('2210','Proveedores por pagar','liability','credit','2200'),
('2330','ITBIS por pagar en ventas','liability','credit','2300'),
('2350','Otros impuestos y propina por pagar','liability','credit','2300'),
('3110','Aportes de socios para futura capitalización','group','credit','3000'),
('3111','Aporte · Johander José Cortez Acosta','equity','credit','3110'),
('3112','Aporte · German Giovanni Garrido Rodríguez','equity','credit','3110'),
('3113','Aporte · Luisa Elianny Castillo Batista','equity','credit','3110'),
('3114','Aporte · Luis Fermín Garrido Rodríguez','equity','credit','3110'),
('4100','Ingresos por servicios','income','credit','4000'),
('4900','Otros ingresos','income','credit','4000'),
('5100','Costo de servicios','cost','debit','5000'),
('6105','Dominio, hosting y software','expense','debit','6000'),
('6106','Amortización de intangibles','expense','debit','6000'),
('6107','Comisiones y gastos bancarios','expense','debit','6000'),
('6108','Publicidad y mercadeo','expense','debit','6000'),
('6199','Otros gastos','expense','debit','6000')
on conflict (code) do nothing;

-- ───────────────────────── 3. Socios: de préstamo a patrimonio ─────────────────────────
alter table public.accounting_investors add column if not exists email text;
alter table public.accounting_investors add column if not exists short_name text;

insert into public.accounting_investors(account_code,display_name,is_active,email,short_name) values
('3111','Johander José Cortez Acosta',true,'johanderjca@gmail.com','Johander'),
('3112','German Giovanni Garrido Rodríguez',true,'garrido.ger@gmail.com','Germán'),
('3113','Luisa Elianny Castillo Batista',true,'eliannycastillo12@gmail.com','Elianny'),
('3114','Luis Fermín Garrido Rodríguez',true,'luisfgarridor@gmail.com','Luis')
on conflict (account_code) do update set display_name=excluded.display_name, is_active=true,
  email=excluded.email, short_name=excluded.short_name;
update public.accounting_investors set is_active=false where account_code in ('2111','2112','2113','2114');

create table if not exists public.accounting_archived_rows (
  id bigint generated always as identity primary key,
  archived_at timestamptz not null default now(),
  reason text not null,
  table_name text not null,
  row_data jsonb not null
);
alter table public.accounting_archived_rows enable row level security;
revoke all on public.accounting_archived_rows from anon, authenticated;

-- Reclasificar líneas existentes 2111–2114 → 3111–3114 (con respaldo).
insert into public.accounting_archived_rows(reason,table_name,row_data)
select 'Reclasificación de préstamos de socios a aportes (patrimonio)','accounting_journal_lines',to_jsonb(l)
from public.accounting_journal_lines l where l.account_code in ('2111','2112','2113','2114');

update public.accounting_journal_lines l set
  account_code = '311'||right(l.account_code,1),
  party_name = i.display_name,
  description = 'Aporte de socio por gastos cubiertos'
from public.accounting_investors i
where l.account_code in ('2111','2112','2113','2114') and i.account_code = '311'||right(l.account_code,1);

update public.accounting_accounts set is_active=false where code in ('2110','2111','2112','2113','2114');

-- ───────────────────────── 4. Bitácora ─────────────────────────
create table if not exists public.accounting_audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  user_id uuid default auth.uid(),
  action text not null,
  ref text,
  detail jsonb
);
alter table public.accounting_audit_log enable row level security;
revoke all on public.accounting_audit_log from anon;
grant select on public.accounting_audit_log to authenticated;

-- ───────────────────────── 5. Cierre de mes ─────────────────────────
create table if not exists public.accounting_closed_periods (
  period text primary key check (period ~ '^\d{4}-\d{2}$'),
  closed_at timestamptz not null default now(),
  closed_by uuid default auth.uid(),
  note text
);
alter table public.accounting_closed_periods enable row level security;
revoke all on public.accounting_closed_periods from anon;
grant select on public.accounting_closed_periods to authenticated;

create or replace function public.gc_assert_open(p_date date)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if p_date is not null and exists(select 1 from public.accounting_closed_periods c where c.period = to_char(p_date,'YYYY-MM')) then
    raise exception 'El mes % está cerrado. Reábrelo en "Cierre de mes" si necesitas corregirlo.', to_char(p_date,'MM/YYYY');
  end if;
end;
$$;

create or replace function public.gc_guard_entries() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op in ('UPDATE','DELETE') then perform public.gc_assert_open(old.entry_date); end if;
  if tg_op in ('INSERT','UPDATE') then perform public.gc_assert_open(new.entry_date); return new; end if;
  return old;
end; $$;
drop trigger if exists gc_guard_entries on public.accounting_journal_entries;
create trigger gc_guard_entries before insert or update or delete on public.accounting_journal_entries
  for each row execute function public.gc_guard_entries();

create or replace function public.gc_guard_lines() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_date date;
begin
  if tg_op in ('UPDATE','DELETE') then
    select entry_date into v_date from public.accounting_journal_entries where entry_no = old.entry_no;
    perform public.gc_assert_open(v_date);
  end if;
  if tg_op in ('INSERT','UPDATE') then
    select entry_date into v_date from public.accounting_journal_entries where entry_no = new.entry_no;
    perform public.gc_assert_open(v_date);
    return new;
  end if;
  return old;
end; $$;
drop trigger if exists gc_guard_lines on public.accounting_journal_lines;
create trigger gc_guard_lines before insert or update or delete on public.accounting_journal_lines
  for each row execute function public.gc_guard_lines();

create or replace function public.gc_guard_expenses() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op in ('UPDATE','DELETE') then perform public.gc_assert_open(old.expense_date); end if;
  if tg_op in ('INSERT','UPDATE') then perform public.gc_assert_open(new.expense_date); return new; end if;
  return old;
end; $$;
drop trigger if exists gc_guard_expenses on public.accounting_expenses;
create trigger gc_guard_expenses before insert or update or delete on public.accounting_expenses
  for each row execute function public.gc_guard_expenses();

create or replace function public.close_accounting_period(p jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_period text := p->>'period';
begin
  if not public.is_gc_admin() then raise exception 'Solo un administrador puede cerrar meses'; end if;
  if v_period !~ '^\d{4}-\d{2}$' then raise exception 'Período inválido (usa AAAA-MM)'; end if;
  insert into public.accounting_closed_periods(period,note) values (v_period, nullif(p->>'note',''))
  on conflict (period) do nothing;
  insert into public.accounting_audit_log(action,ref,detail) values ('cerrar_mes',v_period,p);
end; $$;

create or replace function public.reopen_accounting_period(p jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_period text := p->>'period';
begin
  if not public.is_gc_admin() then raise exception 'Solo un administrador puede reabrir meses'; end if;
  if nullif(trim(p->>'reason'),'') is null then raise exception 'Indica por qué se reabre el mes'; end if;
  delete from public.accounting_closed_periods where period = v_period;
  insert into public.accounting_audit_log(action,ref,detail) values ('reabrir_mes',v_period,p);
end; $$;

-- ───────────────────────── 6. Gastos: quién pagó, anulación, exterior ─────────────────────────
alter table public.accounting_expenses
  add column if not exists paid_by text not null default 'socios',
  add column if not exists status text not null default 'activa',
  add column if not exists voided_at date,
  add column if not exists void_reason text,
  add column if not exists is_foreign boolean not null default false,
  add column if not exists foreign_country text,
  add column if not exists foreign_id_type text,
  add column if not exists foreign_tax_id text,
  add column if not exists foreign_service_type text,
  add column if not exists foreign_service_detail text,
  add column if not exists related_party boolean not null default false,
  add column if not exists isr_presumed_base numeric(14,2) not null default 0;

alter table public.accounting_expenses drop constraint if exists accounting_expenses_v2_check;
alter table public.accounting_expenses add constraint accounting_expenses_v2_check check (
  paid_by in ('socios','3111','3112','3113','3114','empresa','pendiente') and
  status in ('activa','anulada') and
  (foreign_id_type is null or foreign_id_type in ('1','2'))
);

-- Escribe las líneas de crédito según quién pagó. Devuelve el último número de línea usado.
create or replace function public.gc_post_payer_lines(p_entry text, p_line integer, p_amount numeric, p_paid_by text, p_supplier text)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_line integer := p_line; v_count integer; v_cents bigint; v_each bigint; v_rem bigint; v_i integer := 0;
  v_credit numeric(14,2); v_inv record; v_name text;
begin
  if p_amount <= 0 then return v_line; end if;
  if p_paid_by = 'socios' then
    select count(*) into v_count from public.accounting_investors where is_active;
    if v_count = 0 then raise exception 'No hay socios activos'; end if;
    v_cents := round(p_amount*100); v_each := v_cents / v_count; v_rem := mod(v_cents, v_count);
    for v_inv in select account_code, display_name from public.accounting_investors where is_active order by account_code loop
      v_i := v_i + 1;
      v_credit := (v_each + case when v_i <= v_rem then 1 else 0 end)::numeric / 100;
      if v_credit > 0 then
        v_line := v_line + 1;
        insert into public.accounting_journal_lines(entry_no,line_no,account_code,description,party_name,credit)
        values (p_entry, v_line, v_inv.account_code, 'Aporte de socio por gastos cubiertos', v_inv.display_name, v_credit);
      end if;
    end loop;
  elsif p_paid_by in ('3111','3112','3113','3114') then
    select display_name into v_name from public.accounting_investors where account_code = p_paid_by and is_active;
    if v_name is null then raise exception 'Socio % no está activo', p_paid_by; end if;
    v_line := v_line + 1;
    insert into public.accounting_journal_lines(entry_no,line_no,account_code,description,party_name,credit)
    values (p_entry, v_line, p_paid_by, 'Aporte de socio por gasto pagado', v_name, p_amount);
  elsif p_paid_by = 'empresa' then
    v_line := v_line + 1;
    insert into public.accounting_journal_lines(entry_no,line_no,account_code,description,credit)
    values (p_entry, v_line, '1110', 'Pago desde caja o banco de la empresa', p_amount);
  elsif p_paid_by = 'pendiente' then
    v_line := v_line + 1;
    insert into public.accounting_journal_lines(entry_no,line_no,account_code,description,party_name,credit)
    values (p_entry, v_line, '2210', 'Factura pendiente de pago', p_supplier, p_amount);
  else
    raise exception 'Valor de "pagado por" inválido: %', p_paid_by;
  end if;
  return v_line;
end; $$;
revoke all on function public.gc_post_payer_lines(text,integer,numeric,text,text) from public, anon, authenticated;

create or replace function public.record_accounting_expense(p_expense jsonb)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_id text := p_expense->>'id';
  v_date date := (p_expense->>'expense_date')::date;
  v_supplier text := nullif(trim(p_expense->>'supplier'),'');
  v_concept text := nullif(trim(p_expense->>'concept'),'');
  v_account text := p_expense->>'account_code';
  v_ncf text := upper(coalesce(nullif(trim(p_expense->>'ncf'),''),'SIN NCF'));
  v_ncf_mod text := upper(nullif(trim(p_expense->>'ncf_modified'),''));
  v_rnc text := nullif(regexp_replace(coalesce(p_expense->>'supplier_rnc',''),'\D','','g'),'');
  v_id_type text;
  v_gs_type text := nullif(p_expense->>'goods_services_type','');
  v_pay_date date := nullif(p_expense->>'payment_date','')::date;
  v_pay_method text := nullif(p_expense->>'payment_method','');
  v_paid_by text := coalesce(nullif(p_expense->>'paid_by',''),'socios');
  v_foreign boolean := coalesce((p_expense->>'is_foreign')::boolean,false);
  v_services numeric(14,2) := coalesce(nullif(p_expense->>'services_amount','')::numeric,0);
  v_goods numeric(14,2) := coalesce(nullif(p_expense->>'goods_amount','')::numeric,0);
  v_net numeric(14,2);
  v_itbis numeric(14,2) := coalesce(nullif(p_expense->>'itbis_amount','')::numeric,0);
  v_itbis_ret numeric(14,2) := coalesce(nullif(p_expense->>'itbis_withheld','')::numeric,0);
  v_isr_type text := nullif(p_expense->>'isr_withholding_type','');
  v_isr_ret numeric(14,2) := coalesce(nullif(p_expense->>'isr_withheld','')::numeric,0);
  v_isc numeric(14,2) := coalesce(nullif(p_expense->>'isc_amount','')::numeric,0);
  v_other numeric(14,2) := coalesce(nullif(p_expense->>'other_taxes','')::numeric,0);
  v_tip numeric(14,2) := coalesce(nullif(p_expense->>'legal_tip','')::numeric,0);
  v_total numeric(14,2);
  v_itbis_credit numeric(14,2);
  v_itbis_cost numeric(14,2);
  v_line integer := 0;
begin
  if not public.is_gc_admin() then raise exception 'Solo un administrador puede registrar gastos'; end if;
  if v_id is null or v_date is null or v_supplier is null or v_concept is null then raise exception 'Faltan datos obligatorios'; end if;
  if exists(select 1 from public.accounting_expenses e where e.id=v_id) then return v_id; end if;
  perform public.gc_assert_open(v_date);
  if not exists(select 1 from public.accounting_accounts a where a.code=v_account and a.is_active and a.account_type in ('asset','expense','cost')) then
    raise exception 'La cuenta contable no admite este gasto'; end if;

  if v_ncf <> 'SIN NCF' and v_ncf !~ '^(B\d{10}|E\d{12})$' then raise exception 'El NCF % no tiene un formato válido (B0100000001 o E310000000001)', v_ncf; end if;
  if v_ncf_mod is not null and v_ncf_mod !~ '^(B\d{10}|E\d{12})$' then raise exception 'El NCF modificado no tiene un formato válido'; end if;
  if v_ncf <> 'SIN NCF' and exists(select 1 from public.accounting_expenses e where e.ncf=v_ncf and coalesce(e.supplier_rnc,'')=coalesce(v_rnc,'') and e.status='activa') then
    raise exception 'Ya existe una factura con el NCF % de este proveedor', v_ncf; end if;

  if v_foreign then
    if nullif(p_expense->>'foreign_country','') is null then raise exception 'Indica el país del proveedor del exterior (609)'; end if;
    if nullif(p_expense->>'foreign_service_type','') is null then raise exception 'Indica el tipo de servicio adquirido (609)'; end if;
    v_rnc := null;
  elsif v_rnc is not null then
    v_id_type := case length(v_rnc) when 9 then '1' when 11 then '2' end;
    if v_id_type is null then raise exception 'El RNC debe tener 9 dígitos o la cédula 11 dígitos'; end if;
  end if;

  if v_ncf <> 'SIN NCF' then
    if v_rnc is null then raise exception 'Una factura con NCF necesita el RNC o la cédula del proveedor'; end if;
    if v_gs_type is null then raise exception 'Selecciona el tipo de bien o servicio (606)'; end if;
    if v_pay_method is null then raise exception 'Selecciona la forma de pago (606)'; end if;
  end if;

  if v_services + v_goods = 0 then raise exception 'Indica el monto de servicios y/o de bienes'; end if;
  v_net := v_services + v_goods;
  v_total := v_net + v_itbis + v_isc + v_other + v_tip;

  if v_itbis_ret > v_itbis then raise exception 'El ITBIS retenido no puede ser mayor que el ITBIS facturado'; end if;
  if v_isr_ret > 0 and v_isr_type is null and not v_foreign then raise exception 'Selecciona el tipo de retención de ISR'; end if;
  if (v_itbis_ret > 0 or v_isr_ret > 0) and v_pay_date is null then raise exception 'Con retenciones, la fecha de pago es obligatoria'; end if;
  if v_pay_date is not null and v_pay_date < v_date then raise exception 'La fecha de pago no puede ser anterior a la fecha de la factura'; end if;

  if substr(v_ncf,1,3) in ('B01','B11','B14','B15','E31','E41','E44','E45') then
    v_itbis_credit := v_itbis; v_itbis_cost := 0;
  else
    v_itbis_credit := 0; v_itbis_cost := v_itbis;
  end if;

  insert into public.accounting_expenses(
    id,expense_date,supplier,supplier_rnc,supplier_id_type,invoice_reference,ncf,ncf_modified,concept,account_code,
    goods_services_type,services_amount,goods_amount,net_amount,itbis_amount,itbis_withheld,itbis_to_cost,
    isr_withholding_type,isr_withheld,isc_amount,other_taxes,legal_tip,total_amount,
    payment_date,payment_method,classification_note,created_by,paid_by,
    is_foreign,foreign_country,foreign_id_type,foreign_tax_id,foreign_service_type,foreign_service_detail,related_party,isr_presumed_base)
  values(
    v_id,v_date,v_supplier,v_rnc,v_id_type,nullif(trim(p_expense->>'invoice_reference'),''),v_ncf,v_ncf_mod,v_concept,v_account,
    v_gs_type,v_services,v_goods,v_net,v_itbis,v_itbis_ret,v_itbis_cost,
    v_isr_type,v_isr_ret,v_isc,v_other,v_tip,v_total,
    v_pay_date,v_pay_method,nullif(trim(p_expense->>'classification_note'),''),auth.uid(),v_paid_by,
    v_foreign,nullif(trim(p_expense->>'foreign_country'),''),nullif(p_expense->>'foreign_id_type',''),nullif(trim(p_expense->>'foreign_tax_id'),''),
    nullif(p_expense->>'foreign_service_type',''),nullif(p_expense->>'foreign_service_detail',''),coalesce((p_expense->>'related_party')::boolean,false),
    coalesce(nullif(p_expense->>'isr_presumed_base','')::numeric,0));

  insert into public.accounting_journal_entries(entry_no,entry_date,memo,source_expense_id,created_by)
  values(v_id,v_date,v_concept,v_id,auth.uid());

  v_line:=v_line+1;
  insert into public.accounting_journal_lines(entry_no,line_no,account_code,description,debit)
  values(v_id,v_line,v_account,v_concept,v_net+v_itbis_cost+v_isc+v_other+v_tip);
  if v_itbis_credit > 0 then
    v_line:=v_line+1;
    insert into public.accounting_journal_lines(entry_no,line_no,account_code,description,debit)
    values(v_id,v_line,'1120','ITBIS de factura '||v_ncf,v_itbis_credit);
  end if;
  if v_itbis_ret > 0 then
    v_line:=v_line+1;
    insert into public.accounting_journal_lines(entry_no,line_no,account_code,description,party_name,credit)
    values(v_id,v_line,'2310','ITBIS retenido a '||v_supplier,'DGII',v_itbis_ret);
  end if;
  if v_isr_ret > 0 then
    v_line:=v_line+1;
    insert into public.accounting_journal_lines(entry_no,line_no,account_code,description,party_name,credit)
    values(v_id,v_line,'2320','ISR retenido a '||v_supplier,'DGII',v_isr_ret);
  end if;

  perform public.gc_post_payer_lines(v_id, v_line, v_total - v_itbis_ret - v_isr_ret, v_paid_by, v_supplier);
  return v_id;
end;
$$;
revoke all on function public.record_accounting_expense(jsonb) from public, anon;
grant execute on function public.record_accounting_expense(jsonb) to authenticated;

-- Cambiar quién pagó un gasto ya registrado (rehace solo las líneas de pago).
create or replace function public.set_expense_payer(p jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_e public.accounting_expenses; v_paid_by text := p->>'paid_by'; v_line integer; v_amount numeric(14,2);
begin
  if not public.is_gc_admin() then raise exception 'Solo un administrador puede cambiar quién pagó'; end if;
  select * into v_e from public.accounting_expenses where id = p->>'id';
  if not found then raise exception 'Factura no encontrada'; end if;
  if v_e.status <> 'activa' then raise exception 'La factura está anulada'; end if;
  perform public.gc_assert_open(v_e.expense_date);

  insert into public.accounting_archived_rows(reason,table_name,row_data)
  select 'Cambio de "pagado por" ('||v_e.paid_by||' → '||v_paid_by||')','accounting_journal_lines',to_jsonb(l)
  from public.accounting_journal_lines l
  where l.entry_no = v_e.id and l.credit > 0 and l.account_code in ('3111','3112','3113','3114','2111','2112','2113','2114','1110','2210');

  select coalesce(sum(credit),0) into v_amount from public.accounting_journal_lines
  where entry_no = v_e.id and credit > 0 and account_code in ('3111','3112','3113','3114','2111','2112','2113','2114','1110','2210');
  delete from public.accounting_journal_lines
  where entry_no = v_e.id and credit > 0 and account_code in ('3111','3112','3113','3114','2111','2112','2113','2114','1110','2210');

  select coalesce(max(line_no),0) into v_line from public.accounting_journal_lines where entry_no = v_e.id;
  -- check constraint de la tabla valida el nuevo valor
  update public.accounting_expenses set paid_by = v_paid_by where id = v_e.id;
  perform public.gc_post_payer_lines(v_e.id, v_line, v_amount, v_paid_by, v_e.supplier);
  insert into public.accounting_audit_log(action,ref,detail) values ('cambiar_pagador',v_e.id,jsonb_build_object('antes',v_e.paid_by,'despues',v_paid_by));
end; $$;
revoke all on function public.set_expense_payer(jsonb) from public, anon;
grant execute on function public.set_expense_payer(jsonb) to authenticated;

-- Anular un gasto: asiento de reverso con fecha de anulación.
create or replace function public.void_accounting_expense(p jsonb)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_e public.accounting_expenses; v_date date := coalesce(nullif(p->>'void_date','')::date, current_date);
  v_reason text := nullif(trim(p->>'reason'),''); v_no text;
begin
  if not public.is_gc_admin() then raise exception 'Solo un administrador puede anular gastos'; end if;
  if v_reason is null then raise exception 'Indica el motivo de la anulación'; end if;
  select * into v_e from public.accounting_expenses where id = p->>'id';
  if not found then raise exception 'Factura no encontrada'; end if;
  if v_e.status = 'anulada' then raise exception 'La factura ya está anulada'; end if;
  if v_date < v_e.expense_date then raise exception 'La anulación no puede ser anterior a la factura'; end if;
  perform public.gc_assert_open(v_date);
  v_no := v_e.id || '-ANUL';
  insert into public.accounting_journal_entries(entry_no,entry_date,memo,created_by)
  values (v_no, v_date, 'Anulación: '||v_e.concept||' ('||v_reason||')', auth.uid());
  insert into public.accounting_journal_lines(entry_no,line_no,account_code,description,party_name,debit,credit)
  select v_no, l.line_no, l.account_code, 'Reverso: '||l.description, l.party_name, l.credit, l.debit
  from public.accounting_journal_lines l where l.entry_no = v_e.id;
  -- el cierre de mes protege el mes de la factura; aquí solo se marca el estado
  update public.accounting_expenses set status='anulada', voided_at=v_date, void_reason=v_reason where id = v_e.id;
  insert into public.accounting_audit_log(action,ref,detail) values ('anular_gasto',v_e.id,p);
  return v_no;
end; $$;
revoke all on function public.void_accounting_expense(jsonb) from public, anon;
grant execute on function public.void_accounting_expense(jsonb) to authenticated;

-- La anulación cambia el estado aunque el mes de la factura esté cerrado:
-- el guard de gastos permite solo ese cambio de estado.
create or replace function public.gc_guard_expenses() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and (to_jsonb(new) - array['status','voided_at','void_reason']) = (to_jsonb(old) - array['status','voided_at','void_reason']) then
    return new;
  end if;
  if tg_op in ('UPDATE','DELETE') then perform public.gc_assert_open(old.expense_date); end if;
  if tg_op in ('INSERT','UPDATE') then perform public.gc_assert_open(new.expense_date); return new; end if;
  return old;
end; $$;

-- ───────────────────────── 7. Ventas (607) y anulados (608) ─────────────────────────
create table if not exists public.accounting_sales (
  id text primary key,
  sale_date date not null,
  customer_name text not null,
  customer_id text,
  customer_id_type text check (customer_id_type is null or customer_id_type in ('1','2','3')),
  ncf text not null unique,
  ncf_modified text,
  income_type text not null default '01' check (income_type in ('01','02','03','04','05','06')),
  concept text not null,
  account_code text not null references public.accounting_accounts(code),
  net_amount numeric(14,2) not null check (net_amount >= 0),
  itbis_amount numeric(14,2) not null default 0 check (itbis_amount >= 0),
  itbis_withheld numeric(14,2) not null default 0 check (itbis_withheld >= 0),
  isr_withheld numeric(14,2) not null default 0 check (isr_withheld >= 0),
  retention_date date,
  isc_amount numeric(14,2) not null default 0,
  other_taxes numeric(14,2) not null default 0,
  legal_tip numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null,
  payment_method text not null check (payment_method in ('efectivo','transferencia','tarjeta','credito','bonos','permuta','otras')),
  status text not null default 'activa' check (status in ('activa','anulada')),
  voided_at date,
  void_reason text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  check (round(net_amount+itbis_amount+isc_amount+other_taxes+legal_tip,2) = round(total_amount,2))
);
alter table public.accounting_sales enable row level security;
revoke all on public.accounting_sales from anon;
grant select on public.accounting_sales to authenticated;

alter table public.accounting_journal_entries add column if not exists source_sale_id text references public.accounting_sales(id);

create table if not exists public.accounting_voided_ncf (
  id bigint generated always as identity primary key,
  ncf text not null unique,
  ncf_date date not null,
  void_type text not null check (void_type in ('01','02','03','04','05','06','07','08','09','10')),
  reason text,
  sale_id text references public.accounting_sales(id),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.accounting_voided_ncf enable row level security;
revoke all on public.accounting_voided_ncf from anon;
grant select on public.accounting_voided_ncf to authenticated;

create table if not exists public.accounting_sale_payments (
  id bigint generated always as identity primary key,
  sale_id text not null references public.accounting_sales(id),
  payment_date date not null,
  amount numeric(14,2) not null check (amount > 0),
  entry_no text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.accounting_sale_payments enable row level security;
revoke all on public.accounting_sale_payments from anon;
grant select on public.accounting_sale_payments to authenticated;

create or replace function public.record_accounting_sale(p jsonb)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_id text := p->>'id'; v_date date := (p->>'sale_date')::date;
  v_ncf text := upper(nullif(trim(p->>'ncf'),'')); v_ncf_mod text := upper(nullif(trim(p->>'ncf_modified'),''));
  v_cust text := nullif(trim(p->>'customer_name'),''); v_cid text := nullif(regexp_replace(coalesce(p->>'customer_id',''),'[^0-9A-Za-z]','','g'),'');
  v_ctype text := nullif(p->>'customer_id_type',''); v_concept text := nullif(trim(p->>'concept'),'');
  v_account text := coalesce(nullif(p->>'account_code',''),'4100'); v_method text := p->>'payment_method';
  v_net numeric(14,2) := coalesce(nullif(p->>'net_amount','')::numeric,0);
  v_itbis numeric(14,2) := coalesce(nullif(p->>'itbis_amount','')::numeric,0);
  v_itbis_ret numeric(14,2) := coalesce(nullif(p->>'itbis_withheld','')::numeric,0);
  v_isr_ret numeric(14,2) := coalesce(nullif(p->>'isr_withheld','')::numeric,0);
  v_isc numeric(14,2) := coalesce(nullif(p->>'isc_amount','')::numeric,0);
  v_other numeric(14,2) := coalesce(nullif(p->>'other_taxes','')::numeric,0);
  v_tip numeric(14,2) := coalesce(nullif(p->>'legal_tip','')::numeric,0);
  v_ret_date date := nullif(p->>'retention_date','')::date;
  v_total numeric(14,2); v_receive numeric(14,2); v_line integer := 0;
begin
  if not public.is_gc_admin() then raise exception 'Solo un administrador puede registrar ventas'; end if;
  if v_id is null or v_date is null or v_cust is null or v_concept is null or v_ncf is null then raise exception 'Faltan datos obligatorios'; end if;
  if exists(select 1 from public.accounting_sales s where s.id=v_id) then return v_id; end if;
  perform public.gc_assert_open(v_date);
  if v_ncf !~ '^(B\d{10}|E\d{12})$' then raise exception 'El e-NCF % no tiene un formato válido (ej. E310000000001)', v_ncf; end if;
  if v_ncf_mod is not null and v_ncf_mod !~ '^(B\d{10}|E\d{12})$' then raise exception 'El NCF modificado no tiene un formato válido'; end if;
  if exists(select 1 from public.accounting_sales s where s.ncf=v_ncf) then raise exception 'Ya existe una venta con el NCF %', v_ncf; end if;
  if not exists(select 1 from public.accounting_accounts a where a.code=v_account and a.is_active and a.account_type='income') then raise exception 'La cuenta de ingreso no es válida'; end if;
  if v_method not in ('efectivo','transferencia','tarjeta','credito','bonos','permuta','otras') then raise exception 'Selecciona la forma de cobro'; end if;
  if v_cid is not null and v_ctype is null then v_ctype := case length(v_cid) when 9 then '1' when 11 then '2' else '3' end; end if;
  if substr(v_ncf,1,3) in ('B01','E31') and v_cid is null then raise exception 'Un comprobante de crédito fiscal necesita el RNC o la cédula del cliente'; end if;
  if v_net <= 0 then raise exception 'Indica el monto facturado'; end if;
  if v_itbis_ret > v_itbis then raise exception 'El ITBIS retenido no puede ser mayor que el ITBIS facturado'; end if;
  if (v_itbis_ret > 0 or v_isr_ret > 0) and v_ret_date is null then raise exception 'Con retenciones del cliente, indica la fecha de retención'; end if;
  v_total := v_net + v_itbis + v_isc + v_other + v_tip;
  v_receive := v_total - v_itbis_ret - v_isr_ret;

  insert into public.accounting_sales(id,sale_date,customer_name,customer_id,customer_id_type,ncf,ncf_modified,income_type,concept,account_code,
    net_amount,itbis_amount,itbis_withheld,isr_withheld,retention_date,isc_amount,other_taxes,legal_tip,total_amount,payment_method)
  values (v_id,v_date,v_cust,v_cid,v_ctype,v_ncf,v_ncf_mod,coalesce(nullif(p->>'income_type',''),'01'),v_concept,v_account,
    v_net,v_itbis,v_itbis_ret,v_isr_ret,v_ret_date,v_isc,v_other,v_tip,v_total,v_method);

  insert into public.accounting_journal_entries(entry_no,entry_date,memo,source_sale_id,created_by)
  values (v_id, v_date, 'Venta '||v_ncf||' · '||v_concept, v_id, auth.uid());

  v_line := v_line + 1;
  insert into public.accounting_journal_lines(entry_no,line_no,account_code,description,party_name,debit)
  values (v_id, v_line, case when v_method='credito' then '1140' else '1110' end,
          case when v_method='credito' then 'Venta a crédito' else 'Cobro de venta' end, v_cust, v_receive);
  if v_itbis_ret > 0 then
    v_line := v_line + 1;
    insert into public.accounting_journal_lines(entry_no,line_no,account_code,description,party_name,debit)
    values (v_id, v_line, '1150', 'ITBIS retenido por el cliente', v_cust, v_itbis_ret);
  end if;
  if v_isr_ret > 0 then
    v_line := v_line + 1;
    insert into public.accounting_journal_lines(entry_no,line_no,account_code,description,party_name,debit)
    values (v_id, v_line, '1160', 'ISR retenido por el cliente', v_cust, v_isr_ret);
  end if;
  v_line := v_line + 1;
  insert into public.accounting_journal_lines(entry_no,line_no,account_code,description,party_name,credit)
  values (v_id, v_line, v_account, v_concept, v_cust, v_net);
  if v_itbis > 0 then
    v_line := v_line + 1;
    insert into public.accounting_journal_lines(entry_no,line_no,account_code,description,party_name,credit)
    values (v_id, v_line, '2330', 'ITBIS facturado '||v_ncf, 'DGII', v_itbis);
  end if;
  if v_isc + v_other + v_tip > 0 then
    v_line := v_line + 1;
    insert into public.accounting_journal_lines(entry_no,line_no,account_code,description,party_name,credit)
    values (v_id, v_line, '2350', 'Otros impuestos y propina '||v_ncf, null, v_isc + v_other + v_tip);
  end if;
  return v_id;
end; $$;
revoke all on function public.record_accounting_sale(jsonb) from public, anon;
grant execute on function public.record_accounting_sale(jsonb) to authenticated;

create or replace function public.record_sale_payment(p jsonb)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_s public.accounting_sales; v_date date := (p->>'payment_date')::date; v_amount numeric(14,2) := (p->>'amount')::numeric;
  v_paid numeric(14,2); v_pending numeric(14,2); v_no text;
begin
  if not public.is_gc_admin() then raise exception 'Solo un administrador puede registrar cobros'; end if;
  select * into v_s from public.accounting_sales where id = p->>'sale_id';
  if not found then raise exception 'Venta no encontrada'; end if;
  if v_s.status <> 'activa' then raise exception 'La venta está anulada'; end if;
  if v_s.payment_method <> 'credito' then raise exception 'Esta venta ya se cobró al facturar'; end if;
  if v_date is null or v_date < v_s.sale_date then raise exception 'Revisa la fecha del cobro'; end if;
  perform public.gc_assert_open(v_date);
  select coalesce(sum(amount),0) into v_paid from public.accounting_sale_payments where sale_id = v_s.id;
  v_pending := v_s.total_amount - v_s.itbis_withheld - v_s.isr_withheld - v_paid;
  if v_amount is null or v_amount <= 0 or v_amount > v_pending then raise exception 'El cobro debe ser mayor que 0 y no pasar del saldo pendiente (%)', v_pending; end if;
  v_no := v_s.id || '-C' || to_char(clock_timestamp(),'YYMMDDHH24MISSMS');
  insert into public.accounting_journal_entries(entry_no,entry_date,memo,created_by) values (v_no, v_date, 'Cobro de '||v_s.ncf, auth.uid());
  insert into public.accounting_journal_lines(entry_no,line_no,account_code,description,party_name,debit) values (v_no,1,'1110','Cobro de '||v_s.ncf,v_s.customer_name,v_amount);
  insert into public.accounting_journal_lines(entry_no,line_no,account_code,description,party_name,credit) values (v_no,2,'1140','Cobro de '||v_s.ncf,v_s.customer_name,v_amount);
  insert into public.accounting_sale_payments(sale_id,payment_date,amount,entry_no) values (v_s.id,v_date,v_amount,v_no);
  return v_no;
end; $$;
revoke all on function public.record_sale_payment(jsonb) from public, anon;
grant execute on function public.record_sale_payment(jsonb) to authenticated;

create or replace function public.void_accounting_sale(p jsonb)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_s public.accounting_sales; v_date date := coalesce(nullif(p->>'void_date','')::date, current_date);
  v_reason text := nullif(trim(p->>'reason'),''); v_type text := coalesce(nullif(p->>'void_type',''),'04'); v_no text;
begin
  if not public.is_gc_admin() then raise exception 'Solo un administrador puede anular ventas'; end if;
  if v_reason is null then raise exception 'Indica el motivo de la anulación'; end if;
  select * into v_s from public.accounting_sales where id = p->>'id';
  if not found then raise exception 'Venta no encontrada'; end if;
  if v_s.status = 'anulada' then raise exception 'La venta ya está anulada'; end if;
  if exists(select 1 from public.accounting_sale_payments where sale_id = v_s.id) then raise exception 'La venta tiene cobros registrados; anúlala con una nota de crédito'; end if;
  perform public.gc_assert_open(v_date);
  v_no := v_s.id || '-ANUL';
  insert into public.accounting_journal_entries(entry_no,entry_date,memo,created_by) values (v_no, v_date, 'Anulación venta '||v_s.ncf||' ('||v_reason||')', auth.uid());
  insert into public.accounting_journal_lines(entry_no,line_no,account_code,description,party_name,debit,credit)
  select v_no, l.line_no, l.account_code, 'Reverso: '||l.description, l.party_name, l.credit, l.debit
  from public.accounting_journal_lines l where l.entry_no = v_s.id;
  update public.accounting_sales set status='anulada', voided_at=v_date, void_reason=v_reason where id = v_s.id;
  insert into public.accounting_voided_ncf(ncf,ncf_date,void_type,reason,sale_id) values (v_s.ncf, v_s.sale_date, v_type, v_reason, v_s.id)
  on conflict (ncf) do nothing;
  insert into public.accounting_audit_log(action,ref,detail) values ('anular_venta',v_s.id,p);
  return v_no;
end; $$;
revoke all on function public.void_accounting_sale(jsonb) from public, anon;
grant execute on function public.void_accounting_sale(jsonb) to authenticated;

-- Para anular un comprobante que no está en ventas (ej. secuencia dañada).
create or replace function public.record_voided_ncf(p jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_ncf text := upper(nullif(trim(p->>'ncf'),''));
begin
  if not public.is_gc_admin() then raise exception 'Solo un administrador puede registrar anulados'; end if;
  if v_ncf is null or v_ncf !~ '^(B\d{10}|E\d{12})$' then raise exception 'NCF inválido'; end if;
  if exists(select 1 from public.accounting_sales s where s.ncf=v_ncf and s.status='activa') then raise exception 'Ese NCF está en una venta activa: anula la venta'; end if;
  insert into public.accounting_voided_ncf(ncf,ncf_date,void_type,reason) values (v_ncf,(p->>'ncf_date')::date,p->>'void_type',nullif(p->>'reason',''));
  insert into public.accounting_audit_log(action,ref,detail) values ('registrar_anulado',v_ncf,p);
end; $$;
revoke all on function public.record_voided_ncf(jsonb) from public, anon;
grant execute on function public.record_voided_ncf(jsonb) to authenticated;

create or replace function public.gc_guard_sales() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and (to_jsonb(new) - array['status','voided_at','void_reason']) = (to_jsonb(old) - array['status','voided_at','void_reason']) then
    return new;
  end if;
  if tg_op in ('UPDATE','DELETE') then perform public.gc_assert_open(old.sale_date); end if;
  if tg_op in ('INSERT','UPDATE') then perform public.gc_assert_open(new.sale_date); return new; end if;
  return old;
end; $$;
drop trigger if exists gc_guard_sales on public.accounting_sales;
create trigger gc_guard_sales before insert or update or delete on public.accounting_sales
  for each row execute function public.gc_guard_sales();

-- ───────────────────────── 8. Amortización ─────────────────────────
create table if not exists public.accounting_amortizations (
  id text primary key,
  description text not null,
  asset_account text not null references public.accounting_accounts(code),
  expense_account text not null references public.accounting_accounts(code),
  total numeric(14,2) not null check (total > 0),
  months integer not null check (months > 0),
  start_month date not null check (extract(day from start_month) = 1),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.accounting_amortizations enable row level security;
revoke all on public.accounting_amortizations from anon;
grant select on public.accounting_amortizations to authenticated;

insert into public.accounting_amortizations(id,description,asset_account,expense_account,total,months,start_month) values
('DOMINIO-2026','Dominio web gclogis (PUCMM, 12 meses)','1130','6105',800,12,'2026-09-01'),
('ONAPI-2026','Registro de nombre comercial ONAPI (10 años)','1220','6106',4755,120,'2026-08-01')
on conflict (id) do nothing;

-- Registra la amortización del mes (AAAA-MM). Es idempotente: no duplica.
create or replace function public.post_amortizations(p jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_month date := to_date(p->>'period'||'-01','YYYY-MM-DD'); v_end date; v_a record; v_idx integer; v_amount numeric(14,2);
  v_done numeric(14,2); v_no text; v_count integer := 0;
begin
  if not public.is_gc_admin() then raise exception 'Solo un administrador puede registrar amortizaciones'; end if;
  v_end := (v_month + interval '1 month - 1 day')::date;
  perform public.gc_assert_open(v_end);
  for v_a in select * from public.accounting_amortizations where is_active loop
    v_idx := (extract(year from v_month)*12 + extract(month from v_month)) - (extract(year from v_a.start_month)*12 + extract(month from v_a.start_month));
    continue when v_idx < 0 or v_idx >= v_a.months;
    v_no := 'AM-'||v_a.id||'-'||to_char(v_month,'YYYYMM');
    continue when exists(select 1 from public.accounting_journal_entries where entry_no = v_no);
    if v_idx = v_a.months - 1 then
      select coalesce(sum(l.debit),0) into v_done from public.accounting_journal_lines l
      where l.entry_no like 'AM-'||v_a.id||'-%' and l.account_code = v_a.expense_account;
      v_amount := v_a.total - v_done;
    else
      v_amount := round(v_a.total / v_a.months, 2);
    end if;
    continue when v_amount <= 0;
    insert into public.accounting_journal_entries(entry_no,entry_date,memo,created_by)
    values (v_no, v_end, 'Amortización '||to_char(v_month,'MM/YYYY')||' · '||v_a.description, auth.uid());
    insert into public.accounting_journal_lines(entry_no,line_no,account_code,description,debit) values (v_no,1,v_a.expense_account,v_a.description,v_amount);
    insert into public.accounting_journal_lines(entry_no,line_no,account_code,description,credit) values (v_no,2,v_a.asset_account,v_a.description,v_amount);
    v_count := v_count + 1;
  end loop;
  return v_count;
end; $$;
revoke all on function public.post_amortizations(jsonb) from public, anon;
grant execute on function public.post_amortizations(jsonb) to authenticated;

-- ───────────────────────── 9. Lectura: solo socios y administradores ─────────────────────────
do $$
declare t text;
begin
  foreach t in array array['accounting_accounts','accounting_investors','accounting_expenses','accounting_journal_entries',
    'accounting_journal_lines','accounting_sales','accounting_voided_ncf','accounting_sale_payments','accounting_amortizations',
    'accounting_closed_periods','accounting_audit_log','accounting_expense_files']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "Authenticated users can read %s" on public.%I', replace(t,'accounting_',''), t);
    execute format('drop policy if exists "Partners can read %s" on public.%I', t, t);
    execute format('create policy "Partners can read %s" on public.%I for select to authenticated using ((select public.is_gc_accountant()))', t, t);
  end loop;
end $$;
-- políticas antiguas con otros nombres
drop policy if exists "Authenticated users can read accounting accounts" on public.accounting_accounts;
drop policy if exists "Authenticated users can read accounting investors" on public.accounting_investors;
drop policy if exists "Authenticated users can read accounting expenses" on public.accounting_expenses;
drop policy if exists "Authenticated users can read accounting entries" on public.accounting_journal_entries;
drop policy if exists "Authenticated users can read accounting lines" on public.accounting_journal_lines;
drop policy if exists "Admins can read expense files" on public.accounting_expense_files;

drop policy if exists "Admins can read invoice files" on storage.objects;
drop policy if exists "Partners can read invoice files" on storage.objects;
create policy "Partners can read invoice files" on storage.objects
  for select to authenticated using (bucket_id = 'facturas' and (select public.is_gc_accountant()));

-- Nadie escribe directo en las tablas: todo pasa por las funciones de arriba.
revoke insert, update, delete on public.accounting_accounts, public.accounting_investors, public.accounting_expenses,
  public.accounting_journal_entries, public.accounting_journal_lines from authenticated;

commit;
