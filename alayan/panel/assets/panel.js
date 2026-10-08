// Utilidades comunes del panel: llamadas a la API, barra superior, avisos
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function api(url, { method = 'GET', body, file } = {}) {
  const opts = { method, headers: {} };
  if (file) { opts.body = file; opts.headers['Content-Type'] = file.type || 'application/octet-stream'; }
  else if (body !== undefined) { opts.body = JSON.stringify(body); opts.headers['Content-Type'] = 'application/json'; }
  // URL absoluta: si se abrió el panel como http://usuario:clave@host/, una relativa haría fallar fetch()
  const r = await fetch(location.origin + url, opts);
  if (r.status === 401 && !url.startsWith('/api/auth/login')) {
    location.href = '/login?next=' + encodeURIComponent(location.pathname);
    throw new Error('La sesión ha caducado.');
  }
  const data = (r.headers.get('content-type') || '').includes('json') ? await r.json() : null;
  if (!r.ok) throw new Error(data?.error || (r.status === 413 ? 'El archivo es demasiado grande.' : `Error ${r.status}`));
  return data;
}

function toast(msg, kind = 'ok') {
  let box = document.getElementById('toast');
  if (!box) { box = document.createElement('div'); box.id = 'toast'; document.body.append(box); }
  const el = document.createElement('div');
  el.className = kind;
  el.textContent = msg;
  box.append(el);
  setTimeout(() => el.remove(), kind === 'error' ? 6000 : 3500);
}

const ROLE_NAMES = { admin: 'Administrador', gestor: 'Gestor de reservas' };

// Pinta la barra superior y devuelve el usuario con sesión
async function initPanel(active) {
  const me = await api('/api/auth/me');
  const links = [
    ['reservas', '/reservas', 'Reservas', ['admin', 'gestor']],
    ['web', '/admin', 'Contenido web', ['admin']],
    ['tarifas', '/admin/tarifas', 'Tarifas', ['admin']],
    ['flota', '/admin/flota', 'Flota', ['admin']],
    ['usuarios', '/admin/usuarios', 'Usuarios', ['admin']]
  ].filter(l => l[3].includes(me.role));

  const bar = document.createElement('header');
  bar.className = 'topbar';
  bar.innerHTML = `
    <div class="brand">ALAYAN <span>· PANEL</span></div>
    <nav class="tabs">${links.map(([key, href, text]) => `<a href="${href}" class="${key === active ? 'on' : ''}">${text}</a>`).join('')}</nav>
    <div class="who">
      <span title="${esc(ROLE_NAMES[me.role])}">${esc(me.name || me.username)}</span>
      <a class="btn ghost small" href="/" target="_blank">Ver web ↗</a>
      <button class="ghost small" id="pwBtn">Contraseña</button>
      <button class="ghost small" id="logoutBtn">Salir</button>
    </div>`;
  document.body.prepend(bar);

  document.getElementById('logoutBtn').onclick = async () => {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
    location.href = '/login';
  };
  document.getElementById('pwBtn').onclick = openPasswordDialog;
  return me;
}

function openPasswordDialog() {
  const dlg = document.createElement('dialog');
  dlg.innerHTML = `
    <form method="dialog">
      <h2>Cambiar mi contraseña</h2>
      <div><label>Contraseña actual</label><input type="password" name="current" autocomplete="current-password" required></div>
      <div><label>Nueva contraseña (mín. 8 caracteres)</label><input type="password" name="next" autocomplete="new-password" minlength="8" required></div>
      <div><label>Repite la nueva</label><input type="password" name="repeat" autocomplete="new-password" minlength="8" required></div>
      <div class="actions"><button type="button" class="ghost" value="cancel">Cancelar</button><button type="submit">Guardar</button></div>
    </form>`;
  document.body.append(dlg);
  const form = dlg.querySelector('form');
  dlg.querySelector('[value=cancel]').onclick = () => dlg.close();
  dlg.addEventListener('close', () => dlg.remove());
  form.onsubmit = async e => {
    e.preventDefault();
    const { current, next, repeat } = Object.fromEntries(new FormData(form));
    if (next !== repeat) return toast('Las contraseñas nuevas no coinciden.', 'error');
    try {
      await api('/api/auth/password', { method: 'POST', body: { current, next } });
      dlg.close();
      toast('Contraseña cambiada.');
    } catch (err) { toast(err.message, 'error'); }
  };
  dlg.showModal();
}
