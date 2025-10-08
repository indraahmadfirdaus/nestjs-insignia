# Backend Development Prompts for Claude Code (with Prisma)

## Phase 1: Project Setup & Database Schema

### Prompt 1: Initial Project Setup
```
PLAN: Set up NestJS backend project with TypeScript, Prisma ORM, PostgreSQL, and necessary dependencies

TODO:
1. Initialize new NestJS project with CLI:
   - npx @nestjs/cli new task-scheduler-backend
   - Choose npm as package manager
2. Install required dependencies:
   - npm install @prisma/client
   - npm install -D prisma
   - npm install @nestjs/config
   - npm install @nestjs/schedule
   - npm install class-validator class-transformer
   - npm install axios
   - npm install cron
3. Initialize Prisma:
   - npx prisma init
   - Configure PostgreSQL in .env
4. Set up project structure:
   - Create modules: tasks, scheduler, discord, auth, prisma
   - Generate resources with NestJS CLI
5. Configure @nestjs/config for environment variables
6. Create .env.example file with all variables
7. Update .gitignore to exclude .env and node_modules
8. Create README.md with basic project info
```

### Prompt 2: Prisma Schema & Database Setup
```
PLAN: Design Prisma schema for tasks and task_logs with proper relations, then create initial migration

TODO:
1. Define Prisma schema in prisma/schema.prisma:
   - Task model with fields:
     * id (String, UUID, @id @default(uuid()))
     * name (String)
     * schedule (String, cron format)
     * webhookUrl (String, @map("webhook_url"))
     * payload (Json, for Discord webhook payload)
     * maxRetry (Int, @default(3), @map("max_retry"))
     * status (TaskStatus enum: ACTIVE, INACTIVE, FAILED)
     * createdAt (DateTime, @default(now()), @map("created_at"))
     * updatedAt (DateTime, @updatedAt, @map("updated_at"))
   - TaskLog model with fields:
     * id (String, UUID, @id @default(uuid()))
     * taskId (String, @map("task_id"))
     * executionTime (DateTime, @default(now()), @map("execution_time"))
     * status (LogStatus enum: SUCCESS, FAILED, RETRYING)
     * retryCount (Int, @default(0), @map("retry_count"))
     * message (String?, @db.Text)
     * createdAt (DateTime, @default(now()), @map("created_at"))
   - Define relation: Task hasMany TaskLog, TaskLog belongsTo Task
   - Add @@map() for snake_case table names
   - Add @@index for taskId in TaskLog
   - Set onDelete: Cascade for TaskLog relation
2. Generate Prisma Client: npx prisma generate
3. Create initial migration: npx prisma migrate dev --name init
4. Verify migration files are created in prisma/migrations/
```

### Prompt 3: Prisma Service Setup
```
PLAN: Create Prisma service module for database access throughout the application

TODO:
1. Create PrismaService in src/prisma/prisma.service.ts:
   - Extend PrismaClient
   - Implement OnModuleInit and OnModuleDestroy
   - Add $connect() in onModuleInit
   - Add $disconnect() in onModuleDestroy
   - Enable logging in development
2. Create PrismaModule in src/prisma/prisma.module.ts:
   - Export PrismaService for global use
3. Make PrismaModule global in AppModule
4. Add proper error handling for database connections
```

## Phase 2: Core Features

