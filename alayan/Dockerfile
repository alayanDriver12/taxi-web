# 1) Compilar: dependencias nativas (better-sqlite3) + web React/Vite
FROM node:20-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

# 2) Imagen final: solo lo necesario para ejecutar
FROM node:20-slim
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json server.js ./
COPY lib ./lib
COPY content ./content
COPY panel ./panel
ENV NODE_ENV=production
CMD ["node","server.js"]
