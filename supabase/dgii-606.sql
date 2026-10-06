-- GC Logis: campos del Formato 606 (compras de bienes y servicios) de la DGII.
-- Correr en Supabase > SQL Editor DESPUÉS de setup.sql y accounting.sql.
-- Es seguro correrlo más de una vez.

-- 1. Cuentas para impuestos y retenciones por pagar.
insert into public.accounting_accounts(code,name,account_type,nature,parent_code) values
('2300','Impuestos y retenciones por pagar','group','credit','2000'),
('2310','ITBIS retenido por pagar','liability','credit','2300'),
('2320','ISR retenido por pagar','liability','credit','2300')
on conflict (code) do nothing;

-- 2. Nuevas columnas del 606.
alter table public.accounting_expenses
  add column if not exists supplier_id_type text,          -- 1 = RNC, 2 = Cédula
  add column if not exists goods_services_type text,       -- 01 a 11
  add column if not exists services_amount numeric(14,2) not null default 0,
  add column if not exists goods_amount numeric(14,2) not null default 0,
  add column if not exists ncf_modified text,
  add column if not exists payment_date date,
  add column if not exists payment_method text,            -- 01 a 07
  add column if not exists itbis_withheld numeric(14,2) not null default 0,
  add column if not exists itbis_to_cost numeric(14,2) not null default 0,
  add column if not exists isr_withholding_type text,      -- 01 a 08
  add column if not exists isr_withheld numeric(14,2) not null default 0,
  add column if not exists isc_amount numeric(14,2) not null default 0,
  add column if not exists other_taxes numeric(14,2) not null default 0,
  add column if not exists legal_tip numeric(14,2) not null default 0;

-- Facturas ya registradas: deducir el tipo de identificación por el largo del RNC/cédula.
update public.accounting_expenses
set supplier_id_type = case length(regexp_replace(coalesce(supplier_rnc,''),'\D','','g')) when 9 then '1' when 11 then '2' end
where supplier_id_type is null and supplier_rnc is not null;

-- 3. Reglas de validación.
alter table public.accounting_expenses drop constraint if exists accounting_expenses_check;
alter table public.accounting_expenses drop constraint if exists accounting_expenses_total_check;
alter table public.accounting_expenses add constraint accounting_expenses_total_check
  check (round(net_amount + itbis_amount + isc_amount + other_taxes + legal_tip,2) = round(total_amount,2));

alter table public.accounting_expenses drop constraint if exists accounting_expenses_606_codes_check;
alter table public.accounting_expenses add constraint accounting_expenses_606_codes_check check (
  (supplier_id_type is null or supplier_id_type in ('1','2')) and
  (goods_services_type is null or goods_services_type in ('01','02','03','04','05','06','07','08','09','10','11')) and
  (payment_method is null or payment_method in ('01','02','03','04','05','06','07')) and
  (isr_withholding_type is null or isr_withholding_type in ('01','02','03','04','05','06','07','08'))
);

alter table public.accounting_expenses drop constraint if exists accounting_expenses_606_amounts_check;
alter table public.accounting_expenses add constraint accounting_expenses_606_amounts_check check (
  services_amount >= 0 and goods_amount >= 0 and itbis_withheld >= 0 and itbis_to_cost >= 0 and
  isr_withheld >= 0 and isc_amount >= 0 and other_taxes >= 0 and legal_tip >= 0 and
  itbis_withheld <= itbis_amount and itbis_to_cost <= itbis_amount and
  -- facturas viejas tienen servicios y bienes en 0; las nuevas deben sumar el subtotal
  (services_amount + goods_amount = 0 or round(services_amount + goods_amount,2) = round(net_amount,2))
);