### Prompt 4: Tasks CRUD with DTOs
```
PLAN: Implement complete CRUD operations for tasks with validation and proper DTOs

TODO:
1. Create DTOs in src/tasks/dto/:
   - create-task.dto.ts with class-validator decorators:
     * name: @IsString() @IsNotEmpty() @MaxLength(100)
     * schedule: @IsString() @Matches(cron regex) - validate cron format
     * webhookUrl: @IsUrl() @IsNotEmpty()
     * payload: @IsObject() @IsNotEmpty() - Discord webhook format
     * maxRetry: @IsInt() @Min(0) @Max(10) @IsOptional()
     * status: @IsEnum(TaskStatus) @IsOptional()
   - update-task.dto.ts: PartialType(CreateTaskDto)
   - task-response.dto.ts for API responses
2. Implement TasksService in src/tasks/tasks.service.ts:
   - Inject PrismaService
   - create(createTaskDto): Create new task, validate payload structure
   - findAll(page, limit, status): Get paginated tasks with optional status filter
   - findOne(id): Get task by ID with related logs
   - update(id, updateTaskDto): Update task, re-schedule if schedule changed
   - remove(id): Delete task (hard delete or soft delete)
   - getActiveTasksForScheduler(): Get all ACTIVE tasks for scheduler
   - updateTaskStatus(id, status): Update only status field
   - getDashboardStats(): Return {total, active, inactive, failed} counts
3. Implement TasksController in src/tasks/tasks.controller.ts:
   - POST /tasks - Create task
   - GET /tasks - List tasks with pagination (?page=1&limit=10&status=ACTIVE)
   - GET /tasks/:id - Get single task
   - PATCH /tasks/:id - Update task
   - DELETE /tasks/:id - Delete task
   - POST /tasks/:id/toggle - Toggle status ACTIVE/INACTIVE
   - GET /dashboard/stats - Get dashboard statistics
4. Add proper error handling:
   - NotFoundException for missing tasks
   - BadRequestException for validation errors
   - Proper error messages
5. Add logging using NestJS Logger
6. Export TasksService for use in SchedulerService
```

### Prompt 5: Discord Webhook Service
```
PLAN: Create Discord service to handle webhook POST requests with validation and error handling

TODO:
1. Create DiscordService in src/discord/discord.service.ts:
   - Inject HttpService from @nestjs/axios
   - Method: sendWebhook(webhookUrl: string, payload: any): Promise<boolean>
     * Validate Discord webhook URL format
     * Validate payload structure (content, embeds, username)
     * Send POST request using axios
     * Set proper headers: Content-Type: application/json
     * Configure timeout: 10 seconds
     * Handle success (2xx) and error responses
     * Return true on success, false on failure
   - Method: validateWebhookPayload(payload): boolean
     * Check required fields
     * Validate embeds structure if present
     * Validate color values (0-16777215)
   - Add comprehensive error logging
   - Add retry with exponential backoff (3 attempts)
2. Create DiscordModule and export DiscordService
3. Add tests for Discord service:
   - Mock axios calls
   - Test successful webhook delivery
   - Test failed webhook (network error, 4xx, 5xx)
   - Test payload validation
   - Test timeout handling
```

### Prompt 6: Task Scheduler Implementation
```
PLAN: Implement dynamic task scheduling engine with cron jobs, execution logic, and retry mechanism

TODO:
1. Create SchedulerService in src/scheduler/scheduler.service.ts:
   - Use @nestjs/schedule module
   - Inject TasksService, DiscordService, PrismaService
   - Maintain Map<string, ScheduledTask> for active jobs
   
2. Implement core methods:
   - onModuleInit(): Load all ACTIVE tasks from DB and register cron jobs
   - registerTask(task: Task): Register single cron job
     * Use @Cron decorator or SchedulerRegistry
     * Store job reference in Map
   - unregisterTask(taskId: string): Remove cron job from registry
   - executeTask(task: Task): Main execution logic
     * Send Discord webhook via DiscordService
     * Create TaskLog entry with status
     * Handle success/failure
     * Call retry logic if failed
   
3. Implement retry mechanism:
   - retryTask(task: Task, retryCount: number, error: string):
     * Check if retryCount < maxRetry
     * If yes: Wait (exponential backoff), then retry
     * If no: Update task status to FAILED
     * Log each retry attempt in TaskLog
   - Exponential backoff formula: delay = 2^retryCount * 1000ms
   
4. Implement dynamic job management:
   - reloadTask(taskId: string): Unregister old job, fetch updated task, register new job
   - reloadAllTasks(): Refresh all scheduled jobs (useful after bulk updates)
   
5. Add health monitoring:
   - Track last execution time for each task
   - Log any jobs that fail to execute
   - Expose metrics endpoint (optional)
   
6. Handle edge cases:
   - Invalid cron expressions (catch and log)
   - Tasks deleted while scheduled (handle gracefully)
   - Concurrent execution prevention (if needed)
   
7. Add logging:
   - Log when jobs are registered/unregistered
   - Log all task executions
   - Log retry attempts
   - Use different log levels (info, warn, error)
```

