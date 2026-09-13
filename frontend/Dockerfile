# syntax=docker/dockerfile:1
FROM node:24-alpine AS builder
WORKDIR /app
# Render passes dashboard env vars as Docker build args — declare it so the
# Nuxt client bundle is baked with the real API URL (fallback: local dev).
ARG NUXT_PUBLIC_API_BASE
ENV NUXT_PUBLIC_API_BASE=$NUXT_PUBLIC_API_BASE
COPY package*.json ./
RUN corepack disable && npm ci
COPY . .
RUN npm run build

FROM node:24-alpine AS production
WORKDIR /app
COPY --from=builder /app/.output ./.output
EXPOSE 3000
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
CMD ["node", ".output/server/index.mjs"]