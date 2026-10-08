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
| `lib/pricing.js` | tarifas (fijo aeropuerto, € por km, Tarifa 2, extras, tabla de destinos, cobertura) y `quote()` |
| `lib/fleet.js` | vehículos de la flota y sus fotos (carrusel) |
| `lib/backup.js` | copia nocturna a Cloudflare R2 (firma SigV4 propia, sin SDK) o local |

## Decisiones tomadas (no cambiar sin hablarlo)
- **Traslados solo en Andalucía.** Aeropuerto ↔ Sevilla (precio fijo, 35 € hasta 4 pax / 50 € hasta 8) y pueblos y
  ciudades de la tabla (€/km con mínimo y suplemento corto) **se pagan al momento**: el precio lo calcula siempre el
  servidor (`pricing.quote`). La Tarifa 2 (×1,2) no se aplica al precio fijo. Sillas infantiles y alzador: 5 €/unidad
  (editable). «Otro trayecto» sigue el flujo de presupuesto: el admin pone precio → el cliente paga en
  `/pago/<token>` (no caduca). El checkout de SumUp se crea al pulsar «Pagar» porque **caduca a los 30 min**.
- Todo lo de precios se edita en `/admin/tarifas` y las fotos de los coches en `/admin/flota`.
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

Todo es del cliente (desde el 8 oct 2026): GitHub `alayanDriver12/taxi-web` (colaborador: `anubiss10`) y Railway
con la cuenta `alayan.driver@gmail.com`, proyecto `alayan-driver`, servicio `taxi-web` (root `/alayan`, volumen en
`/data`), **todo en Ámsterdam** (`ams`):
- production: rama `main` · https://taxi-web-production-245f.up.railway.app
- staging: rama `develop` · https://taxi-web-staging-2d93.up.railway.app · `SUMUP_MOCK=true`
El proyecto antiguo (`meticulous-vitality`, en la cuenta del desarrollador) queda obsoleto: borrarlo cuando el nuevo
esté validado.

Despliegue automático: cada entorno tiene su *deployment trigger* (staging → `develop`, production → `main`). Si un push
no despliega, comprobar con la query `deploymentTriggers` y que la cuenta de GitHub del cliente sigue conectada en Railway
(sin acceso, la API responde «no one in the project has access to it»).

CLI: `railway link --project alayan-driver --environment staging --service taxi-web` (sesión con la cuenta del
cliente). En PowerShell 5.1 la CLI pierde las comillas del JSON: escribir consultas y variables en archivos y usar
`railway api --file x.graphql --variables @x.json`. Borrar servicios o volúmenes: en la web.
**Cambiar de región** con volumen (la web no lo deja en Trial): mutación `environmentPatchCommit` cambiando a la vez
`volumes.<volumeId>.region` y `services.<serviceId>.deploy.multiRegionConfig = {"ams":{"numReplicas":1},"<antigua>":null}`.
Hacerlo sin ningún despliegue en curso: si no, Railway lo revierte («Reset region due to volume migration failure»).
Conserva los datos (probado). Antes, en producción con datos: copia nativa con `volumeInstanceBackupCreate`.

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
**Hecho (8 oct 2026):** repo y Railway pasados al cliente · production y staging en Ámsterdam, probados (29/29).
**Configuración:** cuenta del cliente en **Trial → pasar a Hobby** (si no, la web se para al acabar la prueba) ·
borrar el proyecto antiguo `meticulous-vitality` · dominio IONOS → Cloudflare → Railway (SSL *Full (strict)*) y
`BEHIND_CLOUDFLARE=true` · Resend con dominio verificado · bucket R2 + token · pasar `develop` → `main`.
**Cliente:** datos legales en `/admin` (bloquea producción) · su número de WhatsApp real · API key y merchant code de
SumUp · hojas de reclamaciones de la Junta · Seguro Obligatorio de Viajeros · revisar `/condiciones` con un asesor.
**Al final:** pago real de pocos euros y comprobar que los emails llegan (y no van a spam).
**Tarifas (oct 2026):** hecho (tarifas en el panel, carrusel de fotos, formulario con precio y pago al momento). Que el
cliente revise en `/admin/tarifas` los km de la tabla (su web tenía Jerez a 95 € y Madrid con km distintos) y sus festivos locales.
