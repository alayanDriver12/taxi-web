# Alayan Driver — contexto del proyecto

Web de transfers privados en Andalucía (cliente: Alayan Driver, base en Sevilla). Idioma de trabajo con el
desarrollador: **español**. Todo el código vive en `alayan/`; el detalle técnico está en `alayan/README.md`.

## Stack
- **Backend:** Node 20 + Express (`alayan/server.js`) con módulos en `alayan/lib/`. Helmet y express-rate-limit.
- **BBDD:** SQLite (`better-sqlite3`), un fichero en el volumen `/data`. Las tablas y columnas nuevas se crean
  solas al arrancar (`CREATE TABLE IF NOT EXISTS` / `ALTER TABLE` comprobando `PRAGMA table_info`).
- **Web pública:** React 18 + Vite + Tailwind 3 en `alayan/web/` → se compila a `alayan/dist/` (no versionado).
  El servidor incrusta el contenido en el HTML (`window.__ALAYAN_CONTENT__`). Rutas: `/`, `/pago/<token>`,
  `/aviso-legal`, `/privacidad`, `/cookies`, `/condiciones`. Fuentes locales (@fontsource): **sin peticiones a
  terceros ni cookies** en la web pública; no añadir Google Fonts, analítica ni similares sin banner de cookies.
- **Panel interno:** HTML + JS sin compilar en `alayan/panel/`. Login propio (usuarios en BBDD, scrypt, cookie
  HttpOnly). Roles: `admin` (todo) y `gestor` (solo reservas).
- **Despliegue:** Railway con `alayan/Dockerfile` (multi-etapa: compila la web). Repo en GitHub.

## Mapa de módulos
| Archivo | Qué hace |
|---|---|
| `lib/auth.js` | usuarios, sesiones, middleware de permisos |
| `lib/content.js` + `content/defaults.js` | textos ES/EN editables, datos legales, SEO, imágenes |
| `lib/payments.js` + `lib/sumup.js` | presupuestos, enlaces `/pago/<token>`, checkouts SumUp, modo simulación |
| `lib/mailer.js` + `lib/notify.js` | emails (Resend) y textos de avisos/WhatsApp en el idioma de la reserva |
| `lib/backup.js` | copia nocturna a Cloudflare R2 (firma SigV4 propia, sin SDK) o local |

## Decisiones tomadas (no cambiar sin hablarlo)
- **No hay precios fijos.** El cliente solicita → el admin pone precio y envía presupuesto → el cliente paga en
  `/pago/<token>` (no caduca). El checkout de SumUp se crea al pulsar «Pagar» porque **caduca a los 30 min**.
- El estado de un pago se verifica **siempre contra la API de SumUp**; nunca se confía en el cuerpo del webhook.
- Se guardan todos los intentos de pago (`payments`). Una reserva pagada no admite cambios de precio.
- Emails con **Resend** (API HTTPS) porque **Railway Hobby bloquea el SMTP**. WhatsApp = enlace `wa.me` con el
  mensaje escrito (sin API de Meta, que cobra por mensaje y exige verificación).
- Sin claves, cada integración funciona en modo prueba: `SUMUP_MOCK=true` (pagos simulados), emails registrados
  sin enviar, copias locales. El panel avisa de cada modo.
- Solicitudes no contratadas: se borran solas a los 12 meses (lo promete la política de privacidad).
- `BEHIND_CLOUDFLARE=true` solo cuando todo el tráfico pase por Cloudflare (si no, la IP es falsificable).
- Textos legales en `web/src/Legal.jsx`; si cambian proveedores o datos tratados, **actualizar la privacidad**.

## Ramas y entornos
`main` = producción (Railway despliega solo). `develop` = pruebas (entorno staging con su propia BBDD).
Trabajar en `develop`, probar, y pasar a `main` con PR.

## Variables de entorno (en Railway, nunca en el repo)
`BASE_URL` (https, sin barra final), `ADMIN_USER`/`ADMIN_PASS` (solo crean el primer admin; mín. 8 caracteres),
`DB_PATH=/data/alayan.db`, `SUMUP_API_KEY`, `SUMUP_MERCHANT_CODE`, `SUMUP_MOCK`, `RESEND_API_KEY`, `MAIL_FROM`,
`NOTIFY_EMAIL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `BEHIND_CLOUDFLARE`.
Plantilla en `alayan/.env.example`.

## Probar en local
`cd alayan && npm install && cp .env.example .env` (editar) `&& npm run build && npm run dev` → web en `:3000`,
panel en `/login`. Para el diseño con recarga instantánea: `npm run dev:web` (`:5173`) con `npm run dev` abierto.

## Avisos para quien edite el código
- En Windows, al escribir código con herramientas que procesan escapes, `\uXXXX`, `\\` y `\n` dentro de cadenas
  se han corrompido varias veces: revisar con `node --check` y, si hace falta, usar `String.fromCharCode(...)`.
- Nunca subir `.env`, claves ni ficheros `.db` (ya en `.gitignore`).

## Pendiente (octubre 2026)
**Configuración** (bloque 2): entorno staging en Railway · región Europa (Ámsterdam; copia antes de migrar el
volumen) · dominio IONOS → Cloudflare → Railway (SSL *Full (strict)*) y `BEHIND_CLOUDFLARE=true` · Resend con
dominio verificado · bucket R2 + token · pasar `develop` → `main` (comprobar `ADMIN_PASS`, enlaces de pago antiguos
sin pagar y que las reservas sobreviven).
**Cliente:** datos legales en `/admin` (bloquea producción) · su número de WhatsApp real · API key y merchant code de
SumUp · hojas de reclamaciones de la Junta · Seguro Obligatorio de Viajeros · revisar `/condiciones` con un asesor.
**Al final:** pago real de pocos euros y comprobar que los emails llegan (y no van a spam).
**Después de salir:** tabla de tarifas fijas para pago inmediato en rutas típicas.
