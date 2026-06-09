#!/bin/sh
# Container entrypoint: migrate, optionally seed, then start the API.
set -e

echo "Running database migrations..."
npm run migrate

if [ "$SEED_ON_START" = "true" ]; then
  echo "SEED_ON_START=true — seeding demo data..."
  npm run seed
fi

echo "Starting Trotxi API..."
exec node dist/server.js
