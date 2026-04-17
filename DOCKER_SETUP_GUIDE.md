# Docker Setup Guide for FDFED Project

This guide explains how to run the FDFED React Project using Docker.

## Prerequisites

- **Docker Desktop** installed ([Download here](https://www.docker.com/products/docker-desktop))
- **Docker Compose** (included with Docker Desktop)
- At least 4GB of RAM allocated to Docker
- 5GB of free disk space

## Quick Start

### 1. Prepare Environment Variables

Copy the template environment file:
```bash
cd backend
cp .env .env.docker
```

Edit `backend/.env` and update these critical values:
```
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-16-character-app-password
JWT_SECRET=your-secure-random-secret-key
MONGO_URI=your-mongodb-connection-string
```

Note: The Docker backend service loads `backend/.env` via `env_file`, so it uses the same database configuration as your local backend.

### 2. Build and Start Services

From the project root directory:

```bash
# Build and start all services
docker compose up -d --build
```

### 3. Verify Services are Running

```bash
# Check service status
docker compose ps

# View logs
docker compose logs -f
```

Expected output shows:
- ✅ `fdfed-mongodb` - Running
- ✅ `fdfed-redis` - Running
- ✅ `fdfed-backend` - Running
- ✅ `fdfed-frontend` - Running

### 4. Access the Application

- **Frontend**: http://localhost
- **Backend API**: http://localhost:3003
- **MongoDB**: localhost:27017 (admin/admin123)
- **Redis**: localhost:6379

## Common Docker Commands

### View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f mongodb
```

### Stop Services
```bash
# Stop all (containers remain)
docker compose stop

# Remove all containers
docker compose down

# Remove containers and volumes (WARNING: Deletes data!)
docker compose down -v
```

### Rebuild Services
```bash
# Rebuild specific service
docker compose build backend
docker compose build frontend

# Rebuild and restart
docker compose up -d --build backend
```

### Access Container Terminal
```bash
# Backend container
docker exec -it fdfed-backend sh

# Frontend nginx container
docker exec -it fdfed-frontend sh

# MongoDB container
docker exec -it fdfed-mongodb mongosh -u admin -p admin123 --authenticationDatabase admin
```

### View Container Logs
```bash
# Real-time logs with timestamps
docker compose logs --timestamps -f

# Last 100 lines
docker compose logs --tail=100

# Logs from specific time
docker compose logs --since 10m
```

## Troubleshooting

### Port Already in Use
If you get "Address already in use" error:
```bash
# Find process using port
netstat -ano | findstr :3003  # Windows
lsof -i :3003                 # Mac/Linux

# OR map to different port in docker compose.yml
# Set BACKEND_PORT in .env if port 3003 is in use, for example BACKEND_PORT=3004
```

### MongoDB Connection Issues
```bash
# Verify MongoDB is running
docker compose logs mongodb

# Manually test connection
docker exec fdfed-mongodb mongosh -u admin -p admin123 --authenticationDatabase admin

# Restart MongoDB
docker compose restart mongodb
```

### Redis Connection Issues
```bash
# Verify Redis is running
docker compose logs redis

# Manually test connection
docker exec fdfed-redis redis-cli ping

# Should return "PONG"
```

### Backend Not Connecting to MongoDB
1. Ensure MongoDB health check passes: `docker compose ps`
2. Check environment variables: `docker exec fdfed-backend env | grep MONGO`
3. View backend logs: `docker compose logs backend`

### Frontend Shows Blank Page
1. Check frontend logs: `docker compose logs frontend`
2. Verify backend API is accessible: `curl http://localhost:3003/api-docs`
3. Check browser console (F12) for errors
4. Rebuild frontend: `docker compose build frontend && docker compose up -d frontend`

### Container Restart Loop
```bash
# View detailed logs
docker compose logs backend

# Print last lines with errors
docker compose logs | grep -i error
```

## Production Deployment Tips

1. **Update JWT_SECRET**: Generate a strong random string
   ```bash
   openssl rand -base64 32
   ```

2. **Update SMTP Credentials**: Use environment-specific credentials

3. **Use Environment-Specific Compose File**:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

4. **Enable Database Backups**:
   ```bash
   # Backup MongoDB
   docker exec fdfed-mongodb mongodump --out /backup --username admin --password admin123 --authenticationDatabase admin
   ```

5. **Monitor Resources**:
   ```bash
   docker stats
   ```

6. **Set Resource Limits** in docker compose.yml:
   ```yaml
   services:
     backend:
       deploy:
         resources:
           limits:
             cpus: '1'
             memory: 1024M
   ```

## Health Checks

All services have health checks enabled:
- MongoDB: Responds to ping command
- Redis: Responds to PING command
- Backend: TCP connectivity check on port 3002 inside container
- Frontend: HTTP GET to root endpoint

View health status:
```bash
docker compose ps
```

## Development Workflow

### Using Volume Mounts
Current docker-compose uses production-oriented containers (no source-code bind mount for backend):
```bash
# Rebuild backend when backend code changes
docker compose up -d --build backend

# View backend logs
docker compose logs -f backend
```

### Frontend Development
For development, use `npm run dev` locally instead of Docker:
```bash
cd FDFED_project_react_app
npm install
npm run dev
```

### Testing in Docker
```bash
# Run backend tests
docker exec fdfed-backend npm test

# Run specific test file
docker exec fdfed-backend npm test -- tests/auth.test.js
```

## Cleanup

### Remove All Containers and Volumes
```bash
docker compose down -v
```

### Remove Dangling Volumes
```bash
docker volume prune
```

### Reset Everything
```bash
docker compose down -v --remove-orphans
docker system prune -a
```

## Environment Variables Reference

### Backend (.env)
```
NODE_ENV=production
PORT=3002
MONGO_URI=mongodb://admin:admin123@mongodb:27017/mediquick?authSource=admin
REDIS_HOST=redis
REDIS_PORT=6379
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-app-password
JWT_SECRET=your-secret-key
```

### Frontend (nginx.conf)
- `VITE_API_URL`: Backend API URL (configured in Docker build args as http://localhost:3003)

## Support & Additional Resources

- Docker Documentation: https://docs.docker.com/
- Docker Compose: https://docs.docker.com/compose/
- MongoDB Docker: https://hub.docker.com/_/mongo
- Redis Docker: https://hub.docker.com/_/redis
- Nginx Docker: https://hub.docker.com/_/nginx

---

**Last Updated**: April 2026
**Created For**: FDFED React Project

