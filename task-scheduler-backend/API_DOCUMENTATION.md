# Task Scheduler API Documentation

## Overview

The Task Scheduler API allows you to create, manage, and schedule automated Discord notifications. Tasks are executed based on cron schedules and automatically send formatted notifications to Discord channels.

**Base URL:** `http://localhost:3005/api` (Development)
**Production URL:** `https://your-domain.com/api/task-scheduler`

## Authentication

All endpoints require API Key authentication via the `X-API-Key` header.

```bash
X-API-Key: your-secret-api-key-here
```

---

## Table of Contents

1. [Tasks](#tasks)
   - [Create Task](#create-task)
   - [Get All Tasks](#get-all-tasks)
   - [Get Task by ID](#get-task-by-id)
   - [Update Task](#update-task)
   - [Delete Task](#delete-task)
   - [Toggle Task Status](#toggle-task-status)
2. [Logs](#logs)
   - [Get Task Logs](#get-task-logs)
   - [Get All Logs](#get-all-logs)
3. [Dashboard](#dashboard)
   - [Get Statistics](#get-statistics)

---

## Tasks

### Create Task

Create a new scheduled task that will send Discord notifications.

**Endpoint:** `POST /tasks`

**Request Body:**

```json
{
  "name": "Daily Status Report",
  "schedule": "0 9 * * *",
  "webhookUrl": "https://discord.com/api/webhooks/1234567890123456789/abcdefGHIJKLMNOP123456",
  "maxRetry": 3,
  "status": "ACTIVE"
}
```

**Field Descriptions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Task name (max 100 characters) |
| `schedule` | string | Yes | Cron expression or predefined schedule |
| `webhookUrl` | string | Yes | Full Discord webhook URL |
| `maxRetry` | number | No | Maximum retry attempts (0-10, default: 3) |
| `status` | string | No | Task status: `ACTIVE`, `INACTIVE`, `FAILED` (default: `ACTIVE`) |

**Cron Expression Examples:**

| Expression | Description |
|------------|-------------|
| `0 9 * * *` | Every day at 9:00 AM |
| `0 * * * *` | Every hour |
| `*/30 * * * *` | Every 30 minutes |
| `0 8 * * 1` | Every Monday at 8:00 AM |
| `@daily` | Once per day (midnight) |
| `@hourly` | Once per hour |
| `@weekly` | Once per week |

**Response:** `201 Created`

```json
{
  "id": "604cd8fd-628a-41c1-8d3a-b3588e1af653",
  "name": "Daily Status Report",
  "schedule": "0 9 * * *",
  "webhookUrl": "https://discord.com/api/webhooks/1234567890123456789/abcdefGHIJKLMNOP123456",
  "maxRetry": 3,
  "status": "ACTIVE",
  "createdAt": "2025-10-08T06:00:00.000Z",
  "updatedAt": "2025-10-08T06:00:00.000Z"
}
```

**Example cURL:**

```bash
curl -X POST http://localhost:3005/api/tasks \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-api-key-here" \
  -d '{
    "name": "Daily Status Report",
    "schedule": "0 9 * * *",
    "webhookUrl": "https://discord.com/api/webhooks/1234567890123456789/abcdefGHIJKLMNOP123456",
    "maxRetry": 3
  }'
```

---

### Get All Tasks

Retrieve a paginated list of tasks with optional filtering.

**Endpoint:** `GET /tasks`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 10) |
| `status` | string | No | Filter by status: `ACTIVE`, `INACTIVE`, `FAILED` |

**Response:** `200 OK`

```json
{
  "data": [
    {
      "id": "604cd8fd-628a-41c1-8d3a-b3588e1af653",
      "name": "Daily Status Report",
      "schedule": "0 9 * * *",
      "webhookUrl": "https://discord.com/api/webhooks/1234567890123456789/abcdefGHIJKLMNOP123456",
      "maxRetry": 3,
      "status": "ACTIVE",
      "createdAt": "2025-10-08T06:00:00.000Z",
      "updatedAt": "2025-10-08T06:00:00.000Z"
    }
  ],
  "meta": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  }
}
```

**Example cURL:**

```bash
# Get all active tasks
curl -X GET "http://localhost:3005/api/tasks?status=ACTIVE&page=1&limit=10" \
  -H "X-API-Key: your-secret-api-key-here"
```

---

### Get Task by ID

Retrieve a single task with its execution logs.

**Endpoint:** `GET /tasks/:id`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Task UUID |

**Response:** `200 OK`

```json
{
  "id": "604cd8fd-628a-41c1-8d3a-b3588e1af653",
  "name": "Daily Status Report",
  "schedule": "0 9 * * *",
  "webhookUrl": "https://discord.com/api/webhooks/1234567890123456789/abcdefGHIJKLMNOP123456",
  "maxRetry": 3,
  "status": "ACTIVE",
  "createdAt": "2025-10-08T06:00:00.000Z",
  "updatedAt": "2025-10-08T06:00:00.000Z",
  "logs": [
    {
      "id": "log-uuid",
      "taskId": "604cd8fd-628a-41c1-8d3a-b3588e1af653",
      "executionTime": "2025-10-08T09:00:00.000Z",
      "status": "SUCCESS",
      "retryCount": 0,
      "message": "Task executed successfully",
      "createdAt": "2025-10-08T09:00:00.000Z"
    }
  ]
}
```

**Example cURL:**

```bash
curl -X GET http://localhost:3005/api/tasks/604cd8fd-628a-41c1-8d3a-b3588e1af653 \
  -H "X-API-Key: your-secret-api-key-here"
```

---

### Update Task

Update an existing task's properties.

**Endpoint:** `PATCH /tasks/:id`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Task UUID |

**Request Body:** (All fields optional)

```json
{
  "name": "Updated Task Name",
  "schedule": "0 10 * * *",
  "webhookUrl": "https://discord.com/api/webhooks/9876543210987654321/newTokenABCDEF123456",
  "maxRetry": 5,
  "status": "INACTIVE"
}
```

**Response:** `200 OK`

```json
{
  "id": "604cd8fd-628a-41c1-8d3a-b3588e1af653",
  "name": "Updated Task Name",
  "schedule": "0 10 * * *",
  "webhookUrl": "https://discord.com/api/webhooks/9876543210987654321/newTokenABCDEF123456",
  "maxRetry": 5,
  "status": "INACTIVE",
  "createdAt": "2025-10-08T06:00:00.000Z",
  "updatedAt": "2025-10-08T07:00:00.000Z"
}
```

**Example cURL:**

```bash
curl -X PATCH http://localhost:3005/api/tasks/604cd8fd-628a-41c1-8d3a-b3588e1af653 \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-api-key-here" \
  -d '{
    "schedule": "0 10 * * *",
    "maxRetry": 5
  }'
```

---

### Delete Task

Delete a task and all its associated logs.

**Endpoint:** `DELETE /tasks/:id`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Task UUID |

**Response:** `200 OK`

```json
{
  "message": "Task deleted successfully"
}
```

**Example cURL:**

```bash
curl -X DELETE http://localhost:3005/api/tasks/604cd8fd-628a-41c1-8d3a-b3588e1af653 \
  -H "X-API-Key: your-secret-api-key-here"
```

---

### Toggle Task Status

Toggle a task between ACTIVE and INACTIVE status.

**Endpoint:** `POST /tasks/:id/toggle`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Task UUID |

**Response:** `200 OK`

```json
{
  "id": "604cd8fd-628a-41c1-8d3a-b3588e1af653",
  "name": "Daily Status Report",
  "schedule": "0 9 * * *",
  "webhookUrl": "https://discord.com/api/webhooks/1234567890123456789/abcdefGHIJKLMNOP123456",
  "maxRetry": 3,
  "status": "INACTIVE",
  "createdAt": "2025-10-08T06:00:00.000Z",
  "updatedAt": "2025-10-08T07:00:00.000Z"
}
```

**Example cURL:**

```bash
curl -X POST http://localhost:3005/api/tasks/604cd8fd-628a-41c1-8d3a-b3588e1af653/toggle \
  -H "X-API-Key: your-secret-api-key-here"
```

---

## Logs

### Get Task Logs

Retrieve execution logs for a specific task.

**Endpoint:** `GET /tasks/:taskId/logs`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `taskId` | string | Task UUID |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 20) |
| `status` | string | No | Filter by status: `SUCCESS`, `FAILED`, `RETRYING` |

**Response:** `200 OK`

```json
{
  "data": [
    {
      "id": "log-uuid-1",
      "taskId": "604cd8fd-628a-41c1-8d3a-b3588e1af653",
      "taskName": "Daily Status Report",
      "executionTime": "2025-10-08T09:00:00.000Z",
      "status": "SUCCESS",
      "retryCount": 0,
      "message": "Task executed successfully",
      "createdAt": "2025-10-08T09:00:00.000Z"
    },
    {
      "id": "log-uuid-2",
      "taskId": "604cd8fd-628a-41c1-8d3a-b3588e1af653",
      "taskName": "Daily Status Report",
      "executionTime": "2025-10-07T09:00:00.000Z",
      "status": "RETRYING",
      "retryCount": 1,
      "message": "Discord notification failed. Retrying...",
      "createdAt": "2025-10-07T09:00:00.000Z"
    }
  ],
  "meta": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

**Example cURL:**

```bash
curl -X GET "http://localhost:3005/api/tasks/604cd8fd-628a-41c1-8d3a-b3588e1af653/logs?status=SUCCESS&page=1" \
  -H "X-API-Key: your-secret-api-key-here"
```

---

### Get All Logs

Retrieve all execution logs with filtering options.

**Endpoint:** `GET /logs`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 20) |
| `taskId` | string | No | Filter by task UUID |
| `status` | string | No | Filter by status: `SUCCESS`, `FAILED`, `RETRYING` |
| `dateFrom` | string | No | Filter from date (ISO 8601) |
| `dateTo` | string | No | Filter to date (ISO 8601) |

**Response:** `200 OK`

```json
{
  "data": [
    {
      "id": "log-uuid-1",
      "taskId": "604cd8fd-628a-41c1-8d3a-b3588e1af653",
      "taskName": "Daily Status Report",
      "executionTime": "2025-10-08T09:00:00.000Z",
      "status": "SUCCESS",
      "retryCount": 0,
      "message": "Task executed successfully",
      "createdAt": "2025-10-08T09:00:00.000Z"
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

**Example cURL:**

```bash
# Get failed logs from the last 7 days
curl -X GET "http://localhost:3005/api/logs?status=FAILED&dateFrom=2025-10-01T00:00:00Z&dateTo=2025-10-08T23:59:59Z" \
  -H "X-API-Key: your-secret-api-key-here"
```

---

## Dashboard

### Get Statistics

Retrieve dashboard statistics for all tasks.

**Endpoint:** `GET /tasks/dashboard/stats`

**Response:** `200 OK`

```json
{
  "total": 25,
  "active": 18,
  "inactive": 5,
  "failed": 2
}
```

**Example cURL:**

```bash
curl -X GET http://localhost:3005/api/tasks/dashboard/stats \
  -H "X-API-Key: your-secret-api-key-here"
```

---

## Discord Notification Format

When a task executes, the backend automatically constructs and sends a Discord notification with the following format:

### Success Notification

```json
{
  "username": "Task Scheduler Bot",
  "embeds": [
    {
      "title": "✅ Task Completed",
      "description": "Task \"Daily Status Report\" has been executed successfully",
      "color": 3066993,
      "fields": [
        {
          "name": "Task ID",
          "value": "604cd8fd-628a-41c1-8d3a-b3588e1af653",
          "inline": true
        },
        {
          "name": "Task Name",
          "value": "Daily Status Report",
          "inline": true
        },
        {
          "name": "Execution Time",
          "value": "Oct 8, 2025, 9:00:00 AM",
          "inline": false
        }
      ],
      "timestamp": "2025-10-08T09:00:00.000Z"
    }
  ]
}
```

### Failed Notification

```json
{
  "username": "Task Scheduler Bot",
  "embeds": [
    {
      "title": "❌ Task Failed",
      "description": "Task \"Daily Status Report\" execution failed",
      "color": 15158332,
      "fields": [
        {
          "name": "Task ID",
          "value": "604cd8fd-628a-41c1-8d3a-b3588e1af653",
          "inline": true
        },
        {
          "name": "Task Name",
          "value": "Daily Status Report",
          "inline": true
        },
        {
          "name": "Execution Time",
          "value": "Oct 8, 2025, 9:00:00 AM",
          "inline": false
        },
        {
          "name": "Retry Count",
          "value": "3",
          "inline": true
        },
        {
          "name": "Details",
          "value": "Discord notification failed after maximum retry attempts",
          "inline": false
        }
      ],
      "timestamp": "2025-10-08T09:00:00.000Z"
    }
  ]
}
```

### Retrying Notification

```json
{
  "username": "Task Scheduler Bot",
  "embeds": [
    {
      "title": "⚠️ Task Retrying",
      "description": "Task \"Daily Status Report\" is being retried",
      "color": 16776960,
      "fields": [
        {
          "name": "Task ID",
          "value": "604cd8fd-628a-41c1-8d3a-b3588e1af653",
          "inline": true
        },
        {
          "name": "Task Name",
          "value": "Daily Status Report",
          "inline": true
        },
        {
          "name": "Execution Time",
          "value": "Oct 8, 2025, 9:00:00 AM",
          "inline": false
        },
        {
          "name": "Retry Count",
          "value": "1",
          "inline": true
        }
      ],
      "timestamp": "2025-10-08T09:00:00.000Z"
    }
  ]
}
```

**Embed Colors:**
- Success: `3066993` (Green - #2ECC71)
- Failed: `15158332` (Red - #E74C3C)
- Retrying: `16776960` (Yellow - #FFFF00)

---

## Error Responses

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": [
    "Invalid webhook URL format",
    "Invalid cron expression format"
  ],
  "error": "Bad Request"
}
```

### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "Task with ID 604cd8fd-628a-41c1-8d3a-b3588e1af653 not found",
  "error": "Not Found"
}
```

### 500 Internal Server Error

```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```

---

## Environment Configuration

### Required Environment Variables

```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/task_scheduler?schema=public"

# API Security
API_KEY=your-secret-api-key-here

# Application
PORT=3005
NODE_ENV=development
```

### Getting Discord Webhook URL

1. **Go to your Discord server** → Server Settings → Integrations → Webhooks
2. **Create or select a webhook**
3. **Copy the full webhook URL**: `https://discord.com/api/webhooks/1234567890123456789/abcdefGHIJKLMNOP123456`
4. **Use this full URL** when creating or updating tasks in the `webhookUrl` field

**Example:**
- Full URL: `https://discord.com/api/webhooks/1234567890123456789/abcdefGHIJKLMNOP123456`
- Store this complete URL in the task's `webhookUrl` field

---

## Task Execution Flow

1. **Task Creation**: User creates a task with full `webhookUrl` and cron `schedule`
2. **Scheduler Registration**: Task is registered in the scheduler with cron job
3. **Scheduled Execution**: At the scheduled time, the scheduler executes the task
4. **Notification Construction**: Backend builds a standardized Discord embed payload
5. **Webhook Request**: Sends POST request to the Discord webhook URL provided in the task
6. **Retry Logic**: If failed, retries with exponential backoff (up to `maxRetry` times)
7. **Logging**: All attempts are logged to the database
8. **Status Update**: If max retries exceeded, task status changes to `FAILED`

---

## Rate Limits

- **Discord Webhooks**: 30 requests per minute per webhook
- **API Endpoints**: No hard limits, but recommended to use pagination for large datasets

---

## Best Practices

1. **Cron Schedules**: Use standard cron format or predefined expressions (`@daily`, `@hourly`)
2. **Webhook URLs**: Store complete Discord webhook URLs per task for maximum flexibility
3. **Retry Strategy**: Set appropriate `maxRetry` values (3-5 recommended)
4. **Pagination**: Always use pagination for logs and task lists
5. **Error Handling**: Monitor failed tasks via dashboard and logs
6. **Security**: Keep your API key and Discord webhook URLs secure
7. **Testing**: Test cron expressions before deploying to production
8. **Webhook Management**: Each task can use a different Discord webhook for different channels/servers

---

## Architecture Overview

### Webhook URL Handling

- **Client provides**: Full Discord webhook URL in the `webhookUrl` field when creating/updating tasks
- **Backend validates**: Ensures the URL is a valid Discord webhook URL (discord.com or discordapp.com domain with /api/webhooks/ path)
- **Backend constructs**: All notification payloads with standardized Discord embed format
- **Execution**: Sends the constructed payload directly to the provided webhook URL

This architecture provides:
- ✅ Complete flexibility - use any Discord webhook for any task
- ✅ Multi-server support - tasks can send notifications to different Discord servers
- ✅ Standardized notifications - backend ensures consistent formatting
- ✅ Easy webhook updates - change webhook URL without reconfiguring environment
- ✅ No environment dependencies - webhook URLs stored with tasks, not in .env

---

## Support

For issues or questions:
- Check the logs: `GET /logs?status=FAILED`
- Verify webhook URLs are valid Discord webhook URLs
- Ensure webhook URLs have correct format: `https://discord.com/api/webhooks/{id}/{token}`
- Check cron expression syntax
- Review task status: `GET /tasks/dashboard/stats`
- Test webhook URLs directly using Discord's webhook documentation
