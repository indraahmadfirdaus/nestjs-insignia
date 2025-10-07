import { TaskStatus } from '@prisma/client';

export class TaskResponseDto {
  id: string;
  name: string;
  schedule: string;
  webhookUrl: string;
  payload: Record<string, any>;
  maxRetry: number;
  status: TaskStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class TaskWithLogsResponseDto extends TaskResponseDto {
  logs: {
    id: string;
    executionTime: Date;
    status: string;
    retryCount: number;
    message: string | null;
    createdAt: Date;
  }[];
}

export class PaginatedTasksResponseDto {
  data: TaskResponseDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class DashboardStatsDto {
  total: number;
  active: number;
  inactive: number;
  failed: number;
}
