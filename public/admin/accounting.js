(() => {
  const money = (n) => new Intl.NumberFormat('es-DO',{style:'currency',currency:'DOP',minimumFractionDigits:2}).format(Number(n||0));
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const date = (v) => v ? new Date(String(v).slice(0,10)+'T12:00:00').toLocaleDateString('es-DO') : '—';
  const today = () => { const d=new Date(); return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10); };
  const N = (v) => Math.round(Number(v||0)*100)/100;
  const views = {overview:'Balance general',transactions:'Gastos y facturas',sales:'Ventas',journal:'Libro diario',accounts:'Plan de cuentas',auxiliary:'Aportes y saldos',reports:'Reportes DGII',closing:'Cierre de mes'};
  const SUBNAV = [['overview','Balance general'],['transactions','Gastos y facturas'],['sales','Ventas'],['reports','Reportes DGII'],['closing','Cierre de mes'],['journal','Libro diario'],['auxiliary','Aportes y saldos'],['accounts','Plan de cuentas']];
  const PRIMARY_FOR = {overview:'overview',transactions:'transactions',sales:'receivables',auxiliary:'payables',reports:'reports',closing:'reports',journal:'overview',accounts:'overview'};
  const VIEW_FOR_PRIMARY = {overview:'overview',transactions:'transactions',receivables:'sales',payables:'auxiliary',reports:'reports'};
  let records = {accounts:[],investors:[],expenses:[],entries:[],lines:[],files:[],sales:[],voided:[],salePayments:[],amortizations:[],closed:[],audit:[]};
  let started=false, loadPromise=null, current='overview', isAdmin=false;
  const client = () => window.gcSupabase;

  const GS_TYPES=[['01','Gastos de personal'],['02','Trabajos, suministros y servicios'],['03','Arrendamientos'],['04','Gastos de activos fijos'],['05','Gastos de representación'],['06','Otras deducciones admitidas'],['07','Gastos financieros'],['08','Gastos extraordinarios'],['09','Compras para costo de venta'],['10','Adquisiciones de activos'],['11','Gastos de seguros']];
  const PAY_METHODS=[['01','Efectivo'],['02','Cheque / transferencia / depósito'],['03','Tarjeta de crédito o débito'],['04','Compra a crédito'],['05','Permuta'],['06','Nota de crédito'],['07','Mixto']];
  const ISR_TYPES=[['01','Alquileres'],['02','Honorarios por servicios'],['03','Otras rentas'],['04','Otras rentas (presuntas)'],['05','Intereses a personas jurídicas'],['06','Intereses a personas físicas'],['07','Proveedores del Estado'],['08','Juegos telefónicos']];
  const INCOME_TYPES=[['01','Ingresos por operaciones (no financieros)'],['02','Ingresos financieros'],['03','Ingresos extraordinarios'],['04','Ingresos por arrendamientos'],['05','Venta de activo depreciable'],['06','Otros ingresos']];
  const SALE_METHODS=[['efectivo','Efectivo'],['transferencia','Cheque / transferencia / depósito'],['tarjeta','Tarjeta de débito o crédito'],['credito','Venta a crédito'],['bonos','Bonos o certificados de regalo'],['permuta','Permuta'],['otras','Otras formas de venta']];
  const VOID_TYPES=[['01','Deterioro de factura preimpresa'],['02','Errores de impresión (factura preimpresa)'],['03','Impresión defectuosa'],['04','Corrección de la información'],['05','Cambio de productos'],['06','Devolución de productos'],['07','Omisión de productos'],['08','Errores en secuencia de NCF'],['09','Por cese de operaciones'],['10','Pérdida o hurto de talonarios']];
  const FOREIGN_TYPES={
    'Gastos de personal':['Sueldos y salarios','Otros gastos de personal'],
    'Gastos por trabajos, suministros y servicios':['Honorarios por servicios profesionales (Personas Morales)','Honorarios por servicios profesionales (Personas Físicas)','Seguridad, mensajería, transporte y otros servicios (Personas Físicas)','Seguridad, mensajería, transporte y otros servicios (Personas Morales)'],
    'Arrendamientos':['De inmuebles (a Personas Físicas)','De inmuebles (a Personas Morales)','Otros arrendamientos'],
    'Gastos de activos fijos':['Reparación','Mantenimiento'],
    'Gastos de representación':['Relaciones públicas','Publicidad','Promociones','Otros gastos de representación'],
    'Gastos financieros':['Por préstamos con bancos','Por préstamos con financieras','Por préstamos con personas físicas','Por préstamos con organismos internacionales','Otros gastos financieros'],
    'Gastos de seguros':['Gastos de seguros'],
    'Gastos por regalías y otros intangibles':['Cesión / uso marca','Transferencia de know-how','Cesión / uso de patente','Otras regalías']
  };
  const opts=(list,empty,selected)=>(empty!=null?'<option value="">'+empty+'</option>':'')+list.map(([c,n])=>'<option value="'+esc(c)+'"'+(String(selected)===String(c)?' selected':'')+'>'+(c.length<=2?c+' — ':'')+esc(n)+'</option>').join('');
  const label=(list,c)=>{const x=list.find(i=>i[0]===c);return x?x[1]:''};
  const smallBtn='style="margin-top:6px;padding:4px 10px;font-size:12px"';

  // ───────── Socios y "pagado por"
  const partners=()=>records.investors.filter(i=>i.is_active).sort((a,b)=>a.account_code.localeCompare(b.account_code));
  const partnerName=(code)=>{const p=records.investors.find(i=>i.account_code===code);return p?(p.short_name||p.display_name):code};
  const payerOptions=()=>[['socios','Los 4 socios por partes iguales']].concat(partners().map(p=>[p.account_code,p.display_name])).concat([['empresa','La empresa (caja o banco)'],['pendiente','Pendiente de pago al proveedor']]);
  const payerLabel=(v)=>v==='socios'?'4 socios por igual':v==='empresa'?'La empresa':v==='pendiente'?'Pendiente de pago':partnerName(v);

  // ───────── Saldos
  function amountByAccount(lines){
    const sums={};
    (lines||records.lines).forEach(l=>{const x=sums[l.account_code]||(sums[l.account_code]={debit:0,credit:0});x.debit+=Number(l.debit||0);x.credit+=Number(l.credit||0)});
    return sums;
  }
  function balance(account,sums){const v=sums[account.code]||{debit:0,credit:0};return account.nature==='credit'?v.credit-v.debit:v.debit-v.credit}
  const detailAccounts=()=>records.accounts.filter(a=>a.account_type!=='group');
  const monthOf=(d)=>String(d||'').slice(0,7);
  const isClosed=(d)=>records.closed.some(c=>c.period===monthOf(d));

  function renderBalance(){
    const sums=amountByAccount(), rows=detailAccounts().map(a=>({account:a,value:balance(a,sums)})).filter(x=>x.account.is_active||Math.abs(x.value)>.004);
    const sumType=(t)=>rows.filter(x=>x.account.account_type===t).reduce((s,x)=>s+x.value,0);
    const assets=sumType('asset'),liabilities=sumType('liability'),equity=sumType('equity'),income=sumType('income');
    const costs=rows.filter(x=>['cost','expense'].includes(x.account.account_type)).reduce((s,x)=>s+x.value,0);
    const result=income-costs, equityTotal=equity+result;
    const groups=[['Activos',rows.filter(x=>x.account.account_type==='asset')],['Pasivos',rows.filter(x=>x.account.account_type==='liability')],['Patrimonio',rows.filter(x=>x.account.account_type==='equity')]];
    const body=groups.map(([g,items])=>'<tr><th colspan="2">'+g+'</th><th class="accounting-right">'+money(items.reduce((s,x)=>s+x.value,0))+'</th></tr>'+items.filter(x=>Math.abs(x.value)>.004).map(x=>'<tr><td>'+esc(x.account.code)+'</td><td>'+esc(x.account.name)+'</td><td class="accounting-right">'+money(x.value)+'</td></tr>').join('')).join('');
    return '<div class="accounting-view"><section class="accounting-cards">'+
      card('Activos',money(assets),'Lo que tiene la empresa')+
      card('Aportes de socios',money(equity),'Patrimonio aportado por los socios')+
      card('Resultado',money(result),income?'Ingresos '+money(income)+' − gastos '+money(costs):'Gastos acumulados '+money(costs))+
      card('Pasivos',money(liabilities),'Lo que la empresa debe')+
      '</section><section class="accounting-panel"><div class="accounting-toolbar"><div><h2>Balance general</h2><p>Activos = pasivos + patrimonio. Montos en pesos dominicanos.</p></div><button class="outline-btn" data-accounting-open="accounts">Plan de cuentas</button></div><div class="table-wrap"><table class="accounting-table"><thead><tr><th>Código</th><th>Cuenta</th><th class="accounting-right">Saldo</th></tr></thead><tbody>'+body+
      '<tr><th colspan="2">Resultado acumulado del ejercicio</th><th class="accounting-right">'+money(result)+'</th></tr><tr><th colspan="2">Total pasivos y patrimonio</th><th class="accounting-right">'+money(liabilities+equityTotal)+'</th></tr></tbody></table></div></section>'+
      '<section class="accounting-panel"><div class="accounting-toolbar"><div><h2>Movimientos recientes</h2><p>Últimos gastos registrados</p></div><button class="outline-btn" data-accounting-open="transactions">Ver gastos</button></div>'+recentExpenses()+'</section></div>';
  }
  function card(l,v,n){return '<article class="accounting-card"><small>'+l+'</small><strong>'+v+'</strong><small>'+esc(n)+'</small></article>'}
  function recentExpenses(){
    const rows=records.expenses.filter(e=>e.status!=='anulada').sort((a,b)=>b.expense_date.localeCompare(a.expense_date)).slice(0,5);
    if(!rows.length)return '<div class="accounting-status">Aún no hay gastos registrados.</div>';
    return '<div class="table-wrap"><table class="accounting-table"><thead><tr><th>Fecha</th><th>Proveedor</th><th>Concepto</th><th>NCF</th><th>Pagó</th><th class="accounting-right">Total</th></tr></thead><tbody>'+rows.map(e=>'<tr><td>'+date(e.expense_date)+'</td><td>'+esc(e.supplier)+'</td><td>'+esc(e.concept)+'</td><td>'+esc(e.ncf)+'</td><td>'+esc(payerLabel(e.paid_by))+'</td><td class="accounting-right">'+money(e.total_amount)+'</td></tr>').join('')+'</tbody></table></div>';
  }

  // ───────── Gastos
  function expenseTag(e){
    if(e.status==='anulada')return ' · <b style="color:var(--red)">anulada '+date(e.voided_at)+'</b>';
    if(e.is_foreign)return ' · 609 ('+esc(e.foreign_country||'')+')';
    if(e.goods_services_type)return ' · 606: '+esc(e.goods_services_type+' '+label(GS_TYPES,e.goods_services_type));
    return e.ncf&&e.ncf!=='SIN NCF'?' · <b style="color:var(--red)">falta tipo 606</b>':' · no va al 606';
  }
  function renderExpenses(){
    const data=records.expenses.slice().sort((a,b)=>b.expense_date.localeCompare(a.expense_date));
    const rows=data.map(e=>{
      const off=e.status==='anulada', locked=isClosed(e.expense_date);
      const actions=off?'':(filesButton(e)+(needs606(e)&&!locked?'<br><button class="outline-btn" '+smallBtn+' data-complete-606="'+esc(e.id)+'">Completar 606</button>':'')+(isAdmin&&!locked?'<br><button class="outline-btn" '+smallBtn+' data-payer="'+esc(e.id)+'">Cambiar quién pagó</button>':'')+(isAdmin?'<br><button class="outline-btn" '+smallBtn+' data-void-expense="'+esc(e.id)+'">Anular</button>':''));
      return '<tr'+(off?' style="opacity:.55"':'')+'><td>'+date(e.expense_date)+(locked?'<br><span class="accounting-badge">mes cerrado</span>':'')+'</td><td>'+esc(e.supplier)+'<br><small>'+esc(e.supplier_rnc||e.foreign_tax_id||'')+'</small></td><td>'+esc(e.invoice_reference||'—')+'<br><span class="accounting-badge">'+esc(e.ncf)+'</span></td><td>'+esc(e.concept)+'<br><small>'+esc(e.account_code)+expenseTag(e)+'</small></td><td>'+esc(payerLabel(e.paid_by))+'</td><td class="accounting-right">'+money(e.net_amount)+'</td><td class="accounting-right">'+money(e.itbis_amount)+'</td><td class="accounting-right">'+money(e.total_amount)+(actions?'<br>'+actions:'')+'</td></tr>';
    }).join('');
    return '<div class="accounting-view"><section class="accounting-panel"><div class="accounting-toolbar"><div><h2>Gastos y facturas</h2><p>Comprobantes, quién los pagó y su asiento. Los reportes para la DGII están en "Reportes DGII".</p></div>'+(isAdmin?'<button class="primary-btn" data-accounting-new>Registrar gasto</button>':'')+'</div><div class="table-wrap"><table class="accounting-table"><thead><tr><th>Fecha</th><th>Proveedor / RNC</th><th>Factura / NCF</th><th>Concepto / cuenta</th><th>Pagó</th><th class="accounting-right">Subtotal</th><th class="accounting-right">ITBIS</th><th class="accounting-right">Total</th></tr></thead><tbody>'+(rows||'<tr><td colspan="8" class="accounting-status">Aún no hay gastos registrados.</td></tr>')+'</tbody></table></div><div class="accounting-notice">Lo que paga un socio queda como su aporte al patrimonio de GC. Una factura anulada se reversa con fecha de anulación y sale de los reportes.</div></section></div>';
  }
  function formHtml(){
    const options=records.accounts.filter(a=>a.is_active&&['asset','expense','cost'].includes(a.account_type)).map(a=>'<option value="'+esc(a.code)+'">'+esc(a.code+' — '+a.name)+'</option>').join('');
    const ftypes=Object.keys(FOREIGN_TYPES).map(t=>[t,t]);
    return '<div class="accounting-panel"><div class="accounting-toolbar"><div><h2>Registrar gasto</h2><p>Se crea el asiento según quién pagó.</p></div></div><form id="accountingExpenseForm" class="accounting-form">'+
      '<label>Fecha de la factura<input name="expense_date" type="date" required value="'+today()+'"></label><label>Proveedor<input name="supplier" required></label>'+
      '<label class="wide" style="display:flex;gap:8px;align-items:center;font-weight:600"><input type="checkbox" name="is_foreign" id="isForeign" style="width:auto"> Proveedor del exterior (va al 609, no al 606)</label>'+
      '<div id="localFields" class="accounting-form wide" style="padding:0;border:0;box-shadow:none"><label>RNC o cédula del proveedor<input name="supplier_rnc" inputmode="numeric" placeholder="9 u 11 dígitos"></label><label>NCF<input name="ncf" value="SIN NCF" placeholder="B0100000001 o E310000000001"></label><label>Tipo de bien o servicio (606)<select name="goods_services_type">'+opts(GS_TYPES,'Selecciona…')+'</select></label><label>NCF modificado (solo notas de crédito/débito)<input name="ncf_modified" placeholder="Opcional"></label></div>'+
      '<div id="foreignFields" class="accounting-form wide" style="padding:0;border:0;box-shadow:none" hidden><label>País (código ISO, ej. US)<input name="foreign_country" maxlength="2" style="text-transform:uppercase"></label><label>Tipo de proveedor<select name="foreign_id_type"><option value="2">Persona jurídica</option><option value="1">Persona física</option></select></label><label>ID tributaria (NIT o pasaporte)<input name="foreign_tax_id"></label><label>Tipo de servicio (609)<select name="foreign_service_type" id="foreignType">'+opts(ftypes,'Selecciona…')+'</select></label><label>Detalle del servicio<select name="foreign_service_detail" id="foreignDetail"><option value="">Selecciona el tipo primero</option></select></label><label>Renta presunta (base de la retención)<input name="isr_presumed_base" type="number" step="0.01" min="0" value="0"></label><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="related_party" style="width:auto"> Parte relacionada</label></div>'+
      '<label>Factura o referencia<input name="invoice_reference"></label><label>Cuenta contable<select name="account_code" required>'+options+'</select></label><label class="wide">Concepto<input name="concept" required></label>'+
      '<label>Monto en servicios<input name="services_amount" type="number" step="0.01" min="0" value="0"></label><label>Monto en bienes<input name="goods_amount" type="number" step="0.01" min="0" value="0"></label><label>ITBIS facturado<input name="itbis_amount" type="number" step="0.01" min="0" value="0" required></label><label>Forma de pago<select name="payment_method">'+opts(PAY_METHODS,'Selecciona…')+'</select></label><label>Fecha de pago<input name="payment_date" type="date"></label>'+
      '<label>¿Quién pagó?<select name="paid_by" required>'+opts(payerOptions(),null,'socios')+'</select></label>'+
      '<details class="wide" style="grid-column:1/-1;border:1px solid var(--line);border-radius:10px;padding:10px 14px"><summary style="cursor:pointer;font-weight:600">Retenciones e impuestos adicionales (si aplican)</summary><div class="accounting-form" style="margin-top:10px;padding:0;border:0;box-shadow:none"><label>ITBIS retenido<input name="itbis_withheld" type="number" step="0.01" min="0" value="0"></label><label>Tipo de retención ISR<select name="isr_withholding_type">'+opts(ISR_TYPES,'No aplica')+'</select></label><label>ISR retenido<input name="isr_withheld" type="number" step="0.01" min="0" value="0"></label><label>Impuesto selectivo (ISC)<input name="isc_amount" type="number" step="0.01" min="0" value="0"></label><label>Otros impuestos o tasas<input name="other_taxes" type="number" step="0.01" min="0" value="0"></label><label>Propina legal<input name="legal_tip" type="number" step="0.01" min="0" value="0"></label></div></details>'+
      '<label class="wide">Nota de clasificación<input name="classification_note"></label><label class="wide">Respaldo: foto o PDF de la factura (opcional, máx. 10 MB c/u)<input name="attachments" type="file" accept="image/*,application/pdf" multiple></label>'+
      '<div class="accounting-actions"><button type="button" class="outline-btn" data-accounting-open="transactions">Cancelar</button><button type="submit" class="primary-btn">Guardar gasto y asiento</button></div><div id="accountingFormStatus" class="accounting-status wide" role="status"></div></form></div>';
  }
  function wireExpenseForm(){
    const form=document.getElementById('accountingExpenseForm');
    const fx=document.getElementById('isForeign'),lf=document.getElementById('localFields'),ff=document.getElementById('foreignFields');
    fx.addEventListener('change',()=>{ff.hidden=!fx.checked;lf.hidden=fx.checked});
    document.getElementById('foreignType').addEventListener('change',e=>{const list=FOREIGN_TYPES[e.target.value]||[];document.getElementById('foreignDetail').innerHTML=opts(list.map(x=>[x,x]),list.length?'Selecciona…':'Selecciona el tipo primero')});
    form.addEventListener('submit',saveExpense);
  }
  async function saveExpense(event){
    event.preventDefault();const form=event.currentTarget,status=document.getElementById('accountingFormStatus'),button=form.querySelector('button[type=submit]');button.disabled=true;status.textContent='Guardando…';
    const f=new FormData(form),year=String(f.get('expense_date')).slice(0,4),id='GC-'+year+'-'+Date.now().toString(36).toUpperCase();
    const n=k=>Number(f.get(k)||0),t=k=>(f.get(k)||'').toString().trim()||null,foreign=f.get('is_foreign')==='on';
    const payload={id,expense_date:f.get('expense_date'),supplier:f.get('supplier'),invoice_reference:t('invoice_reference'),concept:f.get('concept'),account_code:f.get('account_code'),services_amount:n('services_amount'),goods_amount:n('goods_amount'),itbis_amount:n('itbis_amount'),itbis_withheld:n('itbis_withheld'),isr_withholding_type:t('isr_withholding_type'),isr_withheld:n('isr_withheld'),isc_amount:n('isc_amount'),other_taxes:n('other_taxes'),legal_tip:n('legal_tip'),payment_method:t('payment_method'),payment_date:t('payment_date'),classification_note:t('classification_note'),paid_by:f.get('paid_by'),is_foreign:foreign};
    if(foreign)Object.assign(payload,{ncf:'SIN NCF',foreign_country:(t('foreign_country')||'').toUpperCase()||null,foreign_id_type:t('foreign_id_type'),foreign_tax_id:t('foreign_tax_id'),foreign_service_type:t('foreign_service_type'),foreign_service_detail:t('foreign_service_detail'),related_party:f.get('related_party')==='on',isr_presumed_base:n('isr_presumed_base')});
    else Object.assign(payload,{supplier_rnc:t('supplier_rnc'),ncf:t('ncf')||'SIN NCF',ncf_modified:t('ncf_modified'),goods_services_type:t('goods_services_type')});
    const {error}=await client().rpc('record_accounting_expense',{p_expense:payload});
    if(error){status.textContent='No se guardó: '+error.message;button.disabled=false;return}
    const files=[...(form.querySelector('[name=attachments]')?.files||[])];
    if(files.length){status.textContent='Gasto guardado. Subiendo respaldo…';const bad=await uploadFiles(id,files);if(bad.length){status.textContent='El gasto se guardó, pero no se subió: '+bad.join('; ')+'. Puedes adjuntarlo desde "Respaldo".';await loadData();button.disabled=false;return}}
    await loadData();setView('transactions');
  }
  function payerFormHtml(e){
    return '<div class="accounting-panel"><div class="accounting-toolbar"><div><h2>¿Quién pagó esta factura?</h2><p>'+esc(e.supplier)+' · '+esc(e.ncf)+' · '+date(e.expense_date)+' · '+money(e.total_amount)+'. Hoy: '+esc(payerLabel(e.paid_by))+'. Solo cambian las líneas de pago del asiento.</p></div></div><form id="payerForm" class="accounting-form" data-id="'+esc(e.id)+'"><label class="wide">Pagado por<select name="paid_by">'+opts(payerOptions(),null,e.paid_by)+'</select></label><div class="accounting-actions"><button type="button" class="outline-btn" data-accounting-open="transactions">Cancelar</button><button type="submit" class="primary-btn">Guardar</button></div><div id="payerStatus" class="accounting-status wide" role="status"></div></form></div>';
  }
  function voidExpenseHtml(e){
    return '<div class="accounting-panel"><div class="accounting-toolbar"><div><h2>Anular factura</h2><p>'+esc(e.supplier)+' · '+esc(e.ncf)+' · '+date(e.expense_date)+' · '+money(e.total_amount)+'. Se crea un asiento de reverso con la fecha de anulación y la factura sale de los reportes.'+(isClosed(e.expense_date)?' <b>El mes de esta factura ya está cerrado: si ya se declaró en el 606, hay que rectificarlo en la DGII.</b>':'')+'</p></div></div><form id="voidExpenseForm" class="accounting-form" data-id="'+esc(e.id)+'"><label>Fecha de anulación<input name="void_date" type="date" required value="'+today()+'"></label><label>Motivo<input name="reason" required placeholder="Ej. registrada por error, duplicada"></label><div class="accounting-actions"><button type="button" class="outline-btn" data-accounting-open="transactions">Cancelar</button><button type="submit" class="primary-btn" style="background:var(--red);border-color:var(--red)">Anular factura</button></div><div id="voidStatus" class="accounting-status wide" role="status"></div></form></div>';
  }

  // ───────── Respaldos
  function filesFor(id){return records.files.filter(f=>f.expense_id===id)}
  function filesButton(e){const n=filesFor(e.id).length;return '<button class="outline-btn" style="margin-top:6px;padding:4px 10px;font-size:12px'+(n?'':';border-style:dashed')+'" data-files="'+esc(e.id)+'">'+(n?'Respaldo ('+n+')':'Subir respaldo')+'</button>'}
  const fileSize=b=>b>1048576?(b/1048576).toFixed(1)+' MB':Math.max(1,Math.round(b/1024))+' KB';
  async function uploadFiles(expenseId,files){
    const failed=[];
    for(const file of files){
      if(file.size>10485760){failed.push(file.name+' (pesa más de 10 MB)');continue}
      const clean=file.name.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Za-z0-9._-]+/g,'-').slice(-80)||'archivo';
      const path=expenseId+'/'+Date.now().toString(36)+'-'+clean;
      const up=await client().storage.from('facturas').upload(path,file,{contentType:file.type||undefined,upsert:false});
      if(up.error){failed.push(file.name+' ('+up.error.message+')');continue}
      const ins=await client().from('accounting_expense_files').insert({expense_id:expenseId,storage_path:path,file_name:file.name,content_type:file.type||null,size_bytes:file.size});
      if(ins.error){await client().storage.from('facturas').remove([path]);failed.push(file.name+' ('+ins.error.message+')')}
    }
    return failed;
  }
  function filesHtml(e){
    const list=filesFor(e.id);
    const rows=list.map(f=>'<li style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:8px 0;border-top:1px solid var(--line)"><a data-file-link="'+esc(f.storage_path)+'" target="_blank" rel="noopener" style="font-weight:600;color:var(--text);min-width:0;overflow-wrap:anywhere">'+esc(f.file_name)+'</a><small style="color:var(--muted)">'+(f.size_bytes?fileSize(f.size_bytes)+' · ':'')+date(String(f.created_at).slice(0,10))+'</small>'+(isAdmin?'<button type="button" class="outline-btn" style="margin-left:auto;padding:3px 10px;font-size:12px" data-file-remove="'+esc(f.id)+'">Quitar</button>':'')+'</li>').join('');
    return '<div class="accounting-panel"><div class="accounting-toolbar"><div><h2>Respaldo de la factura</h2><p>'+esc(e.supplier)+' · '+esc(e.ncf)+' · '+date(e.expense_date)+' · '+money(e.total_amount)+'</p></div><button type="button" class="outline-btn" data-accounting-open="transactions">Volver</button></div>'+
      (list.length?'<ul style="list-style:none;margin:0 0 14px;padding:0">'+rows+'</ul>':'<p class="accounting-status">Esta factura aún no tiene respaldo. Sube una foto o el PDF.</p>')+
      (isAdmin?'<form id="filesForm" class="accounting-form" data-id="'+esc(e.id)+'"><label class="wide" style="grid-column:1/-1">Agregar foto o PDF (máx. 10 MB c/u)<input name="attachments" type="file" accept="image/*,application/pdf" multiple required></label><div class="accounting-actions"><button type="submit" class="primary-btn">Subir</button></div><div id="filesStatus" class="accounting-status wide" role="status"></div></form>':'')+'</div>';
  }
  function openFiles(id){
    const e=records.expenses.find(x=>x.id===id);if(!e)return;
    const content=document.getElementById('pageContent');
    content.innerHTML=(window.__gcAccNav||'')+filesHtml(e);
    content.querySelectorAll('[data-file-link]').forEach(async a=>{const r=await client().storage.from('facturas').createSignedUrl(a.dataset.fileLink,3600);if(r.data)a.href=r.data.signedUrl;else a.title='No se pudo abrir: '+(r.error?.message||'')});
    content.querySelectorAll('[data-file-remove]').forEach(b=>b.addEventListener('click',async()=>{
      if(b.dataset.armed!=='1'){b.dataset.armed='1';b.textContent='¿Seguro? Toca otra vez';setTimeout(()=>{if(b.isConnected){b.dataset.armed='';b.textContent='Quitar'}},4000);return}
      b.disabled=true;const f=records.files.find(x=>x.id===b.dataset.fileRemove);if(!f)return;
      const st=await client().storage.from('facturas').remove([f.storage_path]);
      const del=await client().from('accounting_expense_files').delete().eq('id',f.id);
      if(st.error||del.error){b.disabled=false;b.textContent='No se pudo quitar';return}
      await loadData();openFiles(id);
    }));
    const form=document.getElementById('filesForm');
    if(form)form.addEventListener('submit',async ev=>{
      ev.preventDefault();const st=document.getElementById('filesStatus'),btn=form.querySelector('button[type=submit]');
      const files=[...form.querySelector('[name=attachments]').files];if(!files.length)return;
      btn.disabled=true;st.textContent='Subiendo '+files.length+' archivo(s)…';
      const bad=await uploadFiles(id,files);await loadData();openFiles(id);
      if(bad.length)document.getElementById('filesStatus').textContent='No se subió: '+bad.join('; ');
    });
  }
  function needs606(e){return e.status!=='anulada'&&!e.is_foreign&&e.ncf&&e.ncf!=='SIN NCF'&&(!e.supplier_rnc||!e.supplier_id_type||!e.goods_services_type||!e.payment_method||Number(e.services_amount||0)+Number(e.goods_amount||0)===0)}
  function complete606Html(e){
    const svc=Number(e.services_amount||0),gds=Number(e.goods_amount||0);
    return '<div class="accounting-panel"><div class="accounting-toolbar"><div><h2>Completar datos 606</h2><p>'+esc(e.supplier)+' · NCF '+esc(e.ncf)+' · '+date(e.expense_date)+' · Subtotal '+money(e.net_amount)+'. No cambia montos ni asientos.</p></div></div><form id="complete606Form" class="accounting-form" data-id="'+esc(e.id)+'" data-net="'+Number(e.net_amount)+'"><label>RNC o cédula del proveedor<input name="supplier_rnc" inputmode="numeric" value="'+esc(e.supplier_rnc||'')+'" required></label><label>Tipo de bien o servicio (606)<select name="goods_services_type" required>'+opts(GS_TYPES,'Selecciona…',e.goods_services_type||'')+'</select></label><label>Monto en servicios<input name="services_amount" type="number" step="0.01" min="0" value="'+svc+'"></label><label>Monto en bienes<input name="goods_amount" type="number" step="0.01" min="0" value="'+gds+'"></label><label>Forma de pago<select name="payment_method" required>'+opts(PAY_METHODS,'Selecciona…',e.payment_method||'')+'</select></label><label>Fecha de pago<input name="payment_date" type="date" value="'+esc(e.payment_date||'')+'"></label><div class="accounting-actions"><button type="button" class="outline-btn" data-accounting-open="transactions">Cancelar</button><button type="submit" class="primary-btn">Guardar datos 606</button></div><div id="complete606Status" class="accounting-status wide" role="status"></div></form></div>';
  }
  async function saveComplete606(event){
    event.preventDefault();const form=event.currentTarget,st=document.getElementById('complete606Status'),btn=form.querySelector('button[type=submit]');
    const f=new FormData(form),svc=Number(f.get('services_amount')||0),gds=Number(f.get('goods_amount')||0),net=Number(form.dataset.net);
    if(Math.round((svc+gds)*100)!==Math.round(net*100)){st.textContent='Servicios + bienes debe sumar el subtotal: '+money(net)+'.';return}
    btn.disabled=true;st.textContent='Guardando…';
    const {error}=await client().rpc('update_expense_606',{p:{id:form.dataset.id,supplier_rnc:f.get('supplier_rnc'),goods_services_type:f.get('goods_services_type'),services_amount:svc,goods_amount:gds,payment_method:f.get('payment_method'),payment_date:f.get('payment_date')||null}});
    if(error){st.textContent='No se guardó: '+error.message;btn.disabled=false;return}
    await loadData();setView('transactions');
  }

  // ───────── Ventas
  function salePaid(s){return records.salePayments.filter(p=>p.sale_id===s.id).reduce((t,p)=>t+Number(p.amount),0)}
  function salePending(s){return s.payment_method==='credito'&&s.status==='activa'?N(Number(s.total_amount)-Number(s.itbis_withheld)-Number(s.isr_withheld)-salePaid(s)):0}
  function renderSales(){
    const data=records.sales.slice().sort((a,b)=>b.sale_date.localeCompare(a.sale_date));
    const pendingTotal=data.reduce((t,s)=>t+salePending(s),0);
    const rows=data.map(s=>{
      const off=s.status==='anulada',pend=salePending(s),locked=isClosed(s.sale_date);
      const actions=off||!isAdmin?'':((pend>0?'<br><button class="outline-btn" '+smallBtn+' data-sale-pay="'+esc(s.id)+'">Registrar cobro</button>':'')+'<br><button class="outline-btn" '+smallBtn+' data-void-sale="'+esc(s.id)+'">Anular</button>');
      return '<tr'+(off?' style="opacity:.55"':'')+'><td>'+date(s.sale_date)+(locked?'<br><span class="accounting-badge">mes cerrado</span>':'')+'</td><td>'+esc(s.customer_name)+'<br><small>'+esc(s.customer_id||'')+'</small></td><td><span class="accounting-badge">'+esc(s.ncf)+'</span>'+(off?'<br><small style="color:var(--red)">anulada '+date(s.voided_at)+'</small>':'')+'</td><td>'+esc(s.concept)+'<br><small>'+esc(label(SALE_METHODS,s.payment_method))+(pend>0?' · <b>pendiente '+money(pend)+'</b>':'')+'</small></td><td class="accounting-right">'+money(s.net_amount)+'</td><td class="accounting-right">'+money(s.itbis_amount)+'</td><td class="accounting-right">'+money(s.total_amount)+actions+'</td></tr>';
    }).join('');
    const voidedRows=records.voided.slice().sort((a,b)=>b.ncf_date.localeCompare(a.ncf_date)).map(v=>'<tr><td>'+esc(v.ncf)+'</td><td>'+date(v.ncf_date)+'</td><td>'+esc(v.void_type+' — '+label(VOID_TYPES,v.void_type))+'</td><td>'+esc(v.reason||'')+'</td></tr>').join('');
    return '<div class="accounting-view"><section class="accounting-cards">'+card('Facturado',money(data.filter(s=>s.status==='activa').reduce((t,s)=>t+Number(s.net_amount),0)),'Ventas activas sin ITBIS')+card('ITBIS facturado',money(data.filter(s=>s.status==='activa').reduce((t,s)=>t+Number(s.itbis_amount),0)),'Va al IT-1')+card('Por cobrar',money(pendingTotal),'Ventas a crédito pendientes')+card('Anulados',String(records.voided.length),'Comprobantes para el 608')+'</section>'+
      '<section class="accounting-panel"><div class="accounting-toolbar"><div><h2>Ventas (607)</h2><p>Registra aquí cada comprobante que emitas en el Facturador Gratuito de la DGII, con su e-NCF.</p></div>'+(isAdmin?'<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="outline-btn" data-voided-new>Registrar NCF anulado</button><button class="primary-btn" data-sale-new>Registrar venta</button></div>':'')+'</div><div class="table-wrap"><table class="accounting-table"><thead><tr><th>Fecha</th><th>Cliente</th><th>e-NCF</th><th>Concepto / cobro</th><th class="accounting-right">Monto</th><th class="accounting-right">ITBIS</th><th class="accounting-right">Total</th></tr></thead><tbody>'+(rows||'<tr><td colspan="7" class="accounting-status">Aún no hay ventas registradas.</td></tr>')+'</tbody></table></div></section>'+
      '<section class="accounting-panel"><h2>Comprobantes anulados (608)</h2><p>Se agregan solos al anular una venta, o a mano si se dañó una secuencia.</p><div class="table-wrap"><table class="accounting-table"><thead><tr><th>NCF</th><th>Fecha</th><th>Tipo de anulación</th><th>Motivo</th></tr></thead><tbody>'+(voidedRows||'<tr><td colspan="4" class="accounting-status">Sin comprobantes anulados.</td></tr>')+'</tbody></table></div></section></div>';
  }
  function saleFormHtml(){
    const inc=records.accounts.filter(a=>a.is_active&&a.account_type==='income').map(a=>[a.code,a.code+' — '+a.name]);
    return '<div class="accounting-panel"><div class="accounting-toolbar"><div><h2>Registrar venta</h2><p>Copia los datos del comprobante emitido en el Facturador Gratuito.</p></div></div><form id="saleForm" class="accounting-form">'+
      '<label>Fecha del comprobante<input name="sale_date" type="date" required value="'+today()+'"></label><label>e-NCF<input name="ncf" required placeholder="E310000000001"></label>'+
      '<label>Cliente<input name="customer_name" required></label><label>RNC, cédula o pasaporte del cliente<input name="customer_id" placeholder="Obligatorio en crédito fiscal (E31)"></label>'+
      '<label class="wide">Concepto<input name="concept" required placeholder="Ej. Envío Miami–Santo Domingo, 12 lb"></label>'+
      '<label>Cuenta de ingreso<select name="account_code">'+opts(inc,null,'4100')+'</select></label><label>Tipo de ingreso (607)<select name="income_type">'+opts(INCOME_TYPES,null,'01')+'</select></label>'+
      '<label>Monto facturado (sin ITBIS)<input name="net_amount" type="number" step="0.01" min="0" required></label><label>ITBIS facturado<input name="itbis_amount" type="number" step="0.01" min="0" value="0"></label>'+
      '<label>Forma de cobro<select name="payment_method" required>'+opts(SALE_METHODS,'Selecciona…')+'</select></label><label>NCF modificado (notas de crédito)<input name="ncf_modified" placeholder="Opcional"></label>'+
      '<details class="wide" style="grid-column:1/-1;border:1px solid var(--line);border-radius:10px;padding:10px 14px"><summary style="cursor:pointer;font-weight:600">Retenciones del cliente e impuestos adicionales</summary><div class="accounting-form" style="margin-top:10px;padding:0;border:0;box-shadow:none"><label>ITBIS retenido por el cliente<input name="itbis_withheld" type="number" step="0.01" min="0" value="0"></label><label>ISR retenido por el cliente<input name="isr_withheld" type="number" step="0.01" min="0" value="0"></label><label>Fecha de la retención<input name="retention_date" type="date"></label><label>Impuesto selectivo<input name="isc_amount" type="number" step="0.01" min="0" value="0"></label><label>Otros impuestos o tasas<input name="other_taxes" type="number" step="0.01" min="0" value="0"></label><label>Propina legal<input name="legal_tip" type="number" step="0.01" min="0" value="0"></label></div></details>'+
      '<div class="accounting-actions"><button type="button" class="outline-btn" data-accounting-open="sales">Cancelar</button><button type="submit" class="primary-btn">Guardar venta y asiento</button></div><div id="saleStatus" class="accounting-status wide" role="status"></div></form></div>';
  }
  function salePayHtml(s){return '<div class="accounting-panel"><div class="accounting-toolbar"><div><h2>Registrar cobro</h2><p>'+esc(s.customer_name)+' · '+esc(s.ncf)+' · pendiente '+money(salePending(s))+'</p></div></div><form id="salePayForm" class="accounting-form" data-id="'+esc(s.id)+'"><label>Fecha del cobro<input name="payment_date" type="date" required value="'+today()+'"></label><label>Monto cobrado<input name="amount" type="number" step="0.01" min="0.01" required value="'+salePending(s)+'"></label><div class="accounting-actions"><button type="button" class="outline-btn" data-accounting-open="sales">Cancelar</button><button type="submit" class="primary-btn">Guardar cobro</button></div><div id="salePayStatus" class="accounting-status wide" role="status"></div></form></div>'}
  function voidSaleHtml(s){return '<div class="accounting-panel"><div class="accounting-toolbar"><div><h2>Anular venta</h2><p>'+esc(s.customer_name)+' · '+esc(s.ncf)+' · '+money(s.total_amount)+'. Se reversa el asiento y el comprobante pasa al 608. Recuerda anularlo también en el Facturador de la DGII.</p></div></div><form id="voidSaleForm" class="accounting-form" data-id="'+esc(s.id)+'"><label>Fecha de anulación<input name="void_date" type="date" required value="'+today()+'"></label><label>Tipo de anulación (608)<select name="void_type">'+opts(VOID_TYPES,null,'04')+'</select></label><label class="wide">Motivo<input name="reason" required></label><div class="accounting-actions"><button type="button" class="outline-btn" data-accounting-open="sales">Cancelar</button><button type="submit" class="primary-btn" style="background:var(--red);border-color:var(--red)">Anular venta</button></div><div id="voidSaleStatus" class="accounting-status wide" role="status"></div></form></div>'}
  function voidedFormHtml(){return '<div class="accounting-panel"><div class="accounting-toolbar"><div><h2>Registrar NCF anulado</h2><p>Para comprobantes que no llegaron a ser una venta (secuencia dañada, error de emisión).</p></div></div><form id="voidedForm" class="accounting-form"><label>NCF<input name="ncf" required></label><label>Fecha del comprobante<input name="ncf_date" type="date" required value="'+today()+'"></label><label>Tipo de anulación<select name="void_type">'+opts(VOID_TYPES,null,'04')+'</select></label><label>Motivo<input name="reason"></label><div class="accounting-actions"><button type="button" class="outline-btn" data-accounting-open="sales">Cancelar</button><button type="submit" class="primary-btn">Guardar</button></div><div id="voidedStatus" class="accounting-status wide" role="status"></div></form></div>'}

  // ───────── Reportes DGII
  function prevMonth(){const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-1);return d.toISOString().slice(0,7)}
  function periodRange(p){const [y,m]=p.split('-').map(Number);const last=new Date(y,m,0).getDate();return [p+'-01',p+'-'+String(last).padStart(2,'0')]}
  function computeReports(from,to){
    const inR=(d)=>d>=from&&d<=to;
    const exp=records.expenses.filter(e=>e.status==='activa'&&inR(e.expense_date));
    const e606=exp.filter(e=>!e.is_foreign&&e.ncf&&e.ncf!=='SIN NCF');
    const e609=exp.filter(e=>e.is_foreign);
    const noNcf=exp.filter(e=>!e.is_foreign&&(!e.ncf||e.ncf==='SIN NCF'));
    const sales=records.sales.filter(s=>s.status==='activa'&&inR(s.sale_date));
    const voided=records.voided.filter(v=>inR(v.ncf_date));
    const itbisSales=sales.reduce((t,s)=>t+Number(s.itbis_amount),0);
    const itbisRetByClients=sales.reduce((t,s)=>t+Number(s.itbis_withheld),0);
    const itbisPurchases=e606.reduce((t,e)=>t+Number(e.itbis_amount)-Number(e.itbis_to_cost),0);
    const itbisWithheldToPay=exp.reduce((t,e)=>t+Number(e.itbis_withheld),0);
    const ir17={};exp.filter(e=>Number(e.isr_withheld)>0).forEach(e=>{const k=e.is_foreign?'Pagos al exterior (609)':(e.isr_withholding_type+' — '+label(ISR_TYPES,e.isr_withholding_type));ir17[k]=(ir17[k]||0)+Number(e.isr_withheld)});
    return {exp,e606,e609,noNcf,sales,voided,itbisSales,itbisRetByClients,itbisPurchases,itbisWithheldToPay,ir17,
      itbisBalance:N(itbisSales-itbisRetByClients-itbisPurchases)};
  }
  function renderReports(){
    const p=window.__gcReportPeriod||prevMonth();const [from,to]=periodRange(p);const r=computeReports(from,to);
    const missing=r.e606.filter(needs606).length+(r.noNcf.length?0:0);
    const bal=r.itbisBalance;
    const ir17Rows=Object.entries(r.ir17).map(([k,v])=>'<tr><td>'+esc(k)+'</td><td class="accounting-right">'+money(v)+'</td></tr>').join('');
    const row=(n,l,c,s)=>'<tr><td><b>'+n+'</b></td><td>'+l+'</td><td class="accounting-right">'+c+'</td><td>'+s+'</td></tr>';
    const status=(n)=>n?'<span class="accounting-badge" style="background:color-mix(in srgb,var(--green) 18%,transparent);color:var(--green)">con datos</span>':'<span class="accounting-badge">sin movimiento</span>';
    return '<div class="accounting-view"><section class="accounting-panel"><div class="accounting-toolbar" style="flex-wrap:wrap;align-items:flex-end"><div><h2>Reportes para la DGII</h2><p>Período = mes de los comprobantes. Los formatos se presentan aunque estén sin movimiento.</p></div><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end"><label style="display:grid;gap:4px;font-size:12px">Período<input type="month" id="reportPeriod" value="'+p+'"></label><button class="primary-btn" data-export-dgii>Descargar Excel DGII</button></div></div><div id="reportStatus" class="accounting-status" role="status"></div>'+
      '<div class="table-wrap"><table class="accounting-table"><thead><tr><th>Formato</th><th>Qué lleva</th><th class="accounting-right">Registros</th><th>Estado</th></tr></thead><tbody>'+
      row('606','Compras con NCF a nombre de GC',r.e606.length,status(r.e606.length)+(missing?' <span class="accounting-badge" style="color:var(--red)">'+missing+' por completar</span>':''))+
      row('607','Ventas (comprobantes emitidos)',r.sales.length,status(r.sales.length))+
      row('608','Comprobantes anulados',r.voided.length,status(r.voided.length))+
      row('609','Pagos al exterior',r.e609.length,status(r.e609.length))+
      row('IR-17','Retenciones de ISR e ITBIS a terceros',Object.keys(r.ir17).length+(r.itbisWithheldToPay?1:0),status(Object.keys(r.ir17).length||r.itbisWithheldToPay))+
      '</tbody></table></div></section>'+
      '<section class="accounting-panel"><h2>Resumen IT-1 (ITBIS) · '+esc(p)+'</h2><p>Referencia para llenar el IT-1; confirma cada casilla con tu contador.</p><div class="table-wrap"><table class="accounting-table" style="min-width:420px"><tbody>'+
      '<tr><td>ITBIS facturado en ventas</td><td class="accounting-right">'+money(r.itbisSales)+'</td></tr>'+
      '<tr><td>− ITBIS retenido por clientes</td><td class="accounting-right">'+money(r.itbisRetByClients)+'</td></tr>'+
      '<tr><td>− ITBIS pagado en compras con crédito fiscal (adelantado)</td><td class="accounting-right">'+money(r.itbisPurchases)+'</td></tr>'+
      '<tr><th>'+(bal>=0?'ITBIS a pagar':'Saldo a favor del mes')+'</th><th class="accounting-right">'+money(Math.abs(bal))+'</th></tr>'+
      '<tr><td>ITBIS retenido a proveedores (se paga aparte)</td><td class="accounting-right">'+money(r.itbisWithheldToPay)+'</td></tr>'+
      '</tbody></table></div></section>'+
      (ir17Rows?'<section class="accounting-panel"><h2>Retenciones de ISR (IR-17)</h2><div class="table-wrap"><table class="accounting-table" style="min-width:420px"><tbody>'+ir17Rows+'</tbody></table></div></section>':'')+
      '</div>';
  }
  function loadXlsx(){
    if(window.XLSX)return Promise.resolve(window.XLSX);
    return new Promise((ok,fail)=>{const sc=document.createElement('script');sc.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';sc.onload=()=>ok(window.XLSX);sc.onerror=()=>fail(new Error('No se pudo cargar la librería de Excel'));document.head.appendChild(sc)});
  }
  function buildDgiiWorkbook(XLSX,from,to){
    const r=computeReports(from,to);
    const ym=d=>d?d.slice(0,4)+d.slice(5,7):'',dd=d=>d?d.slice(8,10):'',ymd=d=>d?d.replace(/-/g,'').slice(0,8):'';
    const sheet=(aoa,widths)=>{const ws=XLSX.utils.aoa_to_sheet(aoa);ws['!cols']=(widths||aoa[0].map(h=>Math.min(Math.max(String(h).length,10),24))).map(w=>({wch:w}));return ws};
    const wb=XLSX.utils.book_new();const issues=[];
    const h606=['RNC o Cédula','Tipo Id','Tipo Bienes y Servicios Comprados','NCF','NCF o Documento Modificado','Fecha Comprobante (AAAAMM)','Fecha Comprobante (DD)','Fecha Pago (AAAAMM)','Fecha Pago (DD)','Monto Facturado en Servicios','Monto Facturado en Bienes','Total Monto Facturado','ITBIS Facturado','ITBIS Retenido','ITBIS sujeto a Proporcionalidad (Art. 349)','ITBIS llevado al Costo','ITBIS por Adelantar','ITBIS percibido en compras','Tipo de Retención en ISR','Monto Retención Renta','ISR Percibido en compras','Impuesto Selectivo al Consumo','Otros Impuestos/Tasas','Monto Propina Legal','Forma de Pago'];
    const r606=r.e606.sort((a,b)=>a.expense_date.localeCompare(b.expense_date)).map(e=>{
      const miss=[];if(!e.supplier_rnc)miss.push('RNC/cédula');if(!e.supplier_id_type)miss.push('tipo de identificación');if(!e.goods_services_type)miss.push('tipo de bien o servicio');if(!e.payment_method)miss.push('forma de pago');if(N(e.services_amount)+N(e.goods_amount)===0)miss.push('monto servicios / bienes');if((N(e.itbis_withheld)>0||N(e.isr_withheld)>0)&&!e.payment_date)miss.push('fecha de pago');
      if(miss.length)issues.push(['606',e.expense_date,e.supplier,e.ncf,N(e.total_amount),miss.join(', ')]);
      const itbis=N(e.itbis_amount),cost=N(e.itbis_to_cost);
      return [String(e.supplier_rnc||'').replace(/\D/g,''),e.supplier_id_type||'',e.goods_services_type||'',e.ncf,e.ncf_modified||'',ym(e.expense_date),dd(e.expense_date),ym(e.payment_date),dd(e.payment_date),N(e.services_amount),N(e.goods_amount),N(e.net_amount),itbis,N(e.itbis_withheld),0,cost,N(itbis-cost),0,e.isr_withholding_type||'',N(e.isr_withheld),0,N(e.isc_amount),N(e.other_taxes),N(e.legal_tip),e.payment_method||''];
    });
    XLSX.utils.book_append_sheet(wb,sheet([h606].concat(r606)),'606');
    const h607=['RNC / Cédula o Pasaporte','Tipo Identificación','Número Comprobante Fiscal','Número Comprobante Fiscal Modificado','Tipo de Ingreso','Fecha Comprobante','Fecha de Retención','Monto Facturado','ITBIS Facturado','ITBIS Retenido por Terceros','ITBIS Percibido','Retención Renta por Terceros','ISR Percibido','Impuesto Selectivo al Consumo','Otros Impuestos/Tasas','Monto Propina Legal','Efectivo','Cheque/Transferencia/Depósito','Tarjeta Débito/Crédito','Venta a Crédito','Bonos o Certificados de Regalo','Permuta','Otras Formas de Ventas'];
    const methodCols=['efectivo','transferencia','tarjeta','credito','bonos','permuta','otras'];
    const r607=r.sales.sort((a,b)=>a.sale_date.localeCompare(b.sale_date)).map(s=>[s.customer_id||'',s.customer_id_type||'',s.ncf,s.ncf_modified||'',s.income_type,ymd(s.sale_date),ymd(s.retention_date),N(s.net_amount),N(s.itbis_amount),N(s.itbis_withheld),0,N(s.isr_withheld),0,N(s.isc_amount),N(s.other_taxes),N(s.legal_tip)].concat(methodCols.map(m=>m===s.payment_method?N(s.total_amount):0)));
    XLSX.utils.book_append_sheet(wb,sheet([h607].concat(r607)),'607');
    XLSX.utils.book_append_sheet(wb,sheet([['Número de Comprobante Fiscal','Fecha de Comprobante','Tipo de Anulación']].concat(r.voided.map(v=>[v.ncf,ymd(v.ncf_date),v.void_type]))),'608');
    const h609=['Nombre o Razón social','Tipo ID Tributaria','ID Tributaria','País de Destino','Tipo de Servicio adquirido','Detalle del Servicio adquirido','Parte relacionada','Número de Documento','Fecha de Documento','Monto Facturado','Fecha de Retención ISR','Renta Presunta','ISR Retenido'];
    const r609=r.e609.map(e=>{const miss=[];if(!e.foreign_tax_id)miss.push('ID tributaria');if(!e.foreign_service_detail)miss.push('detalle del servicio');if(miss.length)issues.push(['609',e.expense_date,e.supplier,e.invoice_reference||'',N(e.total_amount),miss.join(', ')]);
      return [e.supplier,e.foreign_id_type==='1'?'Persona Física':'Persona Jurídica',e.foreign_tax_id||'',e.foreign_country||'',e.foreign_service_type||'',e.foreign_service_detail||'',e.related_party?'Sí':'No',e.invoice_reference||e.id,ymd(e.expense_date),N(e.net_amount),ymd(e.payment_date),N(e.isr_presumed_base),N(e.isr_withheld)]});
    XLSX.utils.book_append_sheet(wb,sheet([h609].concat(r609)),'609');
    XLSX.utils.book_append_sheet(wb,sheet([['Concepto','Monto'],['ITBIS facturado en ventas',N(r.itbisSales)],['ITBIS retenido por clientes',N(r.itbisRetByClients)],['ITBIS pagado en compras con crédito fiscal',N(r.itbisPurchases)],[r.itbisBalance>=0?'ITBIS a pagar':'Saldo a favor',Math.abs(r.itbisBalance)],['ITBIS retenido a proveedores (a pagar)',N(r.itbisWithheldToPay)]],[46,16]),'Resumen IT-1');
    XLSX.utils.book_append_sheet(wb,sheet([['Tipo de retención','ISR retenido']].concat(Object.entries(r.ir17).map(([k,v])=>[k,N(v)])).concat([['ITBIS retenido a proveedores',N(r.itbisWithheldToPay)]]),[46,16]),'Resumen IR-17');
    XLSX.utils.book_append_sheet(wb,sheet([['Formato','Fecha','Proveedor','NCF / documento','Total','Falta completar']].concat(issues.length?issues:[['','','Todo completo','','','']]),[8,12,30,18,14,50]),'Revisar antes de subir');
    XLSX.utils.book_append_sheet(wb,sheet([['Fecha','Proveedor','Referencia','Concepto','Subtotal','ITBIS (al costo)','Total','Pagó']].concat(r.noNcf.map(e=>[e.expense_date,e.supplier,e.invoice_reference||'',e.concept,N(e.net_amount),N(e.itbis_amount),N(e.total_amount),payerLabel(e.paid_by)])),[12,30,16,36,14,14,14,18]),'Sin NCF (no van)');
    return {wb,r,issues};
  }
  async function exportDgii(){
    const st=document.getElementById('reportStatus'),p=document.getElementById('reportPeriod').value;
    if(!p){st.textContent='Elige el período.';return}
    const [from,to]=periodRange(p);st.textContent='Preparando Excel…';
    let XLSX;try{XLSX=await loadXlsx()}catch(e){st.textContent=e.message;return}
    const {wb,r,issues}=buildDgiiWorkbook(XLSX,from,to);
    XLSX.writeFile(wb,'GC-Logis-DGII-'+p+'.xlsx');
    st.textContent='Listo: 606 ('+r.e606.length+'), 607 ('+r.sales.length+'), 608 ('+r.voided.length+'), 609 ('+r.e609.length+').'+(issues.length?' ⚠ '+issues.length+' registro(s) por completar: mira la hoja "Revisar antes de subir".':'');
  }

  // ───────── Cierre de mes
  function monthsList(){
    const dates=[...records.expenses.map(e=>e.expense_date),...records.sales.map(s=>s.sale_date),...records.entries.map(e=>e.entry_date)].filter(Boolean).sort();
    const first=(dates[0]||today()).slice(0,7),last=today().slice(0,7),out=[];
    let [y,m]=first.split('-').map(Number);
    while(true){const k=y+'-'+String(m).padStart(2,'0');out.push(k);if(k>=last)break;m++;if(m>12){m=1;y++}}
    return out.reverse();
  }
  function renderClosing(){
    const rows=monthsList().map(p=>{
      const c=records.closed.find(x=>x.period===p),[from,to]=periodRange(p);
      const am=records.entries.filter(e=>e.entry_no.startsWith('AM-')&&e.entry_date>=from&&e.entry_date<=to).length;
      const due=records.amortizations.filter(a=>a.is_active).filter(a=>{const s=a.start_month.slice(0,7);const idx=(Number(p.slice(0,4))*12+Number(p.slice(5)))-(Number(s.slice(0,4))*12+Number(s.slice(5)));return idx>=0&&idx<a.months}).length;
      const act=!isAdmin?'':(c?'<button class="outline-btn" '+smallBtn+' data-reopen="'+p+'">Reabrir</button>':((am<due?'<button class="outline-btn" '+smallBtn+' data-amortize="'+p+'">Registrar amortización</button> ':'')+'<button class="primary-btn" '+smallBtn+' data-close="'+p+'">Cerrar mes</button>'));
      return '<tr><td><b>'+p+'</b></td><td>'+(c?'<span class="accounting-badge">cerrado '+date(String(c.closed_at).slice(0,10))+'</span>':'<span class="accounting-badge" style="color:var(--green)">abierto</span>')+'</td><td>'+am+' de '+due+'</td><td class="accounting-right">'+act+'</td></tr>';
    }).join('');
    const audit=records.audit.slice(0,15).map(a=>'<tr><td>'+date(String(a.at).slice(0,10))+'</td><td>'+esc(a.action.replace(/_/g,' '))+'</td><td>'+esc(a.ref||'')+'</td></tr>').join('');
    return '<div class="accounting-view"><section class="accounting-panel"><h2>Cierre de mes</h2><p>Cierra cada mes después de presentar sus formatos a la DGII: así nadie cambia lo que ya se declaró. Antes de cerrar, registra la amortización del mes (dominio web y registro ONAPI).</p><div id="closingStatus" class="accounting-status" role="status"></div><div class="table-wrap"><table class="accounting-table" style="min-width:520px"><thead><tr><th>Mes</th><th>Estado</th><th>Amortización</th><th class="accounting-right">Acción</th></tr></thead><tbody>'+rows+'</tbody></table></div></section>'+
      '<section class="accounting-panel"><h2>Bitácora</h2><p>Cambios hechos sobre registros existentes.</p><div class="table-wrap"><table class="accounting-table" style="min-width:420px"><thead><tr><th>Fecha</th><th>Acción</th><th>Referencia</th></tr></thead><tbody>'+(audit||'<tr><td colspan="3" class="accounting-status">Sin cambios registrados.</td></tr>')+'</tbody></table></div></section></div>';
  }

  // ───────── Otras vistas
  function renderAccounts(){
    const labels={group:'Grupo',asset:'Activo',liability:'Pasivo',equity:'Patrimonio',income:'Ingreso',cost:'Costo',expense:'Gasto'};
    const sums=amountByAccount(),rows=records.accounts.filter(a=>a.is_active||Math.abs(balance(a,sums))>.004).map(a=>'<tr><td'+(a.account_type==='group'?'':' class="accounting-indent"')+'>'+esc(a.code)+'</td><td>'+(a.account_type==='group'?'<b>'+esc(a.name)+'</b>':esc(a.name))+'</td><td>'+esc(labels[a.account_type]||a.account_type)+'</td><td>'+esc(a.nature==='credit'?'Acreedora':'Deudora')+'</td><td class="accounting-right">'+(a.account_type==='group'?'':money(balance(a,sums)))+'</td></tr>').join('');
    return '<div class="accounting-view"><section class="accounting-panel"><h2>Plan de cuentas</h2><p>Cuentas activas enlazadas al libro diario.</p><div class="table-wrap"><table class="accounting-table"><thead><tr><th>Código</th><th>Cuenta</th><th>Clasificación</th><th>Naturaleza</th><th class="accounting-right">Saldo</th></tr></thead><tbody>'+rows+'</tbody></table></div></section></div>';
  }
  function renderJournal(){
    const byEntry={};records.lines.forEach(l=>(byEntry[l.entry_no]||(byEntry[l.entry_no]=[])).push(l));
    const acc=Object.fromEntries(records.accounts.map(a=>[a.code,a]));
    const rows=records.entries.slice().sort((a,b)=>b.entry_date.localeCompare(a.entry_date)||b.entry_no.localeCompare(a.entry_no)).map(e=>(byEntry[e.entry_no]||[]).sort((a,b)=>a.line_no-b.line_no).map(l=>'<tr><td>'+date(e.entry_date)+'</td><td>'+esc(e.entry_no)+'</td><td>'+esc(e.memo)+'</td><td>'+esc(l.account_code+' — '+(acc[l.account_code]?.name||''))+(l.party_name?'<br><small>'+esc(l.party_name)+'</small>':'')+'</td><td class="accounting-right">'+(Number(l.debit)?money(l.debit):'—')+'</td><td class="accounting-right">'+(Number(l.credit)?money(l.credit):'—')+'</td></tr>').join('')).join('');
    const debit=records.lines.reduce((s,l)=>s+Number(l.debit||0),0),credit=records.lines.reduce((s,l)=>s+Number(l.credit||0),0);
    return '<div class="accounting-view"><section class="accounting-panel"><h2>Libro diario</h2><p>Asientos ordenados por fecha; cada asiento cuadra en partida doble.</p><div class="table-wrap"><table class="accounting-table"><thead><tr><th>Fecha</th><th>Asiento</th><th>Concepto</th><th>Cuenta / auxiliar</th><th class="accounting-right">Débito</th><th class="accounting-right">Crédito</th></tr></thead><tbody>'+(rows||'<tr><td colspan="6" class="accounting-status">Aún no hay asientos contables.</td></tr>')+'</tbody><tfoot><tr><th colspan="4">Totales</th><th class="accounting-right">'+money(debit)+'</th><th class="accounting-right">'+money(credit)+'</th></tr></tfoot></table></div></section></div>';
  }
  function renderAuxiliary(){
    const acc=Object.fromEntries(records.accounts.map(a=>[a.code,a]));
    const group=(filter,sign)=>{const sums={};records.lines.filter(l=>filter(l.account_code)).forEach(l=>{const k=l.account_code+'|'+(l.party_name||'Sin auxiliar');const x=sums[k]||(sums[k]={code:l.account_code,party:l.party_name||'Sin auxiliar',v:0});x.v+=sign*(Number(l.credit||0)-Number(l.debit||0))});return Object.values(sums).filter(x=>Math.abs(x.v)>.004).sort((a,b)=>a.code.localeCompare(b.code)||a.party.localeCompare(b.party))};
    const aportes=group(c=>c.startsWith('31'),1),pagar=group(c=>c.startsWith('2'),1),cobrar=group(c=>['1140','1150','1160'].includes(c),-1);
    const table=(title,note,items,empty,totalLabel)=>'<section class="accounting-panel"><h2>'+title+'</h2><p>'+note+'</p><div class="table-wrap"><table class="accounting-table" style="min-width:520px"><thead><tr><th>Cuenta</th><th>Cuenta contable</th><th>Auxiliar</th><th class="accounting-right">Saldo</th></tr></thead><tbody>'+(items.map(x=>'<tr><td>'+esc(x.code)+'</td><td>'+esc(acc[x.code]?.name||'')+'</td><td>'+esc(x.party)+'</td><td class="accounting-right">'+money(x.v)+'</td></tr>').join('')||'<tr><td colspan="4" class="accounting-status">'+empty+'</td></tr>')+'</tbody><tfoot><tr><th colspan="3">'+totalLabel+'</th><th class="accounting-right">'+money(items.reduce((s,x)=>s+x.v,0))+'</th></tr></tfoot></table></div></section>';
    return '<div class="accounting-view">'+table('Aportes de los socios','Lo que cada socio ha puesto en GC. Es patrimonio de la empresa, no una deuda.',aportes,'Sin aportes registrados.','Total aportado')+table('Cuentas por pagar','Proveedores pendientes e impuestos por pagar a la DGII.',pagar,'No hay saldos por pagar.','Total por pagar')+table('Cuentas por cobrar','Ventas a crédito y retenciones de clientes.',cobrar,'No hay saldos por cobrar.','Total por cobrar')+'</div>';
  }

  function pageContent(view){
    return ({overview:renderBalance,transactions:renderExpenses,sales:renderSales,journal:renderJournal,accounts:renderAccounts,auxiliary:renderAuxiliary,reports:renderReports,closing:renderClosing}[view]||renderBalance)();
  }
  function shell(view){
    const heading='<div class="page-heading"><div><div class="eyebrow">CONTABILIDAD</div><h1>'+esc(views[view]||views.overview)+'</h1><p class="subtitle">Registros contables de GC Logis</p></div></div>';
    const nav='<nav class="accounting-subnav" aria-label="Secciones contables">'+SUBNAV.map(([k,l])=>'<button type="button" class="'+(view===k?'active':'')+'" data-accounting-view="'+k+'">'+l+'</button>').join('')+'</nav>';
    return nav+heading;
  }
  function showPanel(view,html,wire){
    const content=document.getElementById('pageContent');content.innerHTML=shell(view)+html;
    content.querySelectorAll('[data-accounting-view]').forEach(b=>b.addEventListener('click',()=>loadData().then(ok=>{if(ok)setView(b.dataset.accountingView)})));
    if(wire)wire(content);
  }
  async function runRpc(fn,payload,statusId,after){
    const st=document.getElementById(statusId);if(st)st.textContent='Guardando…';
    const {error}=await client().rpc(fn,payload);
    if(error){if(st)st.textContent='No se guardó: '+error.message;return false}
    await loadData();setView(after);return true;
  }
  function formJson(form){const f=new FormData(form),o={};for(const [k,v] of f.entries()){if(v instanceof File)continue;o[k]=typeof v==='string'?v.trim():v}return o}
  function setView(view){
    current=view;
    document.querySelectorAll('.module-nav[data-page],button[data-page="users"],button[data-page="settings"]').forEach(b=>{const a=b.dataset.page==='overview';b.classList.toggle('active',a);b.setAttribute('aria-current',a?'page':'false')});
    const primaryTabs=document.getElementById('primaryTabs');if(primaryTabs)primaryTabs.classList.remove('is-hidden');
    const primary=PRIMARY_FOR[view]||'overview';
    document.querySelectorAll('#primaryTabs .primary-tab[data-page]').forEach(b=>{const a=b.dataset.page===primary;b.classList.toggle('active',a);b.setAttribute('aria-selected',String(a))});
    const ap=document.querySelector('#primaryTabs .primary-tab.active'),ind=document.getElementById('tabIndicator');
    if(ap&&ind){ind.style.width=ap.offsetWidth+'px';ind.style.transform='translateX('+ap.offsetLeft+'px)'}
    const content=document.getElementById('pageContent');if(!content)return;
    window.__gcAccNav=shell(view);
    showPanel(view,pageContent(view),wireView);
    const crumb=document.getElementById('crumbPage');if(crumb)crumb.textContent=views[view]||views.overview;
  }
  function wireView(c){
    const on=(sel,fn)=>c.querySelectorAll(sel).forEach(b=>b.addEventListener('click',()=>fn(b)));
    on('[data-files]',b=>openFiles(b.dataset.files));
    on('[data-complete-606]',b=>{const e=records.expenses.find(x=>x.id===b.dataset.complete606);if(!e)return;showPanel('transactions',complete606Html(e),()=>document.getElementById('complete606Form').addEventListener('submit',saveComplete606))});
    on('[data-accounting-new]',()=>showPanel('transactions',formHtml(),wireExpenseForm));
    on('[data-payer]',b=>{const e=records.expenses.find(x=>x.id===b.dataset.payer);if(!e)return;showPanel('transactions',payerFormHtml(e),()=>document.getElementById('payerForm').addEventListener('submit',ev=>{ev.preventDefault();runRpc('set_expense_payer',{p:{id:e.id,paid_by:formJson(ev.currentTarget).paid_by}},'payerStatus','transactions')}))});
    on('[data-void-expense]',b=>{const e=records.expenses.find(x=>x.id===b.dataset.voidExpense);if(!e)return;showPanel('transactions',voidExpenseHtml(e),()=>document.getElementById('voidExpenseForm').addEventListener('submit',ev=>{ev.preventDefault();runRpc('void_accounting_expense',{p:Object.assign({id:e.id},formJson(ev.currentTarget))},'voidStatus','transactions')}))});
    on('[data-sale-new]',()=>showPanel('sales',saleFormHtml(),()=>document.getElementById('saleForm').addEventListener('submit',ev=>{ev.preventDefault();const o=formJson(ev.currentTarget);o.id='VT-'+String(o.sale_date).slice(0,4)+'-'+Date.now().toString(36).toUpperCase();runRpc('record_accounting_sale',{p:o},'saleStatus','sales')})));
    on('[data-sale-pay]',b=>{const s=records.sales.find(x=>x.id===b.dataset.salePay);if(!s)return;showPanel('sales',salePayHtml(s),()=>document.getElementById('salePayForm').addEventListener('submit',ev=>{ev.preventDefault();runRpc('record_sale_payment',{p:Object.assign({sale_id:s.id},formJson(ev.currentTarget))},'salePayStatus','sales')}))});
    on('[data-void-sale]',b=>{const s=records.sales.find(x=>x.id===b.dataset.voidSale);if(!s)return;showPanel('sales',voidSaleHtml(s),()=>document.getElementById('voidSaleForm').addEventListener('submit',ev=>{ev.preventDefault();runRpc('void_accounting_sale',{p:Object.assign({id:s.id},formJson(ev.currentTarget))},'voidSaleStatus','sales')}))});
    on('[data-voided-new]',()=>showPanel('sales',voidedFormHtml(),()=>document.getElementById('voidedForm').addEventListener('submit',ev=>{ev.preventDefault();runRpc('record_voided_ncf',{p:formJson(ev.currentTarget)},'voidedStatus','sales')})));
    const rp=c.querySelector('#reportPeriod');if(rp)rp.addEventListener('change',()=>{window.__gcReportPeriod=rp.value;setView('reports')});
    on('[data-export-dgii]',exportDgii);
    on('[data-amortize]',async b=>{b.disabled=true;const st=document.getElementById('closingStatus');const {data,error}=await client().rpc('post_amortizations',{p:{period:b.dataset.amortize}});if(error){st.textContent='No se registró: '+error.message;b.disabled=false;return}await loadData();setView('closing');document.getElementById('closingStatus').textContent='Amortización de '+b.dataset.amortize+': '+data+' asiento(s).'});
    on('[data-close]',b=>{if(b.dataset.armed!=='1'){b.dataset.armed='1';b.textContent='¿Cerrar '+b.dataset.close+'? Toca otra vez';return}b.disabled=true;runRpc('close_accounting_period',{p:{period:b.dataset.close}},'closingStatus','closing')});
    on('[data-reopen]',b=>{const p=b.dataset.reopen;showPanel('closing','<div class="accounting-panel"><h2>Reabrir '+esc(p)+'</h2><p>Si el mes ya se declaró, cualquier cambio obliga a rectificar en la DGII.</p><form id="reopenForm" class="accounting-form"><label class="wide">Motivo<input name="reason" required></label><div class="accounting-actions"><button type="button" class="outline-btn" data-accounting-open="closing">Cancelar</button><button type="submit" class="primary-btn">Reabrir mes</button></div><div id="reopenStatus" class="accounting-status wide" role="status"></div></form></div>',()=>document.getElementById('reopenForm').addEventListener('submit',ev=>{ev.preventDefault();runRpc('reopen_accounting_period',{p:{period:p,reason:formJson(ev.currentTarget).reason}},'reopenStatus','closing')}))});
  }

  // ───────── Datos
  function loadData(){
    if(!client())return Promise.resolve(false);
    if(loadPromise)return loadPromise;
    loadPromise=(async()=>{
      const c=client();
      const results=await Promise.all([
        c.from('accounting_accounts').select('*').order('code'),
        c.from('accounting_investors').select('*').order('account_code'),
        c.from('accounting_expenses').select('*').order('expense_date',{ascending:false}),
        c.from('accounting_journal_entries').select('*').order('entry_date',{ascending:false}),
        c.from('accounting_journal_lines').select('*').order('line_no')
      ]);
      const bad=results.find(r=>r.error);
      if(bad){showError('No se pudieron cargar los libros contables. '+bad.error.message);return false}
      const opt=async(q)=>{const r=await q;return r.error?[]:(r.data||[])};
      const [files,sales,voided,salePayments,amortizations,closed,audit,me]=await Promise.all([
        opt(c.from('accounting_expense_files').select('*').order('created_at')),
        opt(c.from('accounting_sales').select('*').order('sale_date',{ascending:false})),
        opt(c.from('accounting_voided_ncf').select('*')),
        opt(c.from('accounting_sale_payments').select('*')),
        opt(c.from('accounting_amortizations').select('*')),
        opt(c.from('accounting_closed_periods').select('*')),
        opt(c.from('accounting_audit_log').select('*').order('id',{ascending:false}).limit(50)),
        (async()=>{const u=(await c.auth.getUser()).data.user;if(!u)return null;const r=await c.from('profiles').select('role').eq('id',u.id).maybeSingle();return r.data})()
      ]);
      isAdmin=me?.role==='admin';
      records={accounts:results[0].data||[],investors:results[1].data||[],expenses:results[2].data||[],entries:results[3].data||[],lines:results[4].data||[],files,sales,voided,salePayments,amortizations,closed,audit};
      if(!records.accounts.length){showError('Tu usuario no tiene acceso a la contabilidad. Pídele a un administrador que te lo active.');return false}
      return true;
    })().catch(error=>{showError('No se pudieron cargar los libros contables. '+(error?.message||error));return false}).finally(()=>{loadPromise=null});
    return loadPromise;
  }
  function showError(msg){const content=document.getElementById('pageContent');if(content)content.innerHTML='<div class="page-heading"><div><div class="eyebrow">CONTABILIDAD</div><h1>Libros contables</h1></div></div><section class="accounting-panel"><div class="accounting-error">'+esc(msg)+'</div></section>'}
  function mount(){
    if(started||!client())return;started=true;
    const bar=document.getElementById('primaryTabs');
    if(!bar)return;
    document.querySelectorAll('#primaryTabs [data-page],#sideNav [data-page="overview"]').forEach(b=>b.addEventListener('click',e=>{const v=VIEW_FOR_PRIMARY[b.dataset.page];if(!v)return;e.preventDefault();e.stopPropagation();loadData().then(ok=>{if(ok)setView(v)})},true));
    bar.insertAdjacentHTML('afterend','<style>'+"\n.accounting-subnav{display:flex;flex-wrap:wrap;gap:7px;margin:0 0 22px}.accounting-subnav button{border:1px solid var(--line);border-radius:8px;padding:8px 11px;background:var(--surface);color:var(--muted);font-size:11px;font-weight:600;white-space:nowrap}.accounting-subnav button:hover{color:var(--text);border-color:var(--blue)}.accounting-subnav button.active{background:var(--navy);border-color:var(--navy);color:#fff}.accounting-view{display:grid;gap:16px}.accounting-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.accounting-card,.accounting-panel{background:var(--surface);border:1px solid var(--line);border-radius:13px;box-shadow:var(--shadow)}.accounting-card{padding:16px 18px}.accounting-card small,.accounting-muted{color:var(--muted)}.accounting-card small{font-size:12px}.accounting-card strong{display:block;font-size:22px;margin-top:10px}.accounting-panel{padding:18px}.accounting-panel h2{font-size:15px;margin:0 0 6px}.accounting-panel p{color:var(--muted);font-size:12px;margin:0 0 14px}.accounting-table{width:100%;border-collapse:collapse;min-width:720px}.accounting-table th{font-size:10px;text-transform:uppercase;color:var(--muted);text-align:left;letter-spacing:.06em;padding:11px 9px;border-bottom:1px solid var(--line)}.accounting-table td{font-size:12px;padding:11px 9px;border-bottom:1px solid var(--line);vertical-align:top}.accounting-table tfoot th,.accounting-table tbody th{font-size:12px;text-transform:none;letter-spacing:0;color:var(--text);padding:12px 9px}.accounting-right{text-align:right;white-space:nowrap}.accounting-toolbar{display:flex;justify-content:space-between;align-items:center;gap:14px;margin-bottom:14px}.accounting-toolbar h2{margin:0}.accounting-status{color:var(--muted);padding:14px 0;font-size:13px}.accounting-error{color:var(--red);background:color-mix(in srgb,var(--red) 8%,var(--surface));padding:12px;border-radius:8px;margin:12px 0}.accounting-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.accounting-form label{display:grid;gap:5px;font-size:12px;font-weight:600}.accounting-form input,.accounting-form select,.accounting-form textarea{width:100%;padding:10px 11px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--text)}.accounting-form .wide{grid-column:1/-1}.accounting-form [hidden]{display:none!important}.accounting-actions{display:flex;gap:8px;justify-content:flex-end;grid-column:1/-1}.accounting-notice{font-size:12px;color:var(--muted);padding:12px 0}.accounting-badge{display:inline-flex;padding:3px 8px;border-radius:20px;background:var(--surface-2);color:var(--muted);font-size:10px}.accounting-indent{padding-left:24px!important}.table-wrap{overflow-x:auto}@media(max-width:900px){.accounting-cards{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:700px){.accounting-cards{gap:9px}.accounting-card{padding:13px}.accounting-card strong{font-size:18px}.accounting-toolbar{align-items:flex-start;flex-direction:column}.accounting-form{grid-template-columns:1fr}.accounting-form .wide{grid-column:auto}.accounting-actions{grid-column:auto}}\n"+'</style>');
    client().auth.onAuthStateChange((_event,session)=>{if(session?.user)loadData().then(ok=>{if(ok&&document.querySelector('.module-nav[data-page="overview"]')?.classList.contains('active'))setView(current)})});
    client().auth.getSession().then(({data})=>{if(data?.session?.user)loadData().then(ok=>{if(ok&&document.querySelector('.module-nav[data-page="overview"]')?.classList.contains('active'))setView(current)})});
  }
  document.addEventListener('click',e=>{const open=e.target.closest('[data-accounting-open]');if(open){setView(open.dataset.accountingOpen)}});
  mount();
})();
