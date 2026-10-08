// Usuarios y sesiones. Contraseñas con scrypt; la sesión es un token aleatorio en
// una cookie HttpOnly (en la BBDD solo se guarda su hash).
const crypto = require('node:crypto');

const ROLES = ['admin', 'gestor']; // admin: todo · gestor: solo reservas
const COOKIE = 'alayan_sid';
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const MIN_PASSWORD = 8;

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password), salt, 64);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

function verifyPassword(password, stored) {
  const [alg, salt, hash] = String(stored).split('$');
  if (alg !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const actual = crypto.scryptSync(String(password), Buffer.from(salt, 'base64'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

// Para que un usuario inexistente tarde lo mismo que una contraseña errónea
const DUMMY_HASH = hashPassword(crypto.randomBytes(16).toString('hex'));
const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');

function readCookie(req, name) {
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

const homeFor = user => (user.role === 'admin' ? '/admin' : '/reservas');

function createAuth(db, { secure }) {
  db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL CHECK (role IN ('admin','gestor')),
    pass_hash TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_login TEXT
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
  `);

  const q = {
    count: db.prepare('SELECT COUNT(*) AS n FROM users'),
    byName: db.prepare('SELECT * FROM users WHERE username = ?'),
    byId: db.prepare('SELECT * FROM users WHERE id = ?'),
    list: db.prepare('SELECT id, username, name, role, active, created_at, last_login FROM users ORDER BY role, username'),
    activeAdmins: db.prepare(`SELECT COUNT(*) AS n FROM users WHERE role='admin' AND active=1`),
    insert: db.prepare('INSERT INTO users (username, name, role, pass_hash) VALUES (?, ?, ?, ?)'),
    touchLogin: db.prepare(`UPDATE users SET last_login = datetime('now') WHERE id = ?`),
    addSession: db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)'),
    session: db.prepare(`SELECT u.id, u.username, u.name, u.role FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1`),
    endSession: db.prepare('DELETE FROM sessions WHERE token_hash = ?'),
    endUserSessions: db.prepare('DELETE FROM sessions WHERE user_id = ?'),
    endOtherSessions: db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?'),
    purge: db.prepare('DELETE FROM sessions WHERE expires_at <= ?')
  };
  q.purge.run(Date.now());

  const cookieOpts = { httpOnly: true, sameSite: 'strict', secure, path: '/' };

  // ---------- Usuarios ----------
  function validatePassword(password) {
    if (typeof password !== 'string' || password.length < MIN_PASSWORD) throw new Error(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`);
    if (password.length > 200) throw new Error('Contraseña demasiado larga.');
  }

  function createUser({ username, name, role, password }) {
    username = String(username ?? '').trim();
    if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username)) throw new Error('Usuario: 3-32 caracteres (letras, números, punto, guion).');
    if (!ROLES.includes(role)) throw new Error('Rol no válido.');
    validatePassword(password);
    if (q.byName.get(username)) throw new Error('Ya existe un usuario con ese nombre.');
    const info = q.insert.run(username, String(name ?? '').trim().slice(0, 80), role, hashPassword(password));
    return info.lastInsertRowid;
  }

  // Cambios hechos por un admin sobre otro usuario (o sobre sí mismo, solo el nombre)
  function updateUser(id, changes, actor) {
    const user = q.byId.get(id);
    if (!user) throw new Error('Usuario no encontrado.');
    const self = user.id === actor.id;
    const role = changes.role ?? user.role;
    const active = changes.active === undefined ? user.active : (changes.active ? 1 : 0);
    if (!ROLES.includes(role)) throw new Error('Rol no válido.');
    if (self && (role !== user.role || active !== user.active)) throw new Error('No puedes cambiar tu propio rol ni desactivarte.');
    if (user.role === 'admin' && user.active && (role !== 'admin' || !active) && q.activeAdmins.get().n <= 1)
      throw new Error('Debe quedar al menos un administrador activo.');

    const name = changes.name === undefined ? user.name : String(changes.name).trim().slice(0, 80);
    let passHash = user.pass_hash;
    if (changes.password !== undefined) { validatePassword(changes.password); passHash = hashPassword(changes.password); }

    db.prepare('UPDATE users SET name=?, role=?, active=?, pass_hash=? WHERE id=?').run(name, role, active, passHash, id);
    // Si cambian permisos, estado o contraseña, se cierra cualquier sesión abierta de ese usuario
    if (!self && (role !== user.role || active !== user.active || passHash !== user.pass_hash)) q.endUserSessions.run(id);
  }

  function deleteUser(id, actor) {
    const user = q.byId.get(id);
    if (!user) throw new Error('Usuario no encontrado.');
    if (user.id === actor.id) throw new Error('No puedes eliminar tu propio usuario.');
    if (user.role === 'admin' && user.active && q.activeAdmins.get().n <= 1) throw new Error('Debe quedar al menos un administrador activo.');
    q.endUserSessions.run(id);
    db.prepare('DELETE FROM users WHERE id=?').run(id);
  }

  // ---------- Sesiones ----------
  function login(username, password) {
    const user = q.byName.get(String(username ?? '').trim());
    const ok = verifyPassword(String(password ?? ''), user ? user.pass_hash : DUMMY_HASH);
    return ok && user && user.active ? user : null;
  }

  function startSession(res, user) {
    const token = crypto.randomBytes(32).toString('base64url');
    q.addSession.run(sha256(token), user.id, Date.now() + SESSION_MS);
    q.touchLogin.run(user.id);
    q.purge.run(Date.now());
    res.cookie(COOKIE, token, { ...cookieOpts, maxAge: SESSION_MS });
  }

  function endSession(req, res) {
    const token = readCookie(req, COOKIE);
    if (token) q.endSession.run(sha256(token));
    res.clearCookie(COOKIE, cookieOpts);
  }

  function changeOwnPassword(req, current, next) {
    const user = q.byId.get(req.user.id);
    if (!verifyPassword(String(current ?? ''), user.pass_hash)) throw new Error('La contraseña actual no es correcta.');
    validatePassword(next);
    db.prepare('UPDATE users SET pass_hash=? WHERE id=?').run(hashPassword(next), user.id);
    q.endOtherSessions.run(user.id, sha256(readCookie(req, COOKIE)));
  }

  // ---------- Middleware ----------
  function loadUser(req, res, next) {
    const token = readCookie(req, COOKIE);
    req.user = token ? q.session.get(sha256(token), Date.now()) || null : null;
    next();
  }

  const allowed = (user, roles) => !roles.length || roles.includes(user.role);

  const requireApi = (...roles) => (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
    if (!allowed(req.user, roles)) return res.status(403).json({ error: 'No tienes permiso para esto.' });
    next();
  };

  const requirePage = (...roles) => (req, res, next) => {
    if (!req.user) return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
    if (!allowed(req.user, roles)) return res.redirect(homeFor(req.user));
    next();
  };

  return {
    countUsers: () => q.count.get().n,
    listUsers: () => q.list.all(),
    createUser, updateUser, deleteUser,
    login, startSession, endSession, changeOwnPassword,
    loadUser, requireApi, requirePage
  };
}

module.exports = { createAuth, ROLES, homeFor };