### Prompt 7: Task Logs API
```
PLAN: Create endpoints to view and query task execution logs

TODO:
1. Create LogsController in src/tasks/logs.controller.ts:
   - GET /tasks/:taskId/logs - Get logs for specific task
     * Add pagination (?page=1&limit=20)
     * Add status filter (?status=FAILED)
     * Order by executionTime DESC
   - GET /logs - Get all logs across all tasks
     * Add pagination
     * Add filters: taskId, status, dateFrom, dateTo
     * Order by executionTime DESC
2. Add methods to TasksService or create separate LogsService:
   - findLogsByTaskId(taskId, filters)
   - findAllLogs(filters)
3. Create DTOs for query parameters with validation
4. Return proper response format with metadata:
   {
     data: [...],
     meta: { page, limit, total, totalPages }
   }
```

## Phase 3: Security & Testing

### Prompt 8: API Key Authentication
```
PLAN: Implement API key authentication guard to protect all endpoints from public access

TODO:
1. Create AuthGuard in src/auth/guards/api-key.guard.ts:
   - Implement CanActivate interface
   - Read API key from request headers: X-API-Key or Authorization: Bearer <key>
   - Compare with API_KEY from environment variables
   - Return true if match, throw UnauthorizedException if not
   - Log authentication attempts (success/failure)
2. Create AuthModule in src/auth/auth.module.ts
3. Apply guard globally in main.ts:
   - app.useGlobalGuards(new ApiKeyGuard())
   OR
   Apply to controllers using @UseGuards(ApiKeyGuard) decorator
4. Add API key to .env and .env.example:
   - API_KEY=your-secret-api-key-change-this-in-production
5. Document authentication in Swagger/OpenAPI:
   - Add security scheme
   - Add bearer token input in Swagger UI
6. Create tests for AuthGuard:
   - Test with valid API key
   - Test with invalid API key
   - Test with missing API key
   - Test different header formats
```

### Prompt 9: Comprehensive Unit Tests
```
PLAN: Generate unit tests for all critical functionality with high code coverage

TODO:
1. Create tests for TasksService (src/tasks/tasks.service.spec.ts):
   - Mock PrismaService
   - Test create(): valid input, invalid input, duplicate name
   - Test findAll(): pagination, filtering, empty results
   - Test findOne(): existing task, non-existent task
   - Test update(): valid update, invalid ID, validation errors
   - Test remove(): successful deletion, non-existent task
   - Test getDashboardStats(): correct counts
   
2. Create tests for SchedulerService (src/scheduler/scheduler.service.spec.ts):
   - Mock TasksService, DiscordService, PrismaService
   - Test onModuleInit(): loads and registers active tasks
   - Test registerTask(): creates cron job correctly
   - Test executeTask(): sends webhook, creates log
   - Test retryTask(): retries on failure, respects maxRetry
   - Test retry mechanism with exponential backoff
   - Test status updates on success/failure
   
3. Create tests for DiscordService (src/discord/discord.service.spec.ts):
   - Mock axios
   - Test sendWebhook(): successful delivery (200 OK)
   - Test sendWebhook(): Discord API errors (4xx, 5xx)
   - Test sendWebhook(): network timeout
   - Test sendWebhook(): invalid URL
   - Test validateWebhookPayload(): valid payload
   - Test validateWebhookPayload(): invalid payload structures
   
4. Create tests for ApiKeyGuard (src/auth/guards/api-key.guard.spec.ts):
   - Mock ExecutionContext
   - Test canActivate(): valid API key in X-API-Key header
   - Test canActivate(): valid API key in Authorization header
   - Test canActivate(): invalid API key
   - Test canActivate(): missing API key
   
5. Create E2E tests (test/app.e2e-spec.ts):
   - Test full task creation flow
   - Test task execution via scheduler (mock cron timing)
   - Test authentication on all endpoints
   - Test error responses
   
6. Configure Jest coverage:
   - Set coverage threshold: 80%
   - Generate coverage report: npm run test:cov
   - Exclude from coverage: *.module.ts, main.ts, *.dto.ts
   
7. Run all tests and ensure they pass:
   - npm run test
   - npm run test:cov
   - npm run test:e2e
```

