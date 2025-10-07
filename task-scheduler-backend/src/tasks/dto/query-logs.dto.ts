import { IsOptional, IsEnum, IsDateString, IsString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { LogStatus } from '@prisma/client';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class QueryLogsDto {
  @ApiPropertyOptional({
    description: 'Filter logs by task ID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsOptional()
  @IsString()
  taskId?: string;

  @ApiPropertyOptional({
    description: 'Filter logs by execution status',
    enum: LogStatus,
    example: LogStatus.SUCCESS,
  })
  @IsOptional()
  @IsEnum(LogStatus, { message: 'Invalid log status' })
  status?: LogStatus;

  @ApiPropertyOptional({
    description: 'Filter logs from this date (ISO 8601 format)',
    example: '2025-10-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Invalid date format for dateFrom' })
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter logs until this date (ISO 8601 format)',
    example: '2025-10-07T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Invalid date format for dateTo' })
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;
}

class LogEntryDto {
  @ApiProperty({ description: 'Log entry ID', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ description: 'Task ID', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  taskId: string;

  @ApiProperty({ description: 'Task name', example: 'Daily Status Report', required: false })
  taskName?: string;

  @ApiProperty({ description: 'Execution timestamp', example: '2025-10-07T09:00:00.000Z' })
  executionTime: Date;

  @ApiProperty({ description: 'Execution status', enum: LogStatus, example: LogStatus.SUCCESS })
  status: LogStatus;

  @ApiProperty({ description: 'Number of retry attempts', example: 0 })
  retryCount: number;

  @ApiProperty({ description: 'Execution message or error details', example: 'Webhook sent successfully', nullable: true })
  message: string | null;

  @ApiProperty({ description: 'Log creation timestamp', example: '2025-10-07T09:00:00.000Z' })
  createdAt: Date;
}

class PaginationMetaDto {
  @ApiProperty({ description: 'Total number of items', example: 100 })
  total: number;

  @ApiProperty({ description: 'Current page number', example: 1 })
  page: number;

  @ApiProperty({ description: 'Items per page', example: 20 })
  limit: number;

  @ApiProperty({ description: 'Total number of pages', example: 5 })
  totalPages: number;
}

export class PaginatedLogsResponseDto {
  @ApiProperty({ description: 'Array of log entries', type: [LogEntryDto] })
  data: LogEntryDto[];

  @ApiProperty({ description: 'Pagination metadata', type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
