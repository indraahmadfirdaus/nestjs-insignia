# Task Scheduler Backend

> Discord webhook task scheduler built with NestJS and Prisma for Insignia Technical Test

A production-ready backend application that manages scheduled tasks and sends Discord webhook notifications based on configurable cron expressions.

## Features

- ✨ **Dynamic Task Scheduling** - Create, update, and delete scheduled tasks with cron expressions
- 🔔 **Discord Webhook Integration** - Send rich messages to Discord channels via webhooks
- 🔄 **Automatic Retry Mechanism** - Exponential backoff retry strategy for failed webhook deliveries
- 📊 **Task Execution Logging** - Comprehensive logging of all task executions with status tracking
- 🔐 **API Key Authentication** - Secure endpoints with API key-based authentication
- 📈 **Dashboard Statistics** - Real-time statistics on task status and execution
- 📚 **Swagger Documentation** - Interactive API documentation with OpenAPI/Swagger
- 🐳 **Docker Support** - Containerized deployment with Docker and Docker Compose
- 🔍 **Advanced Filtering** - Query logs with pagination, date range, and status filters
- ⚡ **Performance Optimized** - Multi-stage Docker builds and efficient database queries

## Tech Stack

- **Framework**: NestJS 11.x
- **Language**: TypeScript 5.7
- **Database**: PostgreSQL 15
- **ORM**: Prisma 6.x
- **Cache** (Optional): Redis 7
- **Task Scheduling**: @nestjs/schedule with node-cron
- **HTTP Client**: @nestjs/axios (Axios)
- **Validation**: class-validator, class-transformer
- **API Documentation**: @nestjs/swagger
- **Containerization**: Docker & Docker Compose
- **Reverse Proxy**: Traefik (production)
- **Testing**: Jest

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 20.x or higher
- **npm** 10.x or higher
- **Docker** and **Docker Compose** (for containerized setup)
- **PostgreSQL** 15 (if running locally without Docker)
- **Discord Webhook URL** (for testing webhook functionality)

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd task-scheduler-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Update the `.env` file with your configuration:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/task_scheduler?schema=public"

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379

# API Security
API_KEY=your-secret-api-key-here

# Application
PORT=3005
NODE_ENV=development
```

### 4. Database Setup

Generate Prisma Client and run migrations:

```bash
# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# (Optional) Open Prisma Studio to view data
npx prisma studio
```

### 5. Start Development Server

```bash
npm run start:dev
```

The application will be available at:
- **API**: http://localhost:3005/api
- **Swagger Documentation**: http://localhost:3005/api/docs

## Docker Deployment

### Local Development with Docker

Start all services (PostgreSQL, Redis, and the application):

```bash
# Build and start containers
docker-compose up --build

# Or run in detached mode
docker-compose up -d

# View logs
docker-compose logs -f task-scheduler

# Stop containers
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

The application will be available at:
- **API**: http://localhost:3005/api
- **Swagger Docs**: http://localhost:3005/api/docs

### Production Deployment

Soon updated.

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | - | Yes |
| `REDIS_HOST` | Redis host address | localhost | No |
| `REDIS_PORT` | Redis port | 6379 | No |
| `API_KEY` | API key for authentication | - | Yes |
| `PORT` | Application port | 3005 | No |
| `NODE_ENV` | Environment (development/production) | development | No |

## API Endpoints

### Tasks Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/tasks` | Create a new task | ✅ |
| `GET` | `/api/tasks` | Get all tasks (paginated) | ✅ |
| `GET` | `/api/tasks/:id` | Get task by ID with logs | ✅ |
| `PATCH` | `/api/tasks/:id` | Update task | ✅ |
| `DELETE` | `/api/tasks/:id` | Delete task | ✅ |
| `POST` | `/api/tasks/:id/toggle` | Toggle task active/inactive | ✅ |

### Dashboard

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/tasks/dashboard/stats` | Get task statistics | ✅ |

### Logs

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/logs` | Get all execution logs | ✅ |
| `GET` | `/api/tasks/:taskId/logs` | Get logs for specific task | ✅ |

### Documentation

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/docs` | Swagger UI | ❌ |
| `GET` | `/api/docs-json` | OpenAPI JSON specification | ❌ |

For detailed API documentation with request/response examples, see [API.md](./API.md) or visit the Swagger UI at `/api/docs`.

## Running Tests

```bash
# Run all unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:cov

# Run e2e tests
npm run test:e2e

