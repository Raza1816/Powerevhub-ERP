#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -e

echo "=== Building Power EV Hub ERP for Render.com ==="

# 1. Install dependencies
npm ci

# 2. Push database schema & generate Prisma Client
npx prisma generate
npx prisma db push --accept-data-loss

# 3. Seed initial master settings if needed
node scripts/seed.js || true

# 4. Build Next.js application
npm run build

echo "=== Build Completed Successfully! ==="
