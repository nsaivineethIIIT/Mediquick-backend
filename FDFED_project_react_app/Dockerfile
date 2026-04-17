# Frontend Dockerfile - Multi-stage build for React/Vite app

# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app

# Accept build arguments
ARG VITE_API_URL=http://localhost:3002

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application with environment variables
RUN VITE_API_URL=${VITE_API_URL} npm run build

# Stage 2: Production - Serve with Nginx
FROM nginx:alpine

# Copy built files to nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