### Prompt 10: Swagger/OpenAPI Documentation
```
PLAN: Add comprehensive API documentation using Swagger/OpenAPI

TODO:
1. Install Swagger dependencies:
   - npm install @nestjs/swagger swagger-ui-express
2. Configure Swagger in main.ts:
   - Import DocumentBuilder, SwaggerModule
   - Create OpenAPI document with:
     * Title: "Task Scheduler API"
     * Description: "Discord webhook task scheduler"
     * Version: "1.0"
     * Add API key security scheme
   - Setup Swagger UI at /api/task-scheduler/docs
3. Add Swagger decorators to DTOs:
   - @ApiProperty() for each field
   - Add description, example, required, type
4. Add Swagger decorators to controllers:
   - @ApiTags() for grouping
   - @ApiOperation() for each endpoint
   - @ApiResponse() for different status codes
   - @ApiBearerAuth() for authenticated endpoints
5. Add example payloads for requests/responses
6. Document error responses (400, 401, 404, 500)
7. Test Swagger UI: http://localhost:3005/api/task-scheduler/docs
```

### Prompt 11: Docker Configuration for Local Development
```
PLAN: Create Docker setup for local development with PostgreSQL and Redis

TODO:
1. Create Dockerfile for the application:
   - Use multi-stage build:
     * Stage 1 (deps): Install dependencies
     * Stage 2 (build): Build application and generate Prisma Client
     * Stage 3 (production): Copy built files and run
   - Base image: node:20-alpine
   - Set working directory: /app
   - Copy package files and install dependencies
   - Copy source code
   - Generate Prisma Client: npx prisma generate
   - Build: npm run build
   - Expose port 3005
   - Run migrations on start: npx prisma migrate deploy
   - Start application: npm run start:prod
   
2. Create docker-compose.yml for local development:
   services:
     postgres:
       image: postgres:15-alpine
       environment:
         POSTGRES_DB: task_scheduler
         POSTGRES_USER: postgres
         POSTGRES_PASSWORD: postgres
       ports:
         - "5432:5432"
       volumes:
         - postgres_data:/var/lib/postgresql/data
     
     redis:
       image: redis:7-alpine
       ports:
         - "6379:6379"
       volumes:
         - redis_data:/data
     
     task-scheduler:
       build: .
       ports:
         - "3005:3005"
       environment:
         DATABASE_URL: postgresql://postgres:postgres@postgres:5432/task_scheduler
         REDIS_HOST: redis
         REDIS_PORT: 6379
         API_KEY: dev-api-key-12345
         NODE_ENV: development
       depends_on:
         - postgres
         - redis
       volumes:
         - ./src:/app/src (for hot reload in dev)
   
   volumes:
     postgres_data:
     redis_data:
   
3. Create .dockerignore:
   - node_modules
   - dist
   - .env
   - .git
   - *.md
   
4. Test Docker setup:
   - docker-compose up --build
   - Test API endpoints
   - Verify Prisma migrations run automatically
```

### Prompt 12: Production Docker Compose with Traefik Integration
```
PLAN: Create production Docker Compose configuration integrated with existing Traefik infrastructure

TODO:
1. Create docker-compose.prod.yml:
   services:
     task-scheduler:
       build:
         context: .
         dockerfile: Dockerfile
       container_name: attendance-task-scheduler
       restart: always
       environment:
         NODE_ENV: production
         DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD}@postgres-main:5432/task_scheduler?schema=public
         REDIS_HOST: redis
         REDIS_PORT: 6379
         API_KEY: ${TASK_SCHEDULER_API_KEY}
         PORT: 3005
       depends_on:
         - postgres-main
         - redis
       networks:
         - attendance-network
       labels:
         # Enable Traefik
         - "traefik.enable=true"
         
         # HTTP Router for API
         - "traefik.http.routers.task-scheduler.rule=Host(`${DOMAIN}`) && PathPrefix(`/api/task-scheduler`)"
         - "traefik.http.routers.task-scheduler.entrypoints=websecure"
         - "traefik.http.routers.task-scheduler.tls.certresolver=letsencrypt"
         - "traefik.http.routers.task-scheduler.service=task-scheduler"
         - "traefik.http.services.task-scheduler.loadbalancer.server.port=3005"
         
         # Strip prefix middleware
         - "traefik.http.middlewares.task-scheduler-stripprefix.stripprefix.prefixes=/api/task-scheduler"
         - "traefik.http.routers.task-scheduler.middlewares=task-scheduler-stripprefix"
   
   networks:
     attendance-network:
       external: true
   
2. Update existing docker-compose.yml to add task_scheduler database initialization:
   - Add to postgres-main service environment or init script
   
3. Create deployment script (deploy.sh):
   #!/bin/bash
   # Build image
   docker-compose -f docker-compose.prod.yml build
   
   # Run migrations
   docker-compose -f docker-compose.prod.yml run --rm task-scheduler npx prisma migrate deploy
   
   # Start service
   docker-compose -f docker-compose.prod.yml up -d
   
   # Show logs
   docker-compose -f docker-compose.prod.yml logs -f task-scheduler
   
4. Document deployment steps in README.md
5. Add health check endpoint: GET /health
```

