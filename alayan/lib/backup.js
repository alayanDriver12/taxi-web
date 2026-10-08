// Copia de seguridad nocturna de la base de datos (y de las imágenes subidas).
// Destino: Cloudflare R2 (compatible con S3) si está configurado; si no, carpeta local en el volumen
// (últimas 7), que protege de borrados accidentales pero no de perder el volumen.
// La caducidad de las copias en R2 se configura con una regla de ciclo de vida del bucket (ver README).
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');

const LOCAL_KEEP = 7;
const HOUR = 3; // hora de Madrid a partir de la cual se hace la copia del día

// ---------- Firma AWS Signature V4 (la usa R2) ----------
const sha256hex = data => crypto.createHash('sha256').update(data).digest('hex');
const hmac = (key, data) => crypto.createHmac('sha256', key).update(data).digest();

function signV4({ method, host, path: p, headers = {}, body = '', accessKeyId, secretAccessKey, region = 'auto', service = 's3', date = new Date() }) {
  const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, ''); // 20240101T030000Z
  const day = amzDate.slice(0, 8);
  const payloadHash = sha256hex(body);
  const h = { host, 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate };
  for (const [k, v] of Object.entries(headers)) h[k.toLowerCase()] = v;
  const names = Object.keys(h).sort();
  const canonicalPath = p.split('/').map(encodeURIComponent).join('/');
  const canonicalRequest = [
    method, canonicalPath, '',
    names.map(n => `${n}:${String(h[n]).trim()}\n`).join(''),
    names.join(';'), payloadHash
  ].join('\n');
  const scope = `${day}/${region}/${service}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256hex(canonicalRequest)].join('\n');
  const key = ['aws4_request'].reduce(hmac, hmac(hmac(hmac('AWS4' + secretAccessKey, day), region), service));
  const signature = hmac(key, stringToSign).toString('hex');
  return { ...h, authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${names.join(';')}, Signature=${signature}` };
}

function r2Client({ accountId, accessKeyId, secretAccessKey, bucket }) {
  const host = `${accountId}.r2.cloudflarestorage.com`;
  return {
    async put(key, body, contentType = 'application/octet-stream') {
      const p = `/${bucket}/${key}`;
      const headers = signV4({ method: 'PUT', host, path: p, body, accessKeyId, secretAccessKey, headers: { 'content-type': contentType } });
      delete headers.host; // fetch la pone sola
      const r = await fetch(`https://${host}${p.split('/').map(encodeURIComponent).join('/')}`, { method: 'PUT', headers, body });
      if (!r.ok) throw new Error(`R2 ${r.status}: ${(await r.text()).slice(0, 300)}`);
    }
  };
}

// Fecha y hora de Madrid: { day: '2026-10-08', hour: 3, stamp: '2026-10-08_0300' }
function madridNow() {
  const s = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
  const [day, time] = s.split(' ');
  return { day, hour: Number(time.slice(0, 2)), stamp: `${day}_${time.replace(':', '')}` };
}

function createBackups(db, { dataDir, uploadsDir, r2 }) {
  db.exec(`
  CREATE TABLE IF NOT EXISTS backup_files (name TEXT PRIMARY KEY, uploaded_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT (datetime('now')), updated_by TEXT);
  `);
  const configured = r2 && r2.accountId && r2.accessKeyId && r2.secretAccessKey && r2.bucket;
  const remote = configured ? r2Client(r2) : null;
  const mode = remote ? 'r2' : 'local';
  const localDir = path.join(dataDir, 'backups');
  const getStatus = db.prepare(`SELECT value FROM settings WHERE key='backup_status'`);
  const setStatus = db.prepare(`INSERT INTO settings (key, value, updated_at) VALUES ('backup_status', ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`);
  const uploaded = db.prepare('SELECT 1 FROM backup_files WHERE name = ?');
  const markUploaded = db.prepare('INSERT OR IGNORE INTO backup_files (name) VALUES (?)');
  let running = null;

  const status = () => { try { return JSON.parse(getStatus.get()?.value || 'null'); } catch { return null; } };

  async function doRun(reason) {
    const now = madridNow();
    const tmp = path.join(dataDir, `.backup-${process.pid}.db`);
    try {
      await db.backup(tmp); // copia consistente aunque haya escrituras en curso
      const gz = zlib.gzipSync(fs.readFileSync(tmp));
      const name = `alayan-${now.stamp}.db.gz`;
      let images = 0;
      if (remote) {
        await remote.put(`db/${name}`, gz, 'application/gzip');
        // Imágenes: solo las que aún no se han subido (sus nombres no se reutilizan)
        for (const file of fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : []) {
          if (uploaded.get(file)) continue;
          await remote.put(`uploads/${file}`, fs.readFileSync(path.join(uploadsDir, file)));
          markUploaded.run(file);
          images++;
        }
      } else {
        fs.mkdirSync(localDir, { recursive: true });
        fs.writeFileSync(path.join(localDir, name), gz);
        const old = fs.readdirSync(localDir).filter(f => f.endsWith('.db.gz')).sort().slice(0, -LOCAL_KEEP);
        for (const f of old) fs.rmSync(path.join(localDir, f), { force: true });
      }
      const result = { ok: true, day: now.day, at: new Date().toISOString(), mode, file: name, sizeKb: Math.round(gz.length / 1024), images, reason };
      setStatus.run(JSON.stringify(result));
      console.log(`💾 Copia de seguridad (${mode === 'r2' ? 'Cloudflare R2' : 'local'}): ${name}, ${result.sizeKb} KB${images ? `, ${images} imágenes` : ''}`);
      return result;
    } catch (e) {
      const result = { ok: false, day: now.day, at: new Date().toISOString(), mode, error: e.message.slice(0, 300), reason };
      setStatus.run(JSON.stringify(result));
      console.error('⚠️  Copia de seguridad fallida:', e.message);
      return result;
    } finally {
      fs.rmSync(tmp, { force: true });
    }
  }

  // Evita dos copias a la vez
  function run(reason = 'manual') {
    running ??= doRun(reason).finally(() => { running = null; });
    return running;
  }

  // Cada 30 min: si ya son las 3 en Madrid y hoy no hay copia correcta, se hace
  function tick() {
    const now = madridNow(), last = status();
    if (now.hour >= HOUR && !(last?.ok && last.day === now.day)) run('automática');
  }
  setInterval(tick, 30 * 60 * 1000).unref();
  setTimeout(tick, 60 * 1000).unref();

  return { mode, run, status };
}

module.exports = { createBackups, signV4 };
