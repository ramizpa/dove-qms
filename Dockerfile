
# 1. Install dependencies
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 2. Build the app
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate Prisma Client
RUN npx prisma generate
# Build Next.js
RUN npm run build

# 3. Production image
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production

# Create user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy vital files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copy Custom Server & Prisma
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/prisma ./prisma

# Ensure Prisma DB directory exists and is writable
RUN mkdir -p /app/prisma && chown nextjs:nodejs /app/prisma

# Switch to user
USER nextjs

EXPOSE 3000
ENV PORT 3000

# Run using the same command as local: npm start (which runs `tsx server.ts`)
CMD ["npm", "start"]
