// GC Logis · módulo de Prospectos (captación de empresas para Premier Pack Renacimiento).
(() => {
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const today = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
  const fmtDate = (v) => v ? new Date(String(v).slice(0, 10) + 'T12:00:00').toLocaleDateString('es-DO') : '—';
  const client = () => window.gcSupabase;

  const STATUSES = [['nuevo', 'Nuevo'], ['contactado', 'Contactado'], ['interesado', 'Interesado'], ['cotizacion', 'Cotización enviada'], ['cliente', 'Cliente'], ['descartado', 'Descartado']];
  const PLANS = [['start', 'START · 5–70 lb'], ['plus', 'PLUS · 71–300 lb'], ['upgrade', 'UPGRADE · 301–800 lb'], ['max', 'MAX · 801+ lb']];
  const SOURCES = ['Google Maps', 'Instagram', 'Facebook', 'Directorio', 'Referido', 'Visita', 'Otro'];
  const PROVINCES = ['Distrito Nacional', 'Santo Domingo', 'Santiago', 'La Altagracia', 'San Cristóbal', 'La Vega', 'Puerto Plata', 'San Pedro de Macorís', 'La Romana', 'Duarte', 'Espaillat', 'Peravia', 'Monseñor Nouel', 'Sánchez Ramírez', 'Monte Plata', 'Azua', 'San Juan', 'Barahona', 'Valverde', 'Hermanas Mirabal', 'María Trinidad Sánchez', 'Samaná', 'Hato Mayor', 'El Seibo', 'Monte Cristi', 'Dajabón', 'Santiago Rodríguez', 'Bahoruco', 'Independencia', 'Pedernales', 'Elías Piña', 'San José de Ocoa'];
  const label = (list, v) => { const x = list.find((i) => i[0] === v); return x ? x[1] : (v || '—'); };
  const opts = (list, selected, empty) => (empty != null ? '<option value="">' + esc(empty) + '</option>' : '') + list.map((i) => { const [v, l] = Array.isArray(i) ? i : [i, i]; return '<option value="' + esc(v) + '"' + (String(selected || '') === String(v) ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join('');

  let rows = [], loaded = false, loading = null, isAdmin = false;
  let filters = { q: '', status: '', province: '', industry: '' };

  const STYLE = '<style id="prospectsStyle">' +
    '.pr-cards{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;margin-bottom:16px}' +
    '.pr-card{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:12px 14px;text-align:left;color:var(--text);box-shadow:var(--shadow)}' +
    '.pr-card small{display:block;color:var(--muted);font-size:10px;font-weight:600}.pr-card strong{display:block;font-size:20px;margin-top:4px;letter-spacing:-.03em}' +
    '.pr-card.active{border-color:var(--navy);box-shadow:0 0 0 2px rgba(9,45,69,.12)}[data-theme="dark"] .pr-card.active{border-color:var(--lime)}' +
    '.pr-panel{background:var(--surface);border:1px solid var(--line);border-radius:13px;box-shadow:var(--shadow);padding:18px}' +
    '.pr-toolbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:14px}.pr-toolbar .search{flex:1;min-width:180px}' +
    '.pr-toolbar select{padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--text);font-size:11px}' +
    '.pr-table td{vertical-align:top}.pr-table td small{display:block;color:var(--muted);font-size:10px;margin-top:2px}' +
    '.pr-links a{color:var(--blue);text-decoration:none;font-size:11px;margin-right:8px;white-space:nowrap}.pr-links a:hover{text-decoration:underline}' +
    '.pr-status{padding:5px 7px;border-radius:7px;border:1px solid var(--line);background:var(--surface-2);color:var(--text);font-size:10px}' +
    '.pr-status[data-s="interesado"],.pr-status[data-s="cotizacion"]{background:#eef6d3;color:#3e5206}.pr-status[data-s="cliente"]{background:#d9efc0;color:#2f4a05;font-weight:700}.pr-status[data-s="descartado"]{color:var(--muted);text-decoration:line-through}' +
    '[data-theme="dark"] .pr-status[data-s]{background:var(--surface-2);color:var(--text)}' +
    '.pr-due{color:var(--red);font-weight:650}' +
    '.pr-form{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.pr-form label{display:grid;gap:5px;font-size:11px;font-weight:650}' +
    '.pr-form input,.pr-form select,.pr-form textarea{width:100%;padding:9px 11px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--text);font:inherit;font-weight:400}' +
    '.pr-form .wide{grid-column:1/-1}.pr-actions{grid-column:1/-1;display:flex;justify-content:flex-end;gap:9px}.pr-msg{grid-column:1/-1;font-size:11px;color:var(--muted);min-height:15px}' +
    '.pr-error{color:var(--red);font-size:12px;padding:14px}.pr-help{font-size:11px;color:var(--muted);line-height:1.6;margin:0 0 12px}.pr-help code{background:var(--surface-2);padding:1px 5px;border-radius:5px}' +
    '@media(max-width:1100px){.pr-cards{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:700px){.pr-cards{grid-template-columns:repeat(2,minmax(0,1fr))}.pr-form{grid-template-columns:1fr}}' +
    '</style>';

  // ───────── Navegación
  function activateNav() {
    document.querySelectorAll('#sideNav [data-page],button[data-page="users"],button[data-page="settings"]').forEach((b) => {
      const a = b.dataset.page === 'prospects'; b.classList.toggle('active', a); b.setAttribute('aria-current', a ? 'page' : 'false');
    });
    const tabs = document.getElementById('primaryTabs'); if (tabs) tabs.classList.add('is-hidden');
    const crumb = document.getElementById('crumbPage'); if (crumb) crumb.textContent = 'Prospectos';
  }
  function page(html) {
    const content = document.getElementById('pageContent'); if (!content) return null;
    if (!document.getElementById('prospectsStyle')) document.head.insertAdjacentHTML('beforeend', STYLE);
    content.innerHTML = '<div class="page-heading"><div><div class="eyebrow">CAPTACIÓN · PREMIER PACK RENACIMIENTO</div><h1>Prospectos</h1><p class="subtitle">Empresas por contactar y su seguimiento.</p></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end"><button class="outline-btn" type="button" data-pr="import">Importar CSV</button><button class="outline-btn" type="button" data-pr="export">Exportar</button><button class="primary-btn" type="button" data-pr="new" aria-label="Nuevo prospecto"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 5v14M5 12h14"/></svg><span class="btn-text">Nuevo prospecto</span></button></div></div>' + html;
    content.querySelector('[data-pr="new"]').addEventListener('click', () => showForm(null));
    content.querySelector('[data-pr="import"]').addEventListener('click', showImport);
    content.querySelector('[data-pr="export"]').addEventListener('click', exportCsv);
    return content;
  }
  async function open() {
    activateNav();
    page('<section class="pr-panel"><div class="empty-note"><b>Cargando prospectos…</b></div></section>');
    const ok = await load(true);
    if (ok) renderList();
  }

  // ───────── Datos
  function load(force) {
    if (!client()) return Promise.resolve(false);
    if (loaded && !force) return Promise.resolve(true);
    if (loading) return loading;
    loading = (async () => {
      const c = client();
      const all = []; const size = 1000;
      for (let from = 0; ; from += size) {
        const r = await c.from('prospects').select('*').order('created_at', { ascending: false }).range(from, from + size - 1);
        if (r.error) { showError(r.error); return false; }
        all.push(...(r.data || [])); if (!r.data || r.data.length < size) break;
      }
      rows = all; loaded = true;
      try { const u = (await c.auth.getUser()).data.user; if (u) { const p = await c.from('profiles').select('role').eq('id', u.id).maybeSingle(); isAdmin = p.data?.role === 'admin'; } } catch (_) { isAdmin = false; }
      return true;
    })().catch((e) => { showError(e); return false; }).finally(() => { loading = null; });
    return loading;
  }
  function showError(err) {
    const msg = err?.message || String(err || '');
    const missing = /prospects|relation|schema cache/i.test(msg) && /exist|find|schema/i.test(msg);
    page('<section class="pr-panel"><div class="pr-error">' + (missing ? 'La tabla de prospectos todavía no existe en Supabase. Hay que ejecutar <b>supabase/prospects.sql</b> en el SQL Editor.' : 'No se pudieron cargar los prospectos. ' + esc(msg)) + '</div></section>');
  }

  // ───────── Lista
  function filtered() {
    const q = filters.q.trim().toLowerCase();
    return rows.filter((r) => (!filters.status || r.status === filters.status) && (!filters.province || r.province === filters.province) && (!filters.industry || r.industry === filters.industry) &&
      (!q || [r.company_name, r.industry, r.city, r.province, r.phone, r.whatsapp, r.instagram, r.email, r.notes, r.owner_name].some((v) => String(v || '').toLowerCase().includes(q))));
  }
  const digits = (v) => String(v || '').replace(/\D/g, '');
  function waLink(r) { let d = digits(r.whatsapp || r.phone); if (!d) return ''; if (d.length === 10) d = '1' + d; return 'https://wa.me/' + d; }
  function igLink(v) { const h = String(v || '').trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/\/.*$/, ''); return h ? 'https://instagram.com/' + encodeURIComponent(h) : ''; }
  function webLink(v) { const s = String(v || '').trim(); if (!s) return ''; return /^https?:\/\//i.test(s) ? s : 'https://' + s; }

  function renderList() {
    const counts = Object.fromEntries(STATUSES.map(([k]) => [k, 0])); rows.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });
    const cards = '<section class="pr-cards">' + STATUSES.map(([k, l]) => '<button type="button" class="pr-card' + (filters.status === k ? ' active' : '') + '" data-card="' + k + '"><small>' + esc(l) + '</small><strong>' + counts[k] + '</strong></button>').join('') + '</section>';
    const provinces = [...new Set(rows.map((r) => r.province).filter(Boolean))].sort();
    const industries = [...new Set(rows.map((r) => r.industry).filter(Boolean))].sort();
    const list = filtered();
    const due = today();
    const body = list.length ? list.map((r) => {
      const links = [waLink(r) && '<a href="' + esc(waLink(r)) + '" target="_blank" rel="noopener">WhatsApp</a>', r.phone && '<a href="tel:' + esc(digits(r.phone)) + '">' + esc(r.phone) + '</a>', igLink(r.instagram) && '<a href="' + esc(igLink(r.instagram)) + '" target="_blank" rel="noopener">Instagram</a>', r.email && '<a href="mailto:' + esc(r.email) + '">Correo</a>', webLink(r.website) && '<a href="' + esc(webLink(r.website)) + '" target="_blank" rel="noopener">Web</a>'].filter(Boolean).join('');
      const follow = r.next_follow_up ? '<span class="' + (r.next_follow_up <= due && !['cliente', 'descartado'].includes(r.status) ? 'pr-due' : '') + '">' + fmtDate(r.next_follow_up) + '</span>' : '—';
      return '<tr><td><b>' + esc(r.company_name) + '</b><small>' + esc(r.industry || '') + '</small></td>' +
        '<td>' + esc(r.city || '—') + '<small>' + esc(r.province || '') + '</small></td>' +
        '<td class="pr-links">' + (links || '<span style="color:var(--muted)">—</span>') + '</td>' +
        '<td><select class="pr-status" data-s="' + esc(r.status) + '" data-status="' + esc(r.id) + '" aria-label="Estado">' + opts(STATUSES, r.status) + '</select></td>' +
        '<td>' + esc(r.estimated_plan ? label(PLANS, r.estimated_plan).split(' ·')[0] : '—') + '<small>' + esc(r.owner_name || '') + '</small></td>' +
        '<td>' + follow + '</td>' +
        '<td><button class="outline-btn" type="button" style="padding:5px 10px;font-size:11px" data-edit="' + esc(r.id) + '">Editar</button></td></tr>';
    }).join('') : '<tr><td class="table-empty" colspan="7"><div class="empty-note"><b>' + (rows.length ? 'Ningún prospecto coincide con el filtro' : 'Todavía no hay prospectos') + '</b>' + (rows.length ? '' : '<span>Agrega uno o importa una lista en CSV.</span>') + '</div></td></tr>';
    const c = page(cards + '<section class="pr-panel"><div class="pr-toolbar"><input class="search" id="prQ" placeholder="Buscar empresa, rubro, ciudad, teléfono…" value="' + esc(filters.q) + '" aria-label="Buscar">' +
      '<select id="prStatus" aria-label="Estado">' + opts(STATUSES, filters.status, 'Todos los estados') + '</select>' +
      '<select id="prProvince" aria-label="Provincia">' + opts(provinces, filters.province, 'Todas las provincias') + '</select>' +
      '<select id="prIndustry" aria-label="Rubro">' + opts(industries, filters.industry, 'Todos los rubros') + '</select>' +
      '<span style="font-size:11px;color:var(--muted)">' + list.length + ' de ' + rows.length + '</span></div>' +
      '<div class="table-wrap"><table class="table pr-table"><thead><tr><th>Empresa</th><th>Ubicación</th><th>Contacto</th><th>Estado</th><th>Plan · responsable</th><th>Seguimiento</th><th></th></tr></thead><tbody>' + body + '</tbody></table></div></section>');
    if (!c) return;
    const q = c.querySelector('#prQ');
    q.addEventListener('input', () => { filters.q = q.value; const pos = q.selectionStart; renderList(); const n = document.getElementById('prQ'); n.focus(); n.setSelectionRange(pos, pos); });
    c.querySelector('#prStatus').addEventListener('change', (e) => { filters.status = e.target.value; renderList(); });
    c.querySelector('#prProvince').addEventListener('change', (e) => { filters.province = e.target.value; renderList(); });
    c.querySelector('#prIndustry').addEventListener('change', (e) => { filters.industry = e.target.value; renderList(); });
    c.querySelectorAll('[data-card]').forEach((b) => b.addEventListener('click', () => { filters.status = filters.status === b.dataset.card ? '' : b.dataset.card; renderList(); }));
    c.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => showForm(rows.find((r) => r.id === b.dataset.edit))));
    c.querySelectorAll('[data-status]').forEach((s) => s.addEventListener('change', async () => {
      const id = s.dataset.status, status = s.value; s.disabled = true;
      const patch = { status }; if (status !== 'nuevo') patch.last_contact_at = today();
      const { data, error } = await client().from('prospects').update(patch).eq('id', id).select().maybeSingle();
      if (error) { alertLine('No se cambió el estado: ' + error.message); s.disabled = false; return; }
      rows = rows.map((r) => r.id === id ? data : r); renderList();
    }));
  }
  function alertLine(msg, ok) { const p = document.querySelector('.pr-toolbar'); if (p) { let el = document.getElementById('prAlert'); if (!el) { el = document.createElement('div'); el.id = 'prAlert'; el.className = 'pr-error'; el.style.padding = '0 0 10px'; p.after(el); } el.style.color = ok ? 'var(--green)' : 'var(--red)'; el.textContent = msg; } }

  // ───────── Formulario
  function showForm(r) {
    const v = (k) => esc(r ? r[k] || '' : '');
    const html = '<section class="pr-panel"><h2 class="panel-title" style="margin-bottom:14px">' + (r ? 'Editar prospecto' : 'Nuevo prospecto') + '</h2><form id="prForm" class="pr-form">' +
      '<label class="wide">Empresa *<input name="company_name" required value="' + v('company_name') + '"></label>' +
      '<label>Rubro<input name="industry" list="prIndustries" value="' + v('industry') + '" placeholder="Ej. Repuestos, cosméticos…"></label>' +
      '<label>Provincia<select name="province">' + opts(PROVINCES, r?.province, '—') + '</select></label>' +
      '<label>Ciudad / sector<input name="city" value="' + v('city') + '"></label>' +
      '<label>Teléfono<input name="phone" value="' + v('phone') + '"></label>' +
      '<label>WhatsApp<input name="whatsapp" value="' + v('whatsapp') + '"></label>' +
      '<label>Instagram<input name="instagram" value="' + v('instagram') + '" placeholder="@usuario"></label>' +
      '<label>Correo<input name="email" type="email" value="' + v('email') + '"></label>' +
      '<label>Web<input name="website" value="' + v('website') + '"></label>' +
      '<label>Fuente<select name="source">' + opts(SOURCES, r?.source, '—') + '</select></label>' +
      '<label class="wide">Dirección<input name="address" value="' + v('address') + '"></label>' +
      '<label>Estado<select name="status">' + opts(STATUSES, r?.status || 'nuevo') + '</select></label>' +
      '<label>Plan estimado<select name="estimated_plan">' + opts(PLANS, r?.estimated_plan, '—') + '</select></label>' +
      '<label>Responsable<input name="owner_name" value="' + v('owner_name') + '"></label>' +
      '<label>Próximo seguimiento<input name="next_follow_up" type="date" value="' + v('next_follow_up') + '"></label>' +
      '<label>Último contacto<input name="last_contact_at" type="date" value="' + v('last_contact_at') + '"></label>' +
      '<label class="wide">Notas<textarea name="notes" rows="3">' + v('notes') + '</textarea></label>' +
      '<datalist id="prIndustries">' + [...new Set(rows.map((x) => x.industry).filter(Boolean))].sort().map((i) => '<option value="' + esc(i) + '">').join('') + '</datalist>' +
      '<div class="pr-actions">' + (r && isAdmin ? '<button type="button" class="outline-btn" id="prDelete" style="margin-right:auto;color:var(--red)">Eliminar</button>' : '') +
      '<button type="button" class="outline-btn" id="prCancel">Cancelar</button><button type="submit" class="primary-btn">Guardar</button></div><div class="pr-msg" id="prMsg" role="status"></div></form></section>';
    const c = page(html); if (!c) return;
    c.querySelector('#prCancel').addEventListener('click', renderList);
    const del = c.querySelector('#prDelete');
    if (del) del.addEventListener('click', async () => {
      if (del.dataset.armed !== '1') { del.dataset.armed = '1'; del.textContent = '¿Eliminar? Toca otra vez'; return; }
      const { error } = await client().from('prospects').delete().eq('id', r.id);
      if (error) { c.querySelector('#prMsg').textContent = 'No se eliminó: ' + error.message; return; }
      rows = rows.filter((x) => x.id !== r.id); renderList();
    });
    c.querySelector('#prForm').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const msg = c.querySelector('#prMsg'); msg.textContent = 'Guardando…';
      const o = {}; new FormData(ev.currentTarget).forEach((val, k) => { const s = String(val).trim(); o[k] = s === '' ? null : s; });
      const q = r ? client().from('prospects').update(o).eq('id', r.id) : client().from('prospects').insert(o);
      const { data, error } = await q.select().maybeSingle();
      if (error) { msg.textContent = /duplicate|unique/i.test(error.message) ? 'Ya existe un prospecto con ese nombre en esa ciudad.' : 'No se guardó: ' + error.message; return; }
      rows = r ? rows.map((x) => x.id === r.id ? data : x) : [data].concat(rows); renderList();
    });
  }

  // ───────── Importar / exportar CSV
  const HEADER_MAP = { empresa: 'company_name', nombre: 'company_name', company: 'company_name', company_name: 'company_name', negocio: 'company_name', rubro: 'industry', industria: 'industry', categoria: 'industry', industry: 'industry', provincia: 'province', province: 'province', ciudad: 'city', sector: 'city', city: 'city', telefono: 'phone', phone: 'phone', tel: 'phone', whatsapp: 'whatsapp', instagram: 'instagram', ig: 'instagram', correo: 'email', email: 'email', web: 'website', website: 'website', sitio: 'website', direccion: 'address', address: 'address', fuente: 'source', source: 'source', estado: 'status', status: 'status', plan: 'estimated_plan', estimated_plan: 'estimated_plan', responsable: 'owner_name', owner_name: 'owner_name', notas: 'notes', notes: 'notes', seguimiento: 'next_follow_up', next_follow_up: 'next_follow_up' };
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z_]/g, '');
  function parseCsv(text) {
    const sep = (text.split('\n')[0].match(/;/g) || []).length > (text.split('\n')[0].match(/,/g) || []).length ? ';' : (text.includes('\t') && !text.split('\n')[0].includes(',') ? '\t' : ',');
    const out = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
      else if (ch === '"') q = true; else if (ch === sep) { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); cell = ''; if (row.some((x) => x.trim())) out.push(row); row = []; }
      else cell += ch;
    }
    row.push(cell); if (row.some((x) => x.trim())) out.push(row);
    return out;
  }
  function showImport() {
    const c = page('<section class="pr-panel"><h2 class="panel-title" style="margin-bottom:10px">Importar prospectos</h2>' +
      '<p class="pr-help">Sube un archivo CSV o pega la tabla (desde Google Sheets o Excel). La primera fila deben ser los encabezados. Columnas reconocidas: <code>empresa</code>, <code>rubro</code>, <code>provincia</code>, <code>ciudad</code>, <code>telefono</code>, <code>whatsapp</code>, <code>instagram</code>, <code>correo</code>, <code>web</code>, <code>direccion</code>, <code>fuente</code>, <code>notas</code>. Las empresas que ya están (mismo nombre y ciudad) se saltan.</p>' +
      '<div class="pr-form"><label class="wide">Archivo CSV<input type="file" id="prFile" accept=".csv,text/csv,text/plain"></label><label class="wide">…o pega aquí<textarea id="prPaste" rows="8" placeholder="empresa,rubro,provincia,ciudad,telefono,instagram"></textarea></label>' +
      '<div class="pr-actions"><button type="button" class="outline-btn" id="prCancel">Cancelar</button><button type="button" class="primary-btn" id="prRun">Importar</button></div><div class="pr-msg" id="prMsg" role="status"></div></div></section>');
    if (!c) return;
    c.querySelector('#prCancel').addEventListener('click', renderList);
    c.querySelector('#prRun').addEventListener('click', async () => {
      const msg = c.querySelector('#prMsg'); const file = c.querySelector('#prFile').files[0];
      const text = file ? await file.text() : c.querySelector('#prPaste').value;
      const table = parseCsv(text.replace(/^﻿/, ''));
      if (table.length < 2) { msg.textContent = 'No encontré filas para importar.'; return; }
      const keys = table[0].map((h) => HEADER_MAP[norm(h)] || null);
      if (!keys.includes('company_name')) { msg.textContent = 'Falta la columna "empresa".'; return; }
      const seen = new Set(rows.map((r) => (r.company_name || '').toLowerCase().trim() + '|' + (r.city || '').toLowerCase().trim()));
      const items = []; let skipped = 0;
      table.slice(1).forEach((cells) => {
        const o = {}; keys.forEach((k, i) => { if (k && cells[i] != null && String(cells[i]).trim()) o[k] = String(cells[i]).trim(); });
        if (!o.company_name) return;
        if (o.status) { const s = STATUSES.find(([k, l]) => norm(k) === norm(o.status) || norm(l) === norm(o.status)); o.status = s ? s[0] : 'nuevo'; }
        if (o.estimated_plan) { const p = PLANS.find(([k]) => norm(o.estimated_plan).startsWith(k)); o.estimated_plan = p ? p[0] : null; }
        if (o.next_follow_up && !/^\d{4}-\d{2}-\d{2}$/.test(o.next_follow_up)) delete o.next_follow_up;
        const key = o.company_name.toLowerCase() + '|' + (o.city || '').toLowerCase();
        if (seen.has(key)) { skipped++; return; } seen.add(key); items.push(o);
      });
      if (!items.length) { msg.textContent = 'No hay prospectos nuevos (' + skipped + ' ya existían).'; return; }
      let ok = 0; const failed = [];
      for (let i = 0; i < items.length; i += 200) {
        msg.textContent = 'Importando… ' + ok + ' de ' + items.length;
        const chunk = items.slice(i, i + 200);
        const { error } = await client().from('prospects').insert(chunk);
        if (!error) { ok += chunk.length; continue; }
        for (const one of chunk) { const r = await client().from('prospects').insert(one); if (r.error) { if (/duplicate|unique/i.test(r.error.message)) skipped++; else failed.push(one.company_name + ': ' + r.error.message); } else ok++; }
      }
      await load(true); renderList();
      alertLine('Importados ' + ok + '. Saltados por repetidos: ' + skipped + '.' + (failed.length ? ' Con error: ' + failed.slice(0, 5).join(' · ') : ''), !failed.length);
    });
  }
  function exportCsv() {
    const cols = [['company_name', 'empresa'], ['industry', 'rubro'], ['province', 'provincia'], ['city', 'ciudad'], ['phone', 'telefono'], ['whatsapp', 'whatsapp'], ['instagram', 'instagram'], ['email', 'correo'], ['website', 'web'], ['address', 'direccion'], ['source', 'fuente'], ['status', 'estado'], ['estimated_plan', 'plan'], ['owner_name', 'responsable'], ['next_follow_up', 'seguimiento'], ['notes', 'notas']];
    const cell = (v) => { const s = String(v == null ? '' : v); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const csv = '﻿' + [cols.map((c) => c[1]).join(',')].concat(filtered().map((r) => cols.map(([k]) => cell(r[k])).join(','))).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = 'prospectos-' + today() + '.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  // ───────── Montaje
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-page="prospects"]'); if (!b) return;
    e.preventDefault(); e.stopPropagation(); open();
  }, true);
})();
