# Alayan Driver — Web + backend

Node/Express + SQLite (un solo fichero) + web React/Vite con Tailwind.

## Estructura
```
server.js            API, SQLite, SumUp, sesiones, rutas del panel
lib/auth.js          usuarios (scrypt) y sesiones (cookie HttpOnly)
lib/content.js       contenido editable de la web (validación y guardado)
content/defaults.js  textos ES/EN, WhatsApp, SEO e imágenes por defecto
panel/               páginas del panel interno (HTML + JS sin compilar)
web/                 código fuente de la web pública (React)
  src/App.jsx        toda la landing; lee los textos del contenido
  public/            imágenes y gracias.html (se copian tal cual)
dist/                web compilada (npm run build, no se sube al repo)
```

## Panel
| URL | Quién | Para qué |
|---|---|---|
| `/login` | — | Entrar con usuario y contraseña |
| `/reservas` | admin y gestor | Reservas: precio, enlace SumUp, WhatsApp, estado, CSV |
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
2. Variables: `BASE_URL`, `ADMIN_USER`, `ADMIN_PASS`, `SUMUP_API_KEY`, `SUMUP_MERCHANT_CODE`, `DB_PATH=/data/alayan.db`.

## Flujo de reserva y cobro
1. El cliente rellena el formulario → se guarda en la BBDD (estado `pendiente`).
2. En `/reservas` pones el importe y pulsas **Enlace SumUp** → se genera el checkout; **Enviar por WhatsApp** abre el chat con el enlace.
3. Al pagar, SumUp avisa por webhook y el servidor verifica el pago contra su API → pasa a `pagada`.
(Para cobro automático desde la web pon `ALLOW_CLIENT_AMOUNT=true`, pero el importe lo escribe el cliente: no recomendado sin tarifas fijas.)

## Copias de seguridad
Descarga el CSV desde el panel o copia `/data/alayan.db` y `/data/uploads/`.
