# Trotxi API — production image
FROM node:22-slim

WORKDIR /app

# Install deps first (better layer caching). Dev deps are kept so the
# migration/seed scripts (tsx) can run at container start.
COPY package*.json ./
RUN npm ci

# App source + build
COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

# Run DB migrations (idempotent), optionally seed demo data, then start.
CMD ["sh", "./scripts/start.sh"]
