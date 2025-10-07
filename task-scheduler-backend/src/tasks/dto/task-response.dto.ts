import { TaskStatus } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class TaskResponseDto {
  @ApiProperty({ description: 'Unique task identifier', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ description: 'Task name', example: 'Daily Status Report' })
  name: string;

  @ApiProperty({ description: 'Cron expression for scheduling', example: '0 9 * * *' })
  schedule: string;

  @ApiProperty({ description: 'Discord webhook URL', example: 'https://discord.com/api/webhooks/123456789/abcdefghijklmnop' })
  webhookUrl: string;

  @ApiProperty({ description: 'Discord webhook payload', example: { content: 'Task executed' } })
  payload: Record<string, any>;

  @ApiProperty({ description: 'Maximum retry attempts', example: 3 })
  maxRetry: number;

  @ApiProperty({ description: 'Task status', enum: TaskStatus, example: TaskStatus.ACTIVE })
  status: TaskStatus;

  @ApiProperty({ description: 'Creation timestamp', example: '2025-10-07T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp', example: '2025-10-07T10:00:00.000Z' })
  updatedAt: Date;
}

class TaskLogDto {
  @ApiProperty({ description: 'Log entry ID', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ description: 'Execution timestamp', example: '2025-10-07T09:00:00.000Z' })
  executionTime: Date;

  @ApiProperty({ description: 'Execution status', example: 'SUCCESS' })
  status: string;

  @ApiProperty({ description: 'Number of retry attempts', example: 0 })
  retryCount: number;

  @ApiProperty({ description: 'Execution message or error details', example: 'Webhook sent successfully', nullable: true })
  message: string | null;

  @ApiProperty({ description: 'Log creation timestamp', example: '2025-10-07T09:00:00.000Z' })
  createdAt: Date;
}

export class TaskWithLogsResponseDto extends TaskResponseDto {
  @ApiProperty({ description: 'Task execution logs (last 50)', type: [TaskLogDto] })
  logs: TaskLogDto[];
}

class PaginationMetaDto {
  @ApiProperty({ description: 'Total number of items', example: 100 })
  total: number;

  @ApiProperty({ description: 'Current page number', example: 1 })
  page: number;

  @ApiProperty({ description: 'Items per page', example: 10 })
  limit: number;

  @ApiProperty({ description: 'Total number of pages', example: 10 })
  totalPages: number;
}

export class PaginatedTasksResponseDto {
  @ApiProperty({ description: 'Array of tasks', type: [TaskResponseDto] })
  data: TaskResponseDto[];

  @ApiProperty({ description: 'Pagination metadata', type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

export class DashboardStatsDto {
  @ApiProperty({ description: 'Total number of tasks', example: 10 })
  total: number;

  @ApiProperty({ description: 'Number of active tasks', example: 7 })
  active: number;

  @ApiProperty({ description: 'Number of inactive tasks', example: 2 })
  inactive: number;

  @ApiProperty({ description: 'Number of failed tasks', example: 1 })
  failed: number;
}
