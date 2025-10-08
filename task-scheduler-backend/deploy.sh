#!/bin/bash

# Task Scheduler Production Deployment Script
# This script helps deploy the task scheduler to your existing infrastructure

set -e

echo "🚀 Task Scheduler Deployment Script"
echo "===================================="
echo ""

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "❌ Error: .env.production file not found"
    echo ""
    echo "Please create .env.production with the following variables:"
    echo "  - DOMAIN=your-domain.com"
    echo "  - POSTGRES_PASSWORD=your-postgres-password"
    echo "  - TASK_SCHEDULER_API_KEY=your-secure-api-key"
    echo ""
    echo "You can copy from .env.production.example:"
    echo "  cp .env.production.example .env.production"
    exit 1
fi

# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

echo "📋 Configuration:"
echo "  Domain: ${DOMAIN}"
echo "  Database: task_scheduler"
echo "  API Port: 3005"
echo ""

# Check if postgres-main is running
echo "🔍 Checking if postgres-main is running..."
if ! docker ps | grep -q attendance-postgres-main; then
    echo "❌ Error: postgres-main container is not running"
    echo "   Please start your existing infrastructure first"
    exit 1
fi
echo "✅ postgres-main is running"
echo ""

# Check if task_scheduler database exists
echo "🔍 Checking if task_scheduler database exists..."
if docker exec attendance-postgres-main psql -U postgres -lqt | cut -d \| -f 1 | grep -qw task_scheduler; then
    echo "✅ task_scheduler database already exists"
else
    echo "📦 Creating task_scheduler database..."
    docker exec attendance-postgres-main psql -U postgres -c "CREATE DATABASE task_scheduler;"
    echo "✅ Database created successfully"
fi
echo ""

# Check if attendance-network exists
echo "🔍 Checking if attendance-network exists..."
if docker network ls | grep -q attendance-network; then
    echo "✅ attendance-network exists"
else
    echo "⚠️  Warning: attendance-network does not exist"
    echo "   Creating network..."
    docker network create attendance-network
    echo "✅ Network created"
fi
echo ""

# Build and deploy
echo "🔨 Building and deploying task-scheduler service..."
docker-compose -f docker-compose.prod.yml up -d --build

echo ""
echo "⏳ Waiting for service to start..."
sleep 5

# Check if container is running
if docker ps | grep -q task-scheduler; then
    echo "✅ task-scheduler container is running"
else
    echo "❌ Error: task-scheduler container failed to start"
    echo ""
    echo "Check logs with:"
    echo "  docker-compose -f docker-compose.prod.yml logs task-scheduler"
    exit 1
fi

echo ""
echo "🔍 Checking service logs..."
docker-compose -f docker-compose.prod.yml logs --tail=20 task-scheduler

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "📚 Service Information:"
echo "  - API URL: https://${DOMAIN}/api/task-scheduler"
echo "  - Container: task-scheduler"
echo "  - Database: task_scheduler (on postgres-main)"
echo ""
echo "🧪 Test the API:"
echo "  curl -X GET \"https://${DOMAIN}/api/task-scheduler/tasks/dashboard/stats\" \\"
echo "    -H \"X-API-Key: ${TASK_SCHEDULER_API_KEY}\""
echo ""
echo "📊 View logs:"
echo "  docker-compose -f docker-compose.prod.yml logs -f task-scheduler"
echo ""
echo "🔄 Restart service:"
echo "  docker-compose -f docker-compose.prod.yml restart task-scheduler"
echo ""
echo "📖 Read the full documentation:"
echo "  cat DEPLOYMENT.md"
echo ""