-- 4. Registro de gastos con los campos del 606.
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
  v_to_investors numeric(14,2);
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
  if exists(select 1 from public.accounting_expenses e where e.id=v_id) then return v_id; end if;
  if not exists(select 1 from public.accounting_accounts a where a.code=v_account and a.account_type in ('asset','expense')) then raise exception 'La cuenta contable no admite este gasto'; end if;

  -- NCF: B + 10 dígitos o e-CF E + 12 dígitos
  if v_ncf <> 'SIN NCF' and v_ncf !~ '^(B\d{10}|E\d{12})$' then raise exception 'El NCF % no tiene un formato válido (B0100000001 o E310000000001)', v_ncf; end if;
  if v_ncf_mod is not null and v_ncf_mod !~ '^(B\d{10}|E\d{12})$' then raise exception 'El NCF modificado no tiene un formato válido'; end if;

  -- RNC (9 dígitos) o cédula (11 dígitos)
  if v_rnc is not null then
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
  if v_isr_ret > 0 and v_isr_type is null then raise exception 'Selecciona el tipo de retención de ISR'; end if;
  if (v_itbis_ret > 0 or v_isr_ret > 0) and v_pay_date is null then raise exception 'Con retenciones, la fecha de pago es obligatoria'; end if;
  if v_pay_date is not null and v_pay_date < v_date then raise exception 'La fecha de pago no puede ser anterior a la fecha de la factura'; end if;

  -- El ITBIS solo es crédito fiscal con comprobante válido para crédito.
  -- Sin NCF o con comprobantes de consumo, el ITBIS se lleva al costo del gasto.
  if substr(v_ncf,1,3) in ('B01','B11','B14','B15','E31','E41','E44','E45') then
    v_itbis_credit := v_itbis; v_itbis_cost := 0;
  else
    v_itbis_credit := 0; v_itbis_cost := v_itbis;
  end if;

  select count(*) into v_count from public.accounting_investors i where i.is_active;
  if v_count <> 4 then raise exception 'Configura los cuatro auxiliares de inversionistas antes de registrar'; end if;

  insert into public.accounting_expenses(
    id,expense_date,supplier,supplier_rnc,supplier_id_type,invoice_reference,ncf,ncf_modified,concept,account_code,
    goods_services_type,services_amount,goods_amount,net_amount,itbis_amount,itbis_withheld,itbis_to_cost,
    isr_withholding_type,isr_withheld,isc_amount,other_taxes,legal_tip,total_amount,
    payment_date,payment_method,classification_note,created_by)
  values(
    v_id,v_date,v_supplier,v_rnc,v_id_type,nullif(trim(p_expense->>'invoice_reference'),''),v_ncf,v_ncf_mod,v_concept,v_account,
    v_gs_type,v_services,v_goods,v_net,v_itbis,v_itbis_ret,v_itbis_cost,
    v_isr_type,v_isr_ret,v_isc,v_other,v_tip,v_total,
    v_pay_date,v_pay_method,nullif(trim(p_expense->>'classification_note'),''),auth.uid());

  insert into public.accounting_journal_entries(entry_no,entry_date,memo,source_expense_id,created_by)
  values(v_id,v_date,v_concept,v_id,auth.uid());

  -- Débito: gasto (incluye ITBIS no deducible, ISC, otros impuestos y propina)
  v_line:=v_line+1;
  insert into public.accounting_journal_lines(entry_no,line_no,account_code,description,debit)
  values(v_id,v_line,v_account,v_concept,v_net+v_itbis_cost+v_isc+v_other+v_tip);
  if v_itbis_credit > 0 then
    v_line:=v_line+1;
    insert into public.accounting_journal_lines(entry_no,line_no,account_code,description,debit)
    values(v_id,v_line,'1120','ITBIS de factura '||v_ncf,v_itbis_credit);
  end if;

  -- Crédito: retenciones que GC debe pagar a la DGII
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

  -- Crédito: lo que pagaron los inversionistas, repartido entre los cuatro
  v_to_investors := v_total - v_itbis_ret - v_isr_ret;
  v_cents:=round(v_to_investors*100)::integer;
  v_each:=v_cents / v_count;
  v_remainder:=mod(v_cents,v_count);
  for v_investor in select i.account_code,i.display_name from public.accounting_investors i where i.is_active order by i.account_code loop
    v_index:=v_index+1;
    v_credit:=(v_each+case when v_index<=v_remainder then 1 else 0 end)::numeric/100;
    if v_credit > 0 then
      v_line:=v_line+1;
      insert into public.accounting_journal_lines(entry_no,line_no,account_code,description,party_name,credit)
      values(v_id,v_line,v_investor.account_code,'Préstamo de inversionista por gastos cubiertos',v_investor.display_name,v_credit);
    end if;
  end loop;
  return v_id;
end;
$$;

revoke all on function public.record_accounting_expense(jsonb) from public, anon;
grant execute on function public.record_accounting_expense(jsonb) to authenticated;

-- 5. Completar los datos 606 de facturas ya registradas (no cambia montos ni asientos).
create or replace function public.update_expense_606(p jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_rnc text := nullif(regexp_replace(coalesce(p->>'supplier_rnc',''),'\D','','g'),'');
  v_e public.accounting_expenses;
  v_services numeric(14,2) := coalesce(nullif(p->>'services_amount','')::numeric,0);
  v_goods numeric(14,2) := coalesce(nullif(p->>'goods_amount','')::numeric,0);
begin
  if not public.is_gc_admin() then raise exception 'Solo un administrador puede editar facturas'; end if;
  select * into v_e from public.accounting_expenses where id = p->>'id';
  if not found then raise exception 'Factura no encontrada'; end if;
  if v_rnc is not null and length(v_rnc) not in (9,11) then raise exception 'El RNC debe tener 9 dígitos o la cédula 11 dígitos'; end if;
  if v_services + v_goods > 0 and round(v_services+v_goods,2) <> round(v_e.net_amount,2) then
    raise exception 'Servicios + bienes debe ser igual al subtotal (%)', v_e.net_amount; end if;
  if v_services + v_goods = 0 then v_services := v_e.services_amount; v_goods := v_e.goods_amount; end if;
  update public.accounting_expenses set
    supplier_rnc = coalesce(v_rnc, supplier_rnc),
    supplier_id_type = case length(coalesce(v_rnc, supplier_rnc)) when 9 then '1' when 11 then '2' else supplier_id_type end,
    goods_services_type = coalesce(nullif(p->>'goods_services_type',''), goods_services_type),
    services_amount = v_services,
    goods_amount = v_goods,
    payment_date = coalesce(nullif(p->>'payment_date','')::date, payment_date),
    payment_method = coalesce(nullif(p->>'payment_method',''), payment_method)
  where id = v_e.id;
end;
$$;

revoke all on function public.update_expense_606(jsonb) from public, anon;
grant execute on function public.update_expense_606(jsonb) to authenticated;
