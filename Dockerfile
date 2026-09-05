FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source and config
COPY . .

# Build frontend and backend bundles
RUN npm run build

# Apply local D1 database schema and seed data
RUN npx wrangler d1 migrations apply webapp-production --local
RUN npx wrangler d1 execute webapp-production --local --file=./seed.sql

# Railway provides PORT dynamically
ENV PORT=3000
EXPOSE 3000

# Start wrangler dev server serving the bundle and local D1 database
CMD ["sh", "-c", "npx wrangler pages dev dist --d1=webapp-production --local --ip 0.0.0.0 --port ${PORT:-3000}"]
