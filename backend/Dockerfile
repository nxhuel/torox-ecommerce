# syntax=docker/dockerfile:1
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

FROM node:24-alpine AS production
WORKDIR /app
COPY --from=builder /app/.env ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3001
ENV NODE_ENV=production
ENV PORT=3001
ENV RESEND_API_KEY=re_eghKDyoR_E6J2BGrpP1bQe2gmJ8aTv4vw
ENV MAIL_FROM="TOROX <no-reply@torox.com.ar>"
ENV MAIL_REPLY_TO=toroxseguridad@gmail.com
# La conexión a la base se define SIEMPRE por variables de entorno
# (docker-compose local o el dashboard de Seenode). No hardcodear DATABASE_URL
# acá: si queda fija, los entornos locales terminan apuntando a producción.
CMD ["node", "dist/main"]
