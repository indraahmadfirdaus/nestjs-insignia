# Task Scheduler Backend

A robust NestJS-based task scheduler application that executes scheduled tasks and sends Discord webhook notifications.

## Features

- **Task Management**: Full CRUD operations for scheduled tasks
- **Dynamic Scheduling**: Cron-based task scheduling with real-time updates
- **Discord Integration**: Automated webhook notifications
- **Retry Mechanism**: Configurable retry logic with exponential backoff
- **Execution Logging**: Comprehensive logging of all task executions
- **API Security**: API key-based authentication

## Tech Stack

- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Task Scheduling**: @nestjs/schedule
- **Validation**: class-validator & class-transformer

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- PostgreSQL (v14 or higher)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd task-scheduler-backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and configure your database connection and other settings.

4. Generate Prisma Client:
```bash
npx prisma generate
```

5. Run database migrations:
```bash
npx prisma migrate dev
```

## Development

Run the application in development mode:
```bash
npm run start:dev
```

The API will be available at `http://localhost:3005/api`

## Database Commands

```bash
# Generate Prisma Client
npx prisma generate

# Create a new migration
npx prisma migrate dev --name <migration-name>

# Run migrations in production
npx prisma migrate deploy

# Open Prisma Studio (Database GUI)
npx prisma studio

# Reset database (development only)
npx prisma migrate reset
```

## Project Structure

```
src/
├── auth/              # Authentication module (API key guard)
├── discord/           # Discord webhook integration
├── prisma/            # Prisma service and module
├── scheduler/         # Task scheduling logic
├── tasks/             # Task CRUD operations
│   └── dto/          # Data Transfer Objects
├── app.module.ts      # Root module
└── main.ts           # Application entry point
```

## Environment Variables

See `.env.example` for required environment variables:

- `DATABASE_URL`: PostgreSQL connection string
- `API_KEY`: Secret key for API authentication
- `PORT`: Application port (default: 3005)
- `NODE_ENV`: Environment (development/production)

## API Endpoints

### Tasks
- `POST /api/tasks` - Create new task
- `GET /api/tasks` - Get all tasks
- `GET /api/tasks/:id` - Get task by ID
- `PATCH /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Logs
- `GET /api/tasks/:id/logs` - Get task execution logs

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Build & Production

```bash
# Build the application
npm run build

# Run in production mode
npm run start:prod
```

## License

MIT
