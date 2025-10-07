import { IsOptional, IsEnum, IsDateString, IsString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { LogStatus } from '@prisma/client';

export class QueryLogsDto {
  @IsOptional()
  @IsString()
  taskId?: string;

  @IsOptional()
  @IsEnum(LogStatus, { message: 'Invalid log status' })
  status?: LogStatus;

  @IsOptional()
  @IsDateString({}, { message: 'Invalid date format for dateFrom' })
  dateFrom?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Invalid date format for dateTo' })
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;
}

export class PaginatedLogsResponseDto {
  data: Array<{
    id: string;
    taskId: string;
    taskName?: string;
    executionTime: Date;
    status: LogStatus;
    retryCount: number;
    message: string | null;
    createdAt: Date;
  }>;
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
