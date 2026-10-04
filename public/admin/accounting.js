(() => {
  const money = (n) => new Intl.NumberFormat('es-DO',{style:'currency',currency:'DOP',minimumFractionDigits:2}).format(Number(n||0));
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const date = (v) => v ? new Date(v+'T12:00:00').toLocaleDateString('es-DO') : '—';
  const views = {overview:'Balance general',transactions:'Gastos y facturas',balance:'Balance general',journal:'Libro diario',accounts:'Plan de cuentas',auxiliary:'Auxiliar de cuentas por pagar'};
  let records={accounts:[],investors:[],expenses:[],entries:[],lines:[]}, started=false, loadPromise=null, current='overview';
  const client=()=>window.gcSupabase;
  function amountByAccount(){
    const sums={};
    records.lines.forEach(l=>{const x=sums[l.account_code]||(sums[l.account_code]={debit:0,credit:0});x.debit+=Number(l.debit||0);x.credit+=Number(l.credit||0)});
    return sums;
  }
  function balance(account,sums){
    const v=sums[account.code]||{debit:0,credit:0};
    return account.nature==='credit'?v.credit-v.debit:v.debit-v.credit;
  }
  function detailAccounts(){
    return records.accounts.filter(a=>a.account_type!=='group'&&a.is_active);
  }
  function renderBalance(){
    const sums=amountByAccount(), rows=detailAccounts().map(a=>({account:a,value:balance(a,sums)}));
    const assets=rows.filter(x=>x.account.account_type==='asset').reduce((s,x)=>s+x.value,0);
    const liabilities=rows.filter(x=>x.account.account_type==='liability').reduce((s,x)=>s+x.value,0);
    const equity=rows.filter(x=>x.account.account_type==='equity').reduce((s,x)=>s+x.value,0);
    const income=rows.filter(x=>x.account.account_type==='income').reduce((s,x)=>s+x.value,0);
    const costs=rows.filter(x=>['cost','expense'].includes(x.account.account_type)).reduce((s,x)=>s+x.value,0);
    const result=income-costs, equityTotal=equity+result;
    const tableRows=[
      ['Activos',rows.filter(x=>x.account.account_type==='asset')],
      ['Pasivos',rows.filter(x=>x.account.account_type==='liability')],
      ['Patrimonio',rows.filter(x=>x.account.account_type==='equity')]
    ];
    const body=tableRows.map(([group,items])=>'<tr><th colspan="2">'+group+'</th><th class="accounting-right">'+money(items.reduce((s,x)=>s+x.value,0))+'</th></tr>'+items.filter(x=>Math.abs(x.value)>.004).map(x=>'<tr><td>'+esc(x.account.code)+'</td><td>'+esc(x.account.name)+'</td><td class="accounting-right">'+money(x.value)+'</td></tr>').join('')).join('');
    return '<div class="accounting-view"><section class="accounting-cards">'+
      card('Activos',money(assets),'Saldos deudores registrados')+
      card('Pasivos',money(liabilities),'Saldos pendientes registrados')+
      card('Patrimonio',money(equityTotal),'Capital más resultado acumulado')+
      card('Gastos del período',money(costs),'Costos y gastos contabilizados')+
      '</section><section class="accounting-panel"><div class="accounting-toolbar"><div><h2>Balance general</h2><p>Activos = pasivos + patrimonio. Montos en pesos dominicanos.</p></div><button class="outline-btn" data-accounting-open="accounts">Plan de cuentas</button></div><div class="table-wrap"><table class="accounting-table"><thead><tr><th>Código</th><th>Cuenta</th><th class="accounting-right">Saldo</th></tr></thead><tbody>'+body+
      '<tr><th colspan="2">Resultado acumulado del ejercicio</th><th class="accounting-right">'+money(result)+'</th></tr><tr><th colspan="2">Total pasivos y patrimonio</th><th class="accounting-right">'+money(liabilities+equityTotal)+'</th></tr></tbody></table></div></section>'+
      '<section class="accounting-panel"><div class="accounting-toolbar"><div><h2>Movimientos recientes</h2><p>Facturas y registros ingresados</p></div><button class="outline-btn" data-accounting-open="transactions">Ver gastos</button></div>'+recentExpenses()+'</section></div>';
  }
  function card(label,value,note){return '<article class="accounting-card"><small>'+label+'</small><strong>'+value+'</strong><small>'+note+'</small></article>'}
  function recentExpenses(){
    const rows=records.expenses.slice().sort((a,b)=>b.expense_date.localeCompare(a.expense_date)).slice(0,5);
    if(!rows.length)return '<div class="accounting-status">Aún no hay gastos contables registrados.</div>';
    return '<div class="table-wrap"><table class="accounting-table"><thead><tr><th>Fecha</th><th>Proveedor</th><th>Concepto</th><th>NCF</th><th class="accounting-right">Total</th></tr></thead><tbody>'+rows.map(e=>'<tr><td>'+date(e.expense_date)+'</td><td>'+esc(e.supplier)+'</td><td>'+esc(e.concept)+'</td><td>'+esc(e.ncf)+'</td><td class="accounting-right">'+money(e.total_amount)+'</td></tr>').join('')+'</tbody></table></div>';
  }
  function renderExpenses(){
    const data=records.expenses.slice().sort((a,b)=>b.expense_date.localeCompare(a.expense_date));
    const rows=data.map(e=>'<tr><td>'+date(e.expense_date)+'</td><td>'+esc(e.supplier)+'<br><small>'+esc(e.supplier_rnc||'')+'</small></td><td>'+esc(e.invoice_reference||'—')+'<br><span class="accounting-badge">'+esc(e.ncf)+'</span></td><td>'+esc(e.concept)+'<br><small>'+esc(e.account_code)+'</small></td><td class="accounting-right">'+money(e.net_amount)+'</td><td class="accounting-right">'+money(e.itbis_amount)+'</td><td class="accounting-right">'+money(e.total_amount)+'</td></tr>').join('');
    return '<div class="accounting-view"><section class="accounting-panel"><div class="accounting-toolbar"><div><h2>Gastos y facturas</h2><p>Comprobantes y asientos asociados a cada factura.</p></div><button class="primary-btn" data-accounting-new>Registrar gasto</button></div><div class="table-wrap"><table class="accounting-table"><thead><tr><th>Fecha</th><th>Proveedor / RNC</th><th>Factura / NCF</th><th>Concepto / cuenta</th><th class="accounting-right">Subtotal</th><th class="accounting-right">ITBIS</th><th class="accounting-right">Total</th></tr></thead><tbody>'+(rows||'<tr><td colspan="7" class="accounting-status">Aún no hay gastos registrados.</td></tr>')+'</tbody></table></div><div class="accounting-notice">Al registrar un gasto pagado por los inversionistas, el sistema crea el asiento y distribuye el saldo por igual entre los cuatro auxiliares.</div></section></div>';
  }
  function renderAccounts(){
    const labels={group:'Grupo',asset:'Activo',liability:'Pasivo',equity:'Patrimonio',income:'Ingreso',cost:'Costo',expense:'Gasto'};
    const sums=amountByAccount(),rows=records.accounts.map(a=>'<tr><td>'+esc(a.code)+'</td><td>'+esc(a.name)+'</td><td>'+esc(labels[a.account_type]||a.account_type)+'</td><td>'+esc(a.nature==='credit'?'Acreedora':'Deudora')+'</td><td class="accounting-right">'+money(balance(a,sums))+'</td></tr>').join('');
    return '<div class="accounting-view"><section class="accounting-panel"><h2>Plan de cuentas</h2><p>Cuentas enlazadas al libro diario.</p><div class="table-wrap"><table class="accounting-table"><thead><tr><th>Código</th><th>Cuenta</th><th>Clasificación</th><th>Naturaleza</th><th class="accounting-right">Saldo</th></tr></thead><tbody>'+rows+'</tbody></table></div></section></div>';
  }
  function renderJournal(){
    const byEntry={};records.lines.forEach(l=>(byEntry[l.entry_no]||(byEntry[l.entry_no]=[])).push(l));
    const acc=Object.fromEntries(records.accounts.map(a=>[a.code,a]));
    const rows=records.entries.slice().sort((a,b)=>b.entry_date.localeCompare(a.entry_date)).map(e=>(byEntry[e.entry_no]||[]).sort((a,b)=>a.line_no-b.line_no).map(l=>'<tr><td>'+date(e.entry_date)+'</td><td>'+esc(e.entry_no)+'</td><td>'+esc(e.memo)+'</td><td>'+esc(l.account_code+' — '+(acc[l.account_code]?.name||''))+(l.party_name?'<br><small>'+esc(l.party_name)+'</small>':'')+'</td><td class="accounting-right">'+(Number(l.debit)?money(l.debit):'—')+'</td><td class="accounting-right">'+(Number(l.credit)?money(l.credit):'—')+'</td></tr>').join('')).join('');
    const debit=records.lines.reduce((s,l)=>s+Number(l.debit||0),0),credit=records.lines.reduce((s,l)=>s+Number(l.credit||0),0);
    return '<div class="accounting-view"><section class="accounting-panel"><h2>Libro diario</h2><p>Asientos ordenados por fecha; cada asiento debe cuadrar en partida doble.</p><div class="table-wrap"><table class="accounting-table"><thead><tr><th>Fecha</th><th>Asiento</th><th>Concepto</th><th>Cuenta / auxiliar</th><th class="accounting-right">Débito</th><th class="accounting-right">Crédito</th></tr></thead><tbody>'+(rows||'<tr><td colspan="6" class="accounting-status">Aún no hay asientos contables.</td></tr>')+'</tbody><tfoot><tr><th colspan="4">Totales</th><th class="accounting-right">'+money(debit)+'</th><th class="accounting-right">'+money(credit)+'</th></tr></tfoot></table></div></section></div>';
  }
  function renderAuxiliary(){
    const sums={};records.lines.filter(l=>String(l.account_code).startsWith('2')).forEach(l=>{const k=l.account_code+'|'+(l.party_name||'Sin auxiliar');const x=sums[k]||(sums[k]={code:l.account_code,party:l.party_name||'Sin auxiliar',debit:0,credit:0});x.debit+=Number(l.debit||0);x.credit+=Number(l.credit||0)});
    const acc=Object.fromEntries(records.accounts.map(a=>[a.code,a]));
    const rows=Object.values(sums).filter(x=>Math.abs(x.credit-x.debit)>.004).sort((a,b)=>a.code.localeCompare(b.code)||a.party.localeCompare(b.party)).map(x=>'<tr><td>'+esc(x.code)+'</td><td>'+esc(acc[x.code]?.name||'')+'</td><td>'+esc(x.party)+'</td><td class="accounting-right">'+money(x.credit-x.debit)+'</td></tr>').join('');
    const total=Object.values(sums).reduce((s,x)=>s+x.credit-x.debit,0);
    return '<div class="accounting-view"><section class="accounting-panel"><h2>Auxiliar de cuentas por pagar</h2><p>Saldos agrupados por cuenta contable y acreedor.</p><div class="table-wrap"><table class="accounting-table"><thead><tr><th>Cuenta</th><th>Cuenta contable</th><th>Acreedor / auxiliar</th><th class="accounting-right">Saldo</th></tr></thead><tbody>'+(rows||'<tr><td colspan="4" class="accounting-status">Aún no hay saldos por pagar.</td></tr>')+'</tbody><tfoot><tr><th colspan="3">Total cuentas por pagar</th><th class="accounting-right">'+money(total)+'</th></tr></tfoot></table></div><div class="accounting-notice">Cada suplidor o acreedor se mantiene en su auxiliar bajo la cuenta correspondiente del plan de cuentas.</div></section></div>';
  }
  function formHtml(){
    const options=detailAccounts().filter(a=>['asset','expense'].includes(a.account_type)).map(a=>'<option value="'+esc(a.code)+'">'+esc(a.code+' — '+a.name)+'</option>').join('');
    return '<div class="accounting-panel"><div class="accounting-toolbar"><div><h2>Registrar gasto</h2><p>Se creará el asiento y se distribuirá entre los cuatro inversionistas.</p></div></div><form id="accountingExpenseForm" class="accounting-form"><label>Fecha<input name="expense_date" type="date" required value="'+new Date().toISOString().slice(0,10)+'"></label><label>Proveedor<input name="supplier" required></label><label>RNC del proveedor<input name="supplier_rnc"></label><label>Factura o referencia<input name="invoice_reference"></label><label>NCF<input name="ncf" required value="SIN NCF"></label><label>Cuenta contable<select name="account_code" required>'+options+'</select></label><label>Concepto<input name="concept" required></label><label>Subtotal<input name="net_amount" type="number" step="0.01" min="0" required></label><label>ITBIS<input name="itbis_amount" type="number" step="0.01" min="0" value="0" required></label><label>Nota de clasificación<input name="classification_note"></label><div class="accounting-actions"><button type="button" class="outline-btn" data-accounting-open="transactions">Cancelar</button><button type="submit" class="primary-btn">Guardar gasto y asiento</button></div><div id="accountingFormStatus" class="accounting-status wide" role="status"></div></form></div>';
  }
  function pageContent(view){
    if(view==='overview'||view==='balance')return renderBalance();
    if(view==='transactions')return renderExpenses();
    if(view==='accounts')return renderAccounts();
    if(view==='journal')return renderJournal();
    return renderAuxiliary();
  }
  function setView(view){
    current=view;
    document.querySelectorAll('.module-nav[data-page],button[data-page="users"],button[data-page="settings"]').forEach(b=>{
      const active=b.dataset.page==='overview';
      b.classList.toggle('active',active);
      b.setAttribute('aria-current',active?'page':'false');
    });
    const primary=view==='transactions'?'transactions':view==='auxiliary'?'payables':'overview';
    document.querySelectorAll('#primaryTabs .primary-tab[data-page]').forEach(b=>{const active=b.dataset.page===primary;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active))});
    const activePrimary=document.querySelector('#primaryTabs .primary-tab.active'),indicator=document.getElementById('tabIndicator');
    if(activePrimary&&indicator){indicator.style.width=activePrimary.offsetWidth+'px';indicator.style.transform='translateX('+activePrimary.offsetLeft+'px)'}
    const content=document.getElementById('pageContent');if(!content)return;
    const heading='<div class="page-heading"><div><div class="eyebrow">CONTABILIDAD</div><h1>'+esc(views[view]||views.auxiliary)+'</h1><p class="subtitle">Registros contables de GC Logis</p></div></div>';
    const items=[['overview','Balance general'],['transactions','Gastos y facturas'],['journal','Libro diario'],['accounts','Plan de cuentas'],['auxiliary','Libro auxiliar']];
    const nav='<nav class="accounting-subnav" aria-label="Secciones contables">'+items.map(([key,label])=>'<button type="button" class="'+(view===key?'active':'')+'" data-accounting-view="'+key+'">'+label+'</button>').join('')+'</nav>';
    content.innerHTML=nav+heading+pageContent(view);document.getElementById('crumbPage').textContent=views[view]||views.auxiliary;
    content.querySelectorAll('#accountingSubnav [data-accounting-view],.accounting-subnav [data-accounting-view]').forEach(b=>b.addEventListener('click',()=>{const nextView=b.dataset.accountingView;loadData().then(ok=>{if(ok)setView(nextView)})}));
    if(view==='transactions'&&document.querySelector('[data-accounting-new]'))document.querySelector('[data-accounting-new]').addEventListener('click',()=>{document.getElementById('pageContent').innerHTML=nav+heading+formHtml();document.getElementById('accountingExpenseForm').addEventListener('submit',saveExpense)});
    document.querySelectorAll('[data-accounting-open]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.accountingOpen)));
  }
  async function saveExpense(event){
    event.preventDefault();const form=event.currentTarget,status=document.getElementById('accountingFormStatus'),button=form.querySelector('button[type=submit]');button.disabled=true;status.textContent='Guardando…';
    const f=new FormData(form),year=String(f.get('expense_date')).slice(0,4),id='GC-'+year+'-'+Date.now().toString(36).toUpperCase();
    const payload={id:id,expense_date:f.get('expense_date'),supplier:f.get('supplier'),supplier_rnc:f.get('supplier_rnc')||null,invoice_reference:f.get('invoice_reference')||null,ncf:f.get('ncf')||'SIN NCF',concept:f.get('concept'),account_code:f.get('account_code'),net_amount:Number(f.get('net_amount')),itbis_amount:Number(f.get('itbis_amount')),total_amount:Number(f.get('net_amount'))+Number(f.get('itbis_amount')),classification_note:f.get('classification_note')||null};
    const {error}=await client().rpc('record_accounting_expense',{p_expense:payload});
    if(error){status.textContent='No se guardó: '+error.message;button.disabled=false;return}
    await loadData();setView('transactions');
  }
  function loadData(){
    if(!client())return Promise.resolve(false);
    if(loadPromise)return loadPromise;
    loadPromise=(async()=>{
      const results=await Promise.all([
        client().from('accounting_accounts').select('*').order('code'),
        client().from('accounting_investors').select('*').order('account_code'),
        client().from('accounting_expenses').select('*').order('expense_date',{ascending:false}),
        client().from('accounting_journal_entries').select('*').order('entry_date',{ascending:false}),
        client().from('accounting_journal_lines').select('*').order('line_no')
      ]);
      const bad=results.find(r=>r.error);
      if(bad){showError('No se pudieron cargar los libros contables. Verifica la configuración de Supabase. '+bad.error.message);return false}
      records={accounts:results[0].data||[],investors:results[1].data||[],expenses:results[2].data||[],entries:results[3].data||[],lines:results[4].data||[]};
      return true;
    })().catch(error=>{showError('No se pudieron cargar los libros contables. '+(error?.message||error));return false}).finally(()=>{loadPromise=null});
    return loadPromise;
  }
  function showError(msg){const content=document.getElementById('pageContent');if(content)content.innerHTML='<div class="page-heading"><div><div class="eyebrow">CONTABILIDAD</div><h1>Libros contables</h1></div></div><section class="accounting-panel"><div class="accounting-error">'+esc(msg)+'</div></section>'}
  function mount(){
    if(started||!client())return;started=true;
    const bar=document.getElementById('primaryTabs');
    if(!bar)return;
    document.querySelectorAll('#primaryTabs [data-page],#sideNav [data-page="overview"]').forEach(b=>b.addEventListener('click',e=>{const p=b.dataset.page;if(!['overview','transactions','payables'].includes(p))return;e.preventDefault();e.stopPropagation();const v=p==='overview'?'overview':p==='transactions'?'transactions':'auxiliary';loadData().then(ok=>{if(ok)setView(v)})}));
    bar.insertAdjacentHTML('afterend','<style>'+"\n.accounting-subnav{display:flex;flex-wrap:wrap;gap:7px;margin:0 0 22px}.accounting-subnav button{border:1px solid var(--line);border-radius:8px;padding:8px 11px;background:var(--surface);color:var(--muted);font-size:11px;font-weight:600;white-space:nowrap}.accounting-subnav button:hover{color:var(--text);border-color:var(--blue)}.accounting-subnav button.active{background:var(--navy);border-color:var(--navy);color:#fff}.accounting-view{display:grid;gap:16px}.accounting-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.accounting-card,.accounting-panel{background:var(--surface);border:1px solid var(--line);border-radius:13px;box-shadow:var(--shadow)}.accounting-card{padding:16px 18px}.accounting-card small,.accounting-muted{color:var(--muted)}.accounting-card small{font-size:12px}.accounting-card strong{display:block;font-size:22px;margin-top:10px}.accounting-panel{padding:18px}.accounting-panel h2{font-size:15px;margin:0 0 6px}.accounting-panel p{color:var(--muted);font-size:12px;margin:0 0 14px}.accounting-table{width:100%;border-collapse:collapse;min-width:720px}.accounting-table th{font-size:10px;text-transform:uppercase;color:var(--muted);text-align:left;letter-spacing:.06em;padding:11px 9px;border-bottom:1px solid var(--line)}.accounting-table td{font-size:12px;padding:11px 9px;border-bottom:1px solid var(--line);vertical-align:top}.accounting-table tfoot th{font-size:12px;text-transform:none;letter-spacing:0;color:var(--text);padding:12px 9px}.accounting-right{text-align:right;white-space:nowrap}.accounting-tabs{display:flex;gap:6px;align-items:center}.accounting-toolbar{display:flex;justify-content:space-between;align-items:center;gap:14px;margin-bottom:14px}.accounting-toolbar h2{margin:0}.accounting-status{color:var(--muted);padding:14px 0;font-size:13px}.accounting-error{color:var(--red);background:color-mix(in srgb,var(--red) 8%,var(--surface));padding:12px;border-radius:8px;margin:12px 0}.accounting-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.accounting-form label{display:grid;gap:5px;font-size:12px;font-weight:600}.accounting-form input,.accounting-form select,.accounting-form textarea{width:100%;padding:10px 11px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--text)}.accounting-form .wide{grid-column:1/-1}.accounting-actions{display:flex;gap:8px;justify-content:flex-end;grid-column:1/-1}.accounting-notice{font-size:12px;color:var(--muted);padding:12px 0}.accounting-badge{display:inline-flex;padding:3px 8px;border-radius:20px;background:var(--surface-2);color:var(--muted);font-size:10px}.accounting-indent{padding-left:24px!important}@media(max-width:900px){.accounting-cards{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:700px){.accounting-cards{gap:9px}.accounting-card{padding:13px}.accounting-card strong{font-size:18px}.accounting-toolbar{align-items:flex-start;flex-direction:column}.accounting-form{grid-template-columns:1fr}.accounting-form .wide{grid-column:auto}.accounting-actions{grid-column:auto}}\n"+'</style>');
    client().auth.onAuthStateChange((_event,session)=>{if(session?.user)loadData().then(ok=>{if(ok&&document.querySelector('.module-nav[data-page="overview"]')?.classList.contains('active'))setView(current)})});
    client().auth.getSession().then(({data})=>{if(data?.session?.user)loadData().then(ok=>{if(ok&&document.querySelector('.module-nav[data-page="overview"]')?.classList.contains('active'))setView(current)})});
  }
  function handleDocClick(e){const open=e.target.closest('[data-accounting-open]');if(open){setView(open.dataset.accountingOpen);return}}
  function syncModuleNav(){
    if(!document.querySelector('.accounting-subnav'))return;
    const accounting=document.querySelector('.module-nav[data-page="overview"]');
    const users=document.querySelector('button[data-page="users"]');
    const settings=document.querySelector('button[data-page="settings"]');
    if(accounting){accounting.classList.add('active');accounting.setAttribute('aria-current','page')}
    if(users){users.classList.remove('active');users.setAttribute('aria-current','false')}
    if(settings){settings.classList.remove('active');settings.setAttribute('aria-current','false')}
  }
  const navObserver=new MutationObserver(syncModuleNav);
  navObserver.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  document.addEventListener('click',handleDocClick);
  mount();
})();