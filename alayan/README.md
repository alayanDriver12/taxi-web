# Alayan Driver — Web + backend

Node/Express + SQLite (base de datos incluida, un solo fichero). Panel en `/admin`.

## Arrancar en local
    npm install
    cp .env.example .env   # edita ADMIN_PASS, etc.
    export $(grep -v '^#' .env | xargs) && npm start
Web: http://localhost:3000 · Admin: http://localhost:3000/admin

## Desplegar (Railway / Render / Fly.io)
1. Sube esta carpeta a un repo de GitHub.
2. Crea un servicio desde el repo (usa el Dockerfile).
3. Añade un **volumen persistente** montado en `/data` (ahí vive la base de datos).
4. Variables de entorno: `BASE_URL`, `ADMIN_USER`, `ADMIN_PASS`, `SUMUP_API_KEY`, `SUMUP_MERCHANT_CODE`.
5. Apunta el dominio del cliente al servicio (HTTPS automático).

## Flujo de reserva y cobro
1. El cliente rellena el formulario → se guarda en la BBDD (estado `pendiente`).
2. En `/admin` pones el importe y pulsas **Enlace SumUp** → se genera el checkout; se lo mandas por WhatsApp.
3. Al pagar, SumUp avisa por webhook y el servidor verifica el pago contra su API → pasa a `pagada`.
(Para cobro automático desde la web pon `ALLOW_CLIENT_AMOUNT=true`, pero el importe lo escribe el cliente: no recomendado sin tarifas fijas.)

## Copias de seguridad
Descarga el CSV desde el panel o copia `/data/alayan.db`.
