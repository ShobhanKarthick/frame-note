# Build stage for frontend
FROM oven/bun:1 AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/bun.lockb* ./
RUN bun install --frozen-lockfile || bun install
COPY frontend/ ./
ENV NODE_ENV=production
ENV VITE_API_URL=/api
RUN bun run build

# Build stage for backend
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install
COPY backend/ ./
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app

# Copy built backend (dist folder + node_modules)
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/node_modules ./node_modules
COPY --from=backend-builder /app/backend/package.json ./

# Copy built frontend files
COPY --from=frontend-builder /app/frontend/dist ./public

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV PUBLIC_DIR=/app/public

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/index.js"]