# Run specific test file
npm run test -- tasks.service.spec.ts
```

## Database Schema

### Task Model

```prisma
model Task {
  id          String      @id @default(uuid())
  name        String
  schedule    String      // cron format
  webhookUrl  String      @map("webhook_url")
  payload     Json        // Discord payload as JSON
  maxRetry    Int         @default(3) @map("max_retry")
  status      TaskStatus  @default(ACTIVE)
  createdAt   DateTime    @default(now()) @map("created_at")
  updatedAt   DateTime    @updatedAt @map("updated_at")
  logs        TaskLog[]
  @@map("tasks")
}
```

### TaskLog Model

```prisma
model TaskLog {
  id            String      @id @default(uuid())
  taskId        String      @map("task_id")
  executionTime DateTime    @default(now()) @map("execution_time")
  status        LogStatus
  retryCount    Int         @default(0) @map("retry_count")
  message       String?     @db.Text
  createdAt     DateTime    @default(now()) @map("created_at")
  task          Task        @relation(fields: [taskId], references: [id], onDelete: Cascade)
  @@index([taskId])
  @@map("task_logs")
}
```

## Claude Code Usage Examples

This project was built with significant assistance from Claude Code. Here are some key instances where Claude Code proved invaluable:

### 1. Initial Project Setup and Architecture Design

**What Claude Code Did:**
- Set up the entire NestJS project structure with best practices
- Installed and configured all required dependencies (@nestjs/schedule, @prisma/client, etc.)
- Created modular architecture with separate modules for tasks, scheduler, Discord, and authentication
- Configured global validation pipes and CORS settings

**Command Used:**
```bash
npx @nestjs/cli new task-scheduler-backend
npm install @prisma/client @nestjs/config @nestjs/schedule @nestjs/axios class-validator class-transformer
```

**Result:**
Complete project structure with all necessary modules, services, and controllers properly organized following NestJS conventions.

### 2. Prisma Schema Design and Database Migration

**What Claude Code Did:**
- Designed a comprehensive Prisma schema with proper relations and indexes
- Created Task and TaskLog models with appropriate field types and constraints
- Added enums for TaskStatus and LogStatus
- Implemented snake_case field mapping for database columns
- Generated and applied initial database migration

**Prisma Commands:**
```bash
npx prisma init
npx prisma generate
npx prisma migrate dev --name init
```

**Schema Created:**
```prisma
model Task {
  id          String      @id @default(uuid())
  name        String
  schedule    String
  webhookUrl  String      @map("webhook_url")
  payload     Json
  maxRetry    Int         @default(3) @map("max_retry")
  status      TaskStatus  @default(ACTIVE)
  createdAt   DateTime    @default(now()) @map("created_at")
  updatedAt   DateTime    @updatedAt @map("updated_at")
  logs        TaskLog[]
  @@map("tasks")
}
```

### 3. Comprehensive CRUD Implementation with Validation

**What Claude Code Did:**
- Created fully-validated DTOs using class-validator decorators
- Implemented complex validation for cron expressions using regex patterns
- Added Discord webhook payload validation (content length, embed limits)
- Built complete CRUD service with error handling and logging
- Implemented pagination, filtering, and sorting functionality

**Key Files Created:**
- `src/tasks/dto/create-task.dto.ts` - With cron validation, URL validation, and payload validation
- `src/tasks/tasks.service.ts` - Complete CRUD operations with 386 lines of robust code
- `src/tasks/tasks.controller.ts` - RESTful endpoints with proper HTTP status codes

**Example Validation:**
```typescript
@Matches(/^((\*|[0-9,\-\/*]+)\s+){4}(\*|[0-9,\-\/*]+)(\s+(\*|[0-9,\-\/*]+))?$|^@(yearly|annually|monthly|weekly|daily|hourly|reboot)$/, {
  message: 'Invalid cron expression format. Use standard cron format (e.g., "0 9 * * *") or predefined (@daily, @hourly, etc.)',
})
schedule: string;
```

### 4. Discord Webhook Service with Retry Logic

**What Claude Code Did:**
- Implemented a robust Discord webhook service with exponential backoff
- Added comprehensive payload validation for Discord API limits
- Created retry mechanism that handles both client and server errors differently
- Integrated proper error logging and status tracking

**Service Implementation:**
```typescript
// Retry with exponential backoff
if (attempt < this.MAX_RETRIES) {
  const delay = this.calculateBackoffDelay(attempt);
  this.logger.log(`Retrying in ${delay}ms...`);
  await this.sleep(delay);
  return await this.sendWebhook(webhookUrl, payload, attempt + 1);
}
```

### 5. Swagger/OpenAPI Documentation

**What Claude Code Did:**
- Configured comprehensive Swagger documentation with API key security
- Added @ApiProperty decorators to all DTOs with descriptions and examples
- Documented all controller endpoints with @ApiOperation and @ApiResponse
- Created multiple example values for complex fields like cron expressions

**Documentation Quality:**
- All 10+ endpoints fully documented
- Request/response schemas with examples
- Error responses (400, 401, 404, 500) documented
- Interactive Swagger UI at `/api/docs`

### 6. Docker Multi-Stage Build Optimization

**What Claude Code Did:**
- Created optimized multi-stage Dockerfile for production
- Set up docker-compose.yml with PostgreSQL, Redis, and the application
- Implemented automatic database migrations on container startup
- Added health checks for all services

**Dockerfile Stages:**
1. **deps**: Install dependencies
2. **build**: Build application and generate Prisma Client
3. **production**: Minimal production image with only runtime dependencies

**Result:**
Efficient Docker setup with automatic migrations and health checks, reducing deployment complexity.

## Discord Webhook Payload Example

```json
{
  "content": "Task executed successfully!",
  "username": "Task Scheduler Bot",
  "avatar_url": "https://i.imgur.com/4M34hi2.png",
  "embeds": [
    {
      "title": "✅ Task Completed",
      "description": "Daily status report has been generated",
      "color": 3066993,
      "fields": [
        {
          "name": "Task Name",
          "value": "Daily Report",
          "inline": true
        },
        {
          "name": "Execution Time",
          "value": "2025-10-07 10:00:00",
          "inline": true
        }
      ],
      "timestamp": "2025-10-07T10:00:00.000Z"
    }
  ]
}
```

## Cron Expression Examples

| Expression | Description |
|------------|-------------|
| `0 9 * * *` | Every day at 9:00 AM |
| `0 * * * *` | Every hour |
| `*/15 * * * *` | Every 15 minutes |
| `0 0 * * 0` | Every Sunday at midnight |
| `0 8 * * 1-5` | Every weekday at 8:00 AM |
| `@daily` | Once a day at midnight |
| `@hourly` | Once an hour |
| `@weekly` | Once a week |

## Project Structure

```
task-scheduler-backend/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Database migrations
├── src/
│   ├── app.module.ts          # Root application module
│   ├── main.ts                # Application entry point
│   ├── tasks/
│   │   ├── tasks.controller.ts
│   │   ├── tasks.service.ts
│   │   ├── tasks.module.ts
│   │   ├── logs.controller.ts
│   │   └── dto/               # Data Transfer Objects
│   ├── scheduler/
│   │   ├── scheduler.service.ts
│   │   └── scheduler.module.ts
│   ├── discord/
│   │   ├── discord.service.ts
│   │   └── discord.module.ts
│   ├── auth/
│   │   ├── auth.guard.ts
│   │   └── auth.module.ts
│   └── prisma/
│       ├── prisma.service.ts
│       └── prisma.module.ts
├── test/                      # E2E tests
├── docker-compose.yml         # Local development
├── docker-compose.prod.yml    # Production (with Traefik)
├── Dockerfile                 # Multi-stage Docker build
└── README.md                  # This file
```

## Troubleshooting

### Database Connection Issues

**Problem**: `Error: Can't reach database server`

**Solution**:
1. Ensure PostgreSQL is running
2. Check DATABASE_URL in .env file
3. Verify PostgreSQL port (default: 5432) is not in use

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Test connection
psql -h localhost -U postgres -d task_scheduler
```

### Prisma Client Not Found

**Problem**: `Cannot find module '@prisma/client'`

**Solution**:
```bash
# Regenerate Prisma Client
npx prisma generate

# Reinstall dependencies
rm -rf node_modules
npm install
```

### Docker Build Failures

**Problem**: Docker build fails with dependency errors

**Solution**:
```bash
# Clear Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache

# Check .dockerignore is not excluding necessary files
```

### Cron Expression Not Working

**Problem**: Task not executing at expected time

**Solution**:
1. Verify cron expression syntax using [crontab.guru](https://crontab.guru)
2. Check server timezone matches expected timezone
3. Ensure task status is ACTIVE
4. Check application logs for scheduler errors

### Webhook Delivery Failures

**Problem**: Discord webhooks not being delivered

**Solution**:
1. Verify Discord webhook URL is valid
2. Check Discord webhook rate limits (30 requests per minute)
3. Review task logs for specific error messages
4. Ensure payload size doesn't exceed Discord limits (2000 chars for content)

## Performance Considerations

- **Database Indexing**: TaskLog has an index on `taskId` for efficient log queries
- **Pagination**: All list endpoints support pagination to handle large datasets
- **Connection Pooling**: Prisma uses connection pooling (17 connections by default)
- **Multi-stage Docker Builds**: Optimized image size and build time
- **Caching**: Optional Redis integration for caching frequently accessed data

## Security

- **API Key Authentication**: All endpoints (except docs) require X-API-KEY header
- **Input Validation**: class-validator ensures all inputs are validated
- **SQL Injection Prevention**: Prisma ORM prevents SQL injection attacks
- **CORS**: Configured to allow specific origins in production
- **Environment Variables**: Sensitive data stored in .env (not committed)
- **Docker Secrets**: Use Docker secrets for production credentials

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the UNLICENSED License - see the LICENSE file for details.

## Contact & Support

For questions, issues, or feature requests, please:
- Open an issue on GitHub
- Contact the development team
- Check the [API Documentation](./API.md)
- Review the [Deployment Guide](./DEPLOYMENT.md)

---

**Built with ❤️ using NestJS, Prisma, and Claude Code**