## Phase 4: Documentation & Final Touches

### Prompt 13: Comprehensive README Documentation
```
PLAN: Create detailed README.md with setup instructions, API documentation, and Claude Code usage examples

TODO:
1. Write README.md with following sections:
   
   ## Task Scheduler Backend
   Discord webhook task scheduler built with NestJS and Prisma
   
   ## Features
   - Dynamic task scheduling with cron expressions
   - Discord webhook integration
   - Automatic retry mechanism with exponential backoff
   - Task execution logging
   - API key authentication
   - Dashboard statistics
   - RESTful API with Swagger documentation
   
   ## Tech Stack
   - NestJS 10.x
   - Prisma ORM
   - PostgreSQL 15
   - Redis 7
   - TypeScript
   - Docker & Docker Compose
   - Traefik (reverse proxy)
   
   ## Prerequisites
   - Node.js 20+
   - Docker & Docker Compose
   - PostgreSQL 15
   - Discord Webhook URL (for testing)
   
   ## Local Development Setup
   Step-by-step instructions with commands
   
   ## Environment Variables
   Complete list with descriptions
   
   ## API Endpoints
   Table with all endpoints, methods, descriptions
   
   ## Running Tests
   Commands for unit tests, e2e tests, coverage
   
   ## Docker Deployment
   Instructions for both local and production
   
   ## Claude Code Usage Examples
   Document 3+ instances where Claude Code was used:
   1. Initial project setup and dependency installation
   2. Prisma schema design and migration generation
   3. Unit test generation for all services
   Include screenshots or output logs
   
   ## API Documentation
   Link to Swagger UI
   
   ## Troubleshooting
   Common issues and solutions
   
   ## License
   
2. Create API.md with detailed endpoint documentation:
   - Request/response examples for each endpoint
   - cURL examples
   - Error responses
   
3. Create DEPLOYMENT.md with production deployment guide:
   - Prerequisites
   - Environment setup
   - Database initialization
   - Traefik configuration
   - SSL certificate setup
   - Monitoring and logging
   - Backup strategies
   
4. Create TESTING.md with testing guide:
   - How to write tests
   - Running specific test suites
   - Mocking strategies
   - Coverage reports
   
5. Export Postman/Thunder Client collection:
   - Create collection with all endpoints
   - Add environment variables
   - Add example requests
   - Export to JSON file: task-scheduler.postman_collection.json
```

```
PLAN: Implement caching and optimize database queries for better performance

TODO:
1. Add Redis caching (optional but recommended):
   - Install: npm install cache-manager cache-manager-redis-store
   - Configure CacheModule in AppModule:
     * Set TTL (Time To Live)
     * Configure Redis connection
   - Cache frequently accessed data:
     * Dashboard statistics (TTL: 1 minute)
     * Active tasks list (TTL: 30 seconds)
   
2. Optimize database queries:
   - Add database indexes in Prisma schema:
     * @@index([status]) on Task model
     * @@index([taskId, executionTime]) on TaskLog model
     * @@index([createdAt]) on both models for sorting
   - Use select to limit returned fields:
     * Don't fetch payload if not needed
   - Implement cursor-based pagination for large datasets
   
3. Implement rate limiting:
   - Install: npm install @nestjs/throttler
   - Configure ThrottlerModule:
     * Limit: 100 requests per minute per IP
   - Apply to public endpoints
   
4. Add pagination helpers:
   - Create PaginationDto with validation
   - Create PaginatedResponse type
   - Helper function: paginate(model, page, limit)
   
5. Optimize cron job execution:
   - Batch database operations where possible
   - Use transactions for related operations
   - Avoid N+1 queries (use includes)
   
6. Add database connection pooling:
   - Configure in Prisma schema:
     datasource db {
       provider = "postgresql"
       url      = env("DATABASE_URL")
       connection_limit = 10
       pool_timeout = 20
     }
```

