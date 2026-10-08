# Alayan Driver — Web + backend

Node/Express + SQLite (un solo fichero) + web React/Vite con Tailwind.

## Estructura
```
server.js            API, SQLite, SumUp, sesiones, rutas del panel
lib/auth.js          usuarios (scrypt) y sesiones (cookie HttpOnly)
lib/content.js       contenido editable de la web (validación y guardado)
lib/payments.js      presupuestos, enlaces /pago/<token> e historial de pagos
lib/sumup.js         API de SumUp (Hosted Checkout) + modo simulación
content/defaults.js  textos ES/EN, WhatsApp, SEO e imágenes por defecto
panel/               páginas del panel interno (HTML + JS sin compilar)
web/                 código fuente de la web pública (React)
  src/App.jsx        la landing; lee los textos del contenido
  src/Pay.jsx        página de pago del cliente (/pago/<token>)
  src/Legal.jsx      aviso legal, privacidad, cookies y condiciones
  public/            imágenes (se copian tal cual)
dist/                web compilada (npm run build, no se sube al repo)
```

## Panel
| URL | Quién | Para qué |
|---|---|---|
| `/login` | — | Entrar con usuario y contraseña |
| `/reservas` | admin y gestor | Reservas: precio, presupuesto con enlace de pago, WhatsApp, estado, historial de pagos, CSV |
| `/admin` | admin | Contenido de la web: textos ES/EN, WhatsApp, SEO, imágenes |
| `/admin/usuarios` | admin | Alta, baja, roles y contraseñas |

`ADMIN_USER` / `ADMIN_PASS` solo se usan **la primera vez** (con la tabla de usuarios vacía) para crear el
administrador inicial. Después se gestiona todo desde `/admin/usuarios`.

## Arrancar en local
    npm install
    cp .env.example .env   # edita ADMIN_PASS (mín. 8 caracteres)
    npm run build          # compila la web a dist/
    npm run dev            # servidor en http://localhost:3000 (se reinicia al guardar)

Para tocar el diseño de la web con recarga instantánea, deja `npm run dev` abierto y en otra terminal:

    npm run dev:web        # http://localhost:5173 (pide la API al :3000)

Los textos se cambian desde `/admin`, no en el código. Si añades un texto nuevo a la web, añádelo en
`content/defaults.js` (en ES y en EN) y aparecerá solo en el editor.

## Desplegar (Railway)
El `Dockerfile` instala dependencias, compila la web y arranca el servidor.
1. Volumen persistente montado en `/data` (base de datos e imágenes subidas en `/data/uploads`).
2. Variables: `BASE_URL` (URL pública con https, la usa SumUp para avisar de los pagos), `ADMIN_USER`, `ADMIN_PASS`,
   `SUMUP_API_KEY`, `SUMUP_MERCHANT_CODE`, `DB_PATH=/data/alayan.db`. En staging, sin claves: `SUMUP_MOCK=true`.

## Flujo de reserva y cobro (SumUp)
No hay precios fijos, así que el cliente **solicita** y paga después, cuando el precio está cerrado:
1. El cliente envía el formulario («Solicitar reserva») → reserva `pendiente`, sin precio.
2. En `/reservas` pones el precio y pulsas **Enviar presupuesto** → se crea un enlace personal
   `/pago/<token>` (32 caracteres aleatorios, no caduca). **Enviar por WhatsApp** abre el chat con el mensaje listo.
3. El cliente abre el enlace, ve el resumen y el precio con IVA, acepta las condiciones y pulsa **Pagar**.
   En ese momento se crea el checkout de SumUp (sus sesiones caducan a los 30 min, por eso no se crean antes).
4. SumUp avisa al webhook (`/api/sumup/webhook`) y el servidor **consulta siempre el estado a la API de SumUp**
   (no se fía del aviso). Además se comprueba al volver el cliente a su enlace, con el botón «Comprobar pago»
   del panel y cada 5 minutos para los pagos en curso. → reserva `pagada`.

Se guardan todos los intentos de pago de cada reserva. Una reserva pagada no admite cambios de precio.

**Sin cuenta de SumUp** (desarrollo/staging): `SUMUP_MOCK=true` sustituye SumUp por una página de pago simulada
con botones de pago correcto/rechazado. No cobra nada y el panel lo avisa. Con API key, la simulación se ignora.

**Cuando el cliente tenga SumUp:** Dashboard de SumUp → Developer Settings → API keys → crear clave; el merchant
code aparece en el perfil de la cuenta. Ponerlas en Railway como `SUMUP_API_KEY` y `SUMUP_MERCHANT_CODE`
y quitar `SUMUP_MOCK`. Para pruebas sin dinero real, crear una cuenta sandbox (Developer Settings → Sandboxes) y
usar la tarjeta Visa `4200 0000 0000 0091`. Antes de entregar, una prueba real de pocos euros.

## Copias de seguridad
Descarga el CSV desde el panel o copia `/data/alayan.db` y `/data/uploads/`.
