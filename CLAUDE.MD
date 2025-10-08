# Claude Code Configuration

## Project Context
Full-stack Discord Task Scheduler application for Insignia Technical Test.

## Current Focus
Backend development using NestJS with TypeScript and Prisma ORM.

## Tech Stack
- **Backend Framework**: NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma (with migrations)
- **Task Scheduling**: @nestjs/schedule with node-cron
- **Caching**: Redis (optional)
- **Authentication**: API Key/Token based
- **Testing**: Jest
- **Containerization**: Docker & Docker Compose with Traefik
- **Reverse Proxy**: Traefik (existing infrastructure)

## Project Structure
```
task-scheduler-backend/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── tasks/
│   │   ├── tasks.controller.ts
│   │   ├── tasks.service.ts
│   │   ├── tasks.module.ts
│   │   └── dto/
│   │       ├── create-task.dto.ts
│   │       └── update-task.dto.ts
│   ├── scheduler/
│   │   ├── scheduler.service.ts
│   │   └── scheduler.module.ts
│   ├── discord/
│   │   ├── discord.service.ts
│   │   └── discord.module.ts
│   ├── auth/
│   │   ├── auth.guard.ts
│   │   └── auth.module.ts
│   ├── prisma/
│   │   ├── prisma.service.ts
│   │   └── prisma.module.ts
│   ├── app.module.ts
│   └── main.ts
├── test/
├── docker-compose.yml (for local dev)
├── docker-compose.prod.yml (for production with Traefik)
├── Dockerfile
├── .env.example
└── package.json
```

## Database Schema (Prisma)

### Prisma Schema Structure
```prisma
model Task {
  id          String    @id @default(uuid())
  name        String
  schedule    String    // cron format
  webhookUrl  String    @map("webhook_url")
  payload     Json      // Discord payload as JSON
  maxRetry    Int       @default(3) @map("max_retry")
  status      TaskStatus @default(ACTIVE)
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  
  logs        TaskLog[]
  
  @@map("tasks")
}

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

enum TaskStatus {
  ACTIVE
  INACTIVE
  FAILED
}

enum LogStatus {
  SUCCESS
  FAILED
  RETRYING
}
```

## Features to Implement

### 1. CRUD Operations
- Create task with validation
- List all tasks (with pagination)
- Get single task with logs
- Update task
- Delete task (soft delete optional)

### 2. Task Scheduling
- Dynamic cron job registration using @nestjs/schedule
- Load all active tasks on app start
- Execute tasks based on schedule
- Send Discord webhook on execution

### 3. Discord Integration
- POST request to Discord webhook URL
- Validate payload format
- Handle Discord API responses
- Log all webhook attempts

### 4. Retry Mechanism
- Configurable retry count per task
- Exponential backoff strategy
- Update task status after max retries
- Log each retry attempt

### 5. API Security
- API Key authentication via headers
- Protect all endpoints
- Environment-based secret management

### 6. Logging System
- Log all task executions
- Store success/failure status
- Track retry attempts
- Queryable log history

## API Endpoints

### Tasks
- `POST /api/tasks` - Create new task
- `GET /api/tasks` - Get all tasks (with query params for filtering)
- `GET /api/tasks/:id` - Get task by ID
- `PATCH /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `POST /api/tasks/:id/toggle` - Toggle task active/inactive

### Logs
- `GET /api/tasks/:id/logs` - Get task execution logs
- `GET /api/logs` - Get all logs (with filtering)

### Dashboard
- `GET /api/dashboard/stats` - Get statistics (total, active, failed tasks)

## Environment Variables

### Development (.env)
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

### Production (.env.production)
```env
# Database
DATABASE_URL="postgresql://postgres:${POSTGRES_PASSWORD}@postgres-main:5432/task_scheduler?schema=public"

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# API Security
API_KEY=${TASK_SCHEDULER_API_KEY}

# Application
PORT=3005
NODE_ENV=production

# Domain for Traefik
DOMAIN=your-domain.com
```

## Docker Configuration

### Local Development (docker-compose.yml)
Simple setup for local dev with PostgreSQL and Redis.

### Production (docker-compose.prod.yml)
Integrated with existing Traefik setup:
- Uses existing `postgres-main` service
- Uses existing `redis` service
- Uses existing `attendance-network`
- Traefik labels for routing: `/api/task-scheduler`
- SSL via Let's Encrypt (automatic)

## Prisma Commands
```bash
# Generate Prisma Client
npx prisma generate

# Create migration
npx prisma migrate dev --name init

# Run migrations (production)
npx prisma migrate deploy

# Open Prisma Studio
npx prisma studio

# Reset database (dev only)
npx prisma migrate reset

# Seed database (if needed)
npx prisma db seed
```

## NestJS Commands
```bash
# Development
npm run start:dev

# Build
npm run build

# Production
npm run start:prod

# Testing
npm run test
npm run test:cov
npm run test:e2e

# Linting
npm run lint
npm run format
```

## Docker Commands
```bash
# Local Development
docker-compose up -d
docker-compose logs -f
docker-compose down

# Production
docker-compose -f docker-compose.prod.yml up -d
docker-compose -f docker-compose.prod.yml logs -f task-scheduler
docker-compose -f docker-compose.prod.yml down
```

## Discord Webhook Payload Example
```json
{
  "content": "Task executed successfully!",
  "username": "Task Scheduler Bot",
  "avatar_url": "https://i.imgur.com/4M34hi2.png",
  "embeds": [
    {
      "title": "✅ Task Completed",
      "description": "Task has been executed successfully",
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

## Development Guidelines

### Code Quality
1. Use TypeScript strict mode
2. Follow NestJS best practices
3. Use dependency injection
4. Implement proper error handling
5. Add comprehensive logging
6. Write meaningful commit messages

### Database
1. Always use Prisma migrations
2. Never write raw SQL in application code
3. Use transactions for critical operations
4. Index frequently queried fields
5. Use proper relations and cascades

### Security
1. Never commit secrets to Git
2. Use environment variables
3. Validate all inputs with class-validator
4. Sanitize user inputs
5. Use API key authentication

### Testing
1. Write unit tests for services
2. Mock external dependencies
3. Test edge cases and errors
4. Aim for >80% code coverage
5. Use Jest for all testing

### Performance
1. Use Redis for caching (optional)
2. Implement pagination for lists
3. Use database indexes
4. Avoid N+1 queries
5. Optimize cron job execution

## Integration with Existing Infrastructure

### Traefik Routing
The task scheduler will be available at:
- `https://${DOMAIN}/api/task-scheduler/*`

### Database
Uses the same PostgreSQL instance:
- Service: `postgres-main`
- Database: `task_scheduler` (separate schema)

### Redis
Uses the same Redis instance:
- Service: `redis`
- For caching and rate limiting

### Network
Joins existing network:
- `attendance-network`

## Notes
- Prisma Client will be generated during build
- Migrations run automatically on container start (production)
- Health check endpoint: `GET /health`
- API documentation available at: `/api/task-scheduler/docs` (Swagger)
- All timestamps in UTC
- Cron expressions use standard cron format
- Maximum task payload size: 2000 characters (Discord limit)