### Prompt 14: Integration Testing & E2E Tests
```
PLAN: Create comprehensive integration and end-to-end tests

TODO:
1. Set up test database:
   - Create .env.test file with test database URL
   - Add test scripts to package.json:
     * "test:e2e": "jest --config ./test/jest-e2e.json"
   
2. Create E2E test suite (test/tasks.e2e-spec.ts):
   - Set up test module with real database
   - Before all: Clear database and seed test data
   - After all: Clean up test data
   
   Test scenarios:
   - Create task flow:
     * POST /tasks with valid data -> 201 Created
     * Verify task in database
     * Check task is scheduled
   
   - List tasks flow:
     * GET /tasks -> 200 OK
     * Test pagination
     * Test filtering by status
   
   - Update task flow:
     * PATCH /tasks/:id -> 200 OK
     * Verify updated data
     * Check task is re-scheduled if schedule changed
   
   - Delete task flow:
     * DELETE /tasks/:id -> 200 OK
     * Verify task removed from database
     * Check task is unscheduled
   
   - Authentication flow:
     * Request without API key -> 401 Unauthorized
     * Request with invalid API key -> 401 Unauthorized
     * Request with valid API key -> 200 OK
   
   - Task execution flow (mocked):
     * Trigger task execution manually
     * Verify webhook is called
     * Verify log is created
     * Test retry on failure
   
3. Create integration test for scheduler:
   - Test task registration on app start
   - Test dynamic job management
   - Test retry mechanism with real database
   
4. Run tests:
   - npm run test:e2e
   - Verify all tests pass
   - Check coverage report
```

```
PLAN: Implement additional security measures and best practices

TODO:
1. Add Helmet middleware for security headers:
   - Install: npm install helmet
   - Configure in main.ts: app.use(helmet())
   - Set security headers:
     * X-Content-Type-Options
     * X-Frame-Options
     * X-XSS-Protection
     * Strict-Transport-Security
   
2. Add CORS configuration:
   - Configure in main.ts:
     app.enableCors({
       origin: process.env.ALLOWED_ORIGINS?.split(','),
       credentials: true,
       methods: ['GET', 'POST', 'PATCH', 'DELETE']
     })
   
3. Sanitize inputs:
   - Install: npm install class-sanitizer
   - Sanitize string inputs to prevent XSS
   - Trim whitespace from all string inputs
   
4. Add request size limits:
   - Configure in main.ts:
     app.use(json({ limit: '1mb' }))
   - Prevent large payload attacks
   
5. Secure sensitive data:
   - Never log sensitive information (API keys, passwords)
   - Mask webhook URLs in logs (show only last 10 chars)
   - Encrypt sensitive data in database (if needed)
   
6. Add security.txt file (public/.well-known/security.txt):
   - Contact information for security issues
   - Security policy
   
7. Implement audit logging:
   - Log all task create/update/delete operations
   - Include user identifier (if multi-user in future)
   - Store in separate audit_logs table (optional)
```

