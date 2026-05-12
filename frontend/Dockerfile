# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* yarn.lock* bun.lockb* ./

# Install dependencies
RUN if [ -f bun.lockb ]; then \
      npm install -g bun && bun install; \
    elif [ -f yarn.lock ]; then \
      yarn install; \
    else \
      npm install; \
    fi

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage - using nginx
FROM nginx:alpine

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Remove default nginx config
RUN rm -rf /etc/nginx/conf.d/*

# Copy built application from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
