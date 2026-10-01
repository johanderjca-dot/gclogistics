(() => {
  const config = window.GC_SUPABASE_CONFIG;
  const authGate = document.createElement('div');
  authGate.className = 'auth-gate';
  authGate.id = 'authGate';
  authGate.innerHTML = `<form class="auth-card" id="signInForm" aria-label="Iniciar sesión en GC Logis"><section class="auth-visual"><img class="auth-logo" src="/assets/gc-logis-white.svg" alt="GC Logis"><div class="auth-copy"><h2>Logística que mueve tu negocio</h2><p>Tu operación y contabilidad, organizadas en un solo lugar.</p></div><img class="auth-cargo" src="/assets/gc-logis-cargo.svg" alt="Camión de carga en un centro logístico"></section><section class="auth-form-pane"><h1>Inicia sesión</h1><p>Accede al panel interno de GC Logis.</p><label class="field"><span>Correo electrónico</span><input name="email" type="email" autocomplete="username" required></label><label class="field"><span>Contraseña</span><input name="password" type="password" autocomplete="current-password" required></label><button class="primary-btn" type="submit" style="width:100%;justify-content:center">Iniciar sesión</button><div class="auth-error" id="authError" role="status"></div></section></form>`;
  document.body.append(authGate);

  const unavailable = (message) => {
    document.getElementById('authError').textContent = message;
    document.getElementById('authError').style.color = 'var(--red)';
  };
  if (!config?.url || !config?.publishableKey || !window.supabase?.createClient) {
    unavailable('No se pudo iniciar la conexión con Supabase.');
    return;
  }

  const client = window.supabase.createClient(config.url, config.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  window.gcSupabase = client;
  let currentUser = null;
  let currentProfile = null;

  const avatarMarkup = (profile) => {
    const avatar = document.getElementById('navAvatar');
    if (!avatar) return;
    const path = profile?.avatar_path;
    if (path) {
      const { data } = client.storage.from('avatars').getPublicUrl(path);
      avatar.innerHTML = `<img src="${data.publicUrl}" alt="Foto de perfil" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
    } else avatar.textContent = (profile?.full_name || currentUser?.email || 'GC').slice(0, 2).toUpperCase();
    avatar.title = 'Cambiar foto de perfil';
    avatar.style.cursor = 'pointer';
  };

  async function loadProfile() {
    if (!currentUser) return;
    const { data, error } = await client.from('profiles').select('id,email,full_name,role,avatar_path').eq('id', currentUser.id).maybeSingle();
    if (error) throw error;
    currentProfile = data;
    const name = document.querySelector('.profile-name');
    const role = document.querySelector('.profile-role');
    if (name) name.textContent = data?.full_name || currentUser.email;
    if (role) role.textContent = data?.role === 'admin' ? 'Administrador' : 'GC Logis';
    const pageName = document.getElementById('profileName');
    const pageEmail = document.getElementById('profileEmail');
    const nameField = document.querySelector('#profileForm [name="full_name"]');
    if (pageName) pageName.textContent = data?.full_name || currentUser.email;
    if (pageEmail) pageEmail.textContent = currentUser.email || '';
    if (nameField) nameField.value = data?.full_name || '';
    avatarMarkup(data);
  }

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  window.gcUsersPageHTML = () => `<div class="page-heading"><div><div class="eyebrow">PANEL INTERNO</div><h1>Usuarios</h1><p class="subtitle">Administra el acceso y tu perfil de GC Logis.</p></div></div>
    <section class="panel" style="margin-bottom:16px"><div class="panel-head"><div><h2 class="panel-title">Mi perfil</h2><div class="panel-sub">Actualiza tu nombre y foto de perfil.</div></div></div><div class="user-row"><span class="avatar" id="profileAvatar">GC</span><div><b id="profileName">Cargando perfil…</b><div class="panel-sub" id="profileEmail"></div><button class="outline-btn" id="chooseAvatar" type="button" style="margin-top:8px">Cambiar foto</button></div></div><form id="profileForm" style="max-width:440px;margin-top:16px"><label class="field"><span>Nombre</span><input name="full_name" maxlength="120" required></label><button class="outline-btn" type="submit">Guardar perfil</button><span id="profileStatus" class="success-note" style="margin-left:10px"></span></form></section>
    <section class="panel section-panel"><div class="section-toolbar"><div><h2 class="panel-title">Equipo</h2><div class="panel-sub">Las invitaciones se envían por correo electrónico.</div></div></div><form id="inviteForm" class="user-actions" style="flex-wrap:wrap"><input class="search" name="full_name" placeholder="Nombre" aria-label="Nombre del usuario"><input class="search" name="email" type="email" placeholder="correo@empresa.com" aria-label="Correo del usuario" required><button class="primary-btn" type="submit">Invitar usuario</button></form><div id="inviteStatus" class="panel-sub" style="margin:10px 0"></div><div class="table-wrap"><table class="table"><thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Desde</th></tr></thead><tbody id="usersBody"><tr><td class="table-empty" colspan="4">Cargando usuarios…</td></tr></tbody></table></div><div id="usersAdminNote" class="notice" style="display:none;margin-top:16px">Tu cuenta aún no tiene permisos de administrador. Un administrador debe asignarte ese rol en Supabase.</div></section>
    <div style="display:flex;justify-content:flex-end;margin-top:14px"><button class="outline-btn" id="signOutButton">Cerrar sesión</button></div>`;

  async function loadUsers() {
    const body = document.getElementById('usersBody');
    if (!body) return;
    const isAdmin = currentProfile?.role === 'admin';
    document.getElementById('inviteForm').style.display = isAdmin ? 'flex' : 'none';
    document.getElementById('usersAdminNote').style.display = isAdmin ? 'none' : 'flex';
    const { data, error } = await client.from('profiles').select('id,email,full_name,role,created_at').order('created_at', { ascending: false });
    if (error) { body.innerHTML = `<tr><td colspan="4" class="table-empty">No se pudieron cargar perfiles: ${esc(error.message)}</td></tr>`; return; }
    body.innerHTML = (data || []).map((u) => `<tr><td>${esc(u.full_name || '—')}</td><td>${esc(u.email)}</td><td><span class="status">${u.role === 'admin' ? 'Administrador' : 'Usuario'}</span></td><td>${new Date(u.created_at).toLocaleDateString('es-DO')}</td></tr>`).join('') || '<tr><td colspan="4" class="table-empty">Todavía no hay usuarios.</td></tr>';
  }

  async function signedIn(user) {
    currentUser = user;
    authGate.style.display = 'none';
    try { await loadProfile(); }
    catch (error) {
      authGate.style.display = 'grid';
      unavailable(`Falta preparar los perfiles en Supabase: ${error.message}`);
      return;
    }
    if (document.getElementById('usersBody')) loadUsers();
  }

  document.getElementById('signInForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const button = event.currentTarget.querySelector('button');
    button.disabled = true;
    unavailable('');
    const { data, error } = await client.auth.signInWithPassword({ email: form.get('email'), password: form.get('password') });
    button.disabled = false;
    if (error) return unavailable(error.message);
    await signedIn(data.user);
  });

  document.addEventListener('click', async (event) => {
    const target = event.target.closest('[data-page="users"]');
    if (target) setTimeout(loadUsers, 0);
    if (event.target.closest('#chooseAvatar')) document.getElementById('avatarFileGlobal')?.click();
    if (event.target.closest('#navAvatar')) document.getElementById('avatarFileGlobal')?.click();
    if (event.target.closest('#signOutButton')) await client.auth.signOut();
  });

  document.addEventListener('submit', async (event) => {
    if (event.target.id === 'inviteForm') {
      event.preventDefault();
      const status = document.getElementById('inviteStatus');
      const fields = new FormData(event.target);
      status.textContent = 'Enviando invitación…';
      const { error } = await client.functions.invoke('admin-create-user', { body: { email: fields.get('email'), full_name: fields.get('full_name') } });
      status.textContent = error ? `No se pudo enviar: ${error.message}` : 'Invitación enviada. La persona recibirá un correo para activar su cuenta.';
      status.className = error ? 'auth-error' : 'success-note';
      if (!error) { event.target.reset(); loadUsers(); }
    }
    if (event.target.id === 'profileForm') {
      event.preventDefault();
      const name = new FormData(event.target).get('full_name').trim();
      const { error } = await client.from('profiles').update({ full_name: name, updated_at: new Date().toISOString() }).eq('id', currentUser.id);
      const status = document.getElementById('profileStatus');
      status.textContent = error ? `Error: ${error.message}` : 'Perfil guardado.';
      if (!error) { await loadProfile(); document.getElementById('profileName').textContent = name || currentUser.email; }
    }
  });

  document.addEventListener('change', async (event) => {
    if (event.target.id !== 'avatarFileGlobal') return;
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      const status = document.getElementById('profileStatus'); if (status) status.textContent = 'Usa JPG, PNG o WebP de hasta 2 MB.';
      return;
    }
    const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${currentUser.id}/avatar.${extension}`;
    const status = document.getElementById('profileStatus'); if (status) status.textContent = 'Subiendo foto…';
    const { error: uploadError } = await client.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) { if (status) status.textContent = `No se pudo subir: ${uploadError.message}`; return; }
    const { error } = await client.from('profiles').update({ avatar_path: path, updated_at: new Date().toISOString() }).eq('id', currentUser.id);
    if (error) { if (status) status.textContent = `No se pudo guardar el perfil: ${error.message}`; return; }
    await loadProfile();
    const profileAvatar = document.getElementById('profileAvatar');
    avatarMarkup(currentProfile);
    const { data } = client.storage.from('avatars').getPublicUrl(path);
    if (profileAvatar) profileAvatar.innerHTML = `<img src="${data.publicUrl}?v=${Date.now()}" alt="Foto de perfil" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
    if (status) status.textContent = 'Foto actualizada.';
  });

  client.auth.onAuthStateChange((_event, session) => {
    if (session?.user) signedIn(session.user);
    else { currentUser = null; currentProfile = null; authGate.style.display = 'grid'; }
  });
  client.auth.getSession().then(({ data, error }) => {
    if (error) unavailable(error.message);
    if (data.session?.user) signedIn(data.session.user);
  });
})();