### Prompt 15: Final Polish & Documentation
```
PLAN: Final code review, cleanup, and documentation improvements

TODO:
1. Code cleanup:
   - Remove console.log statements (use Logger)
   - Remove commented code
   - Fix all ESLint warnings
   - Format code: npm run format
   - Update all package versions: npm update
   
2. Documentation improvements:
   - Add JSDoc comments to all public methods
   - Document complex algorithms (retry logic, cron parsing)
   - Add inline comments for non-obvious code
   - Update README with any new features
   
3. Create CHANGELOG.md:
   - Document all features implemented
   - List technologies used
   - Note any known limitations
   
4. Create CONTRIBUTING.md (optional):
   - How to contribute
   - Code style guidelines
   - PR process
   
5. Add example .env files:
   - .env.example - for local development
   - .env.production.example - for production
   - Document all environment variables
   
6. Create scripts for common operations:
   - scripts/setup.sh - Initial setup script
   - scripts/migrate.sh - Run migrations
   - scripts/seed.sh - Seed database
   - scripts/test.sh - Run all tests
   - scripts/deploy.sh - Deploy to production
   
7. Verify all requirements from technical test:
   - ✅ Frontend (skip for backend-first approach)
   - ✅ Backend with TypeScript
   - ✅ PostgreSQL database
   - ✅ Prisma migrations (no manual SQL)
   - ✅ Task scheduling engine
   - ✅ Retry logic
   - ✅ API authentication
   - ✅ Discord webhook integration
   - ✅ Unit tests with coverage
   - ✅ Docker deployment
   - ✅ Claude Code usage documented
   
8. Create demo video or screenshots:
   - Show API in action (Postman/Thunder Client)
   - Show Swagger documentation
   - Show Prisma Studio with data
   - Show logs and task execution
   
9. Final testing:
   - Run all tests: npm run test && npm run test:e2e
   - Build production: npm run build
   - Start with Docker: docker-compose up
   - Test all API endpoints
   - Verify Traefik integration (production)
   
10. Push to Git repository:
    - Commit all changes with meaningful messages
    - Push to GitHub/GitLab
    - Add tags: git tag v1.0.0
    - Update repository description
```

## Usage Instructions

### How to Use These Prompts with Claude Code

1. **Start Claude Code**:
   ```bash
   mkdir task-scheduler-backend
   cd task-scheduler-backend
   claude-code
   ```

2. **Copy Prompts Sequentially**:
   - Start with Prompt 1 (Project Setup)
   - Paste the entire prompt (PLAN + TODO) into Claude Code
   - Wait for completion and review the code
   - Test the implementation
   - Move to the next prompt

3. **After Each Prompt**:
   ```bash
   # Commit your changes
   git add .
   git commit -m "feat: implement [feature name]"
   
   # Run tests if applicable
   npm run test
   ```

4. **Document Claude Code Usage**:
   - Take screenshots of prompts and outputs
   - Save console logs showing PLAN/TODO execution
   - Document in README which prompts were used
   - Minimum 3 instances required for technical test

### Quick Start Commands

```bash
# Phase 1: Setup (Prompts 1-3)
claude-code # Then paste Prompt 1
# After completion, paste Prompt 2, then 3

# Phase 2: Core Features (Prompts 4-7)
# Paste prompts 4, 5, 6, 7 sequentially

# Phase 3: Security & Testing (Prompts 8-9)
# Paste prompts 8, 9

# Phase 4: Docker & API Docs (Prompts 10-12)
# Paste prompts 10, 11, 12

# Phase 5: Final Polish (Prompts 13-20)
# Paste remaining prompts as needed
```

### Tips for Success

1. **Review Before Moving On**: Always review generated code before proceeding to next prompt
2. **Test Incrementally**: Test each feature as it's built
3. **Commit Often**: Commit after each major feature
4. **Keep Notes**: Document what works and what needs adjustment
5. **Use Git Branches**: Create branches for major features
6. **Check Dependencies**: Ensure all npm packages are installed
7. **Environment Variables**: Update .env after each phase
8. **Database Migrations**: Run migrations after schema changes
9. **Test Coverage**: Aim for >80% code coverage
10. **Docker Testing**: Test Docker setup before deploying

### Expected Timeline

- **Phase 1** (Setup): 30-60 minutes
- **Phase 2** (Core Features): 2-3 hours
- **Phase 3** (Security & Testing): 1-2 hours
- **Phase 4** (Docker & Docs): 1-2 hours
- **Phase 5** (Polish): 1-2 hours

**Total**: 6-10 hours for complete implementation

### Troubleshooting

If Claude Code encounters issues:
- Check syntax errors in generated code
- Verify all dependencies are installed
- Check environment variables
- Review Prisma schema for errors
- Run `npx prisma generate` if Prisma Client is outdated
- Clear node_modules and reinstall if needed

### Documentation Requirements

Remember to document:
1. At least 3 Claude Code usage instances with PLAN/TODO
2. All API endpoints with examples
3. How to run tests
4. Docker deployment steps
5. Environment variables
6. Traefik integration setup