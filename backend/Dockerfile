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
EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000
ENV RESEND_API_KEY=re_eghKDyoR_E6J2BGrpP1bQe2gmJ8aTv4vw
ENV MAIL_FROM="TOROX <no-reply@torox.com.ar>"
ENV MAIL_REPLY_TO=toroxseguridad@gmail.com
ENV DATABASE_URL=postgresql://db_xfpxvqaunpi4:PSL8VFmwvKkA5AtreEyeZGkB@up-de-fra1-postgresql-3.db.run-on-seenode.com:11550/db_xfpxvqaunpi4
ENV DATABASE_SSL=true
CMD ["node", "dist/main"]