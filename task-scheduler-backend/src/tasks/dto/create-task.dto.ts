import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsObject,
  IsUrl,
  Matches,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum TaskStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  FAILED = 'FAILED',
}

export class CreateTaskDto {
  @ApiProperty({
    description: 'Name of the task',
    example: 'Daily Status Report',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'Task name must not exceed 100 characters' })
  name: string;

  @ApiProperty({
    description: 'Cron expression for task scheduling. Supports standard cron format or predefined expressions',
    example: '0 9 * * *',
    examples: {
      'Every day at 9 AM': { value: '0 9 * * *' },
      'Every hour': { value: '0 * * * *' },
      'Daily at midnight': { value: '@daily' },
      'Every Monday at 8 AM': { value: '0 8 * * 1' },
    },
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^((\*|[0-9,\-\/*]+)\s+){4}(\*|[0-9,\-\/*]+)(\s+(\*|[0-9,\-\/*]+))?$|^@(yearly|annually|monthly|weekly|daily|hourly|reboot)$/, {
    message: 'Invalid cron expression format. Use standard cron format (e.g., "0 9 * * *") or predefined (@daily, @hourly, etc.)',
  })
  schedule: string;

  @ApiProperty({
    description: 'Discord webhook URL where the notification will be sent',
    example: 'https://discord.com/api/webhooks/1234567890123456789/abcdefghijklmnop',
  })
  @IsUrl({}, { message: 'Invalid webhook URL format' })
  @IsNotEmpty()
  webhookUrl: string;

  @ApiPropertyOptional({
    description: 'Maximum number of retry attempts if webhook fails',
    example: 3,
    minimum: 0,
    maximum: 10,
    default: 3,
  })
  @IsInt()
  @Min(0, { message: 'Max retry must be at least 0' })
  @Max(10, { message: 'Max retry cannot exceed 10' })
  @IsOptional()
  maxRetry?: number;

  @ApiPropertyOptional({
    description: 'Initial status of the task',
    enum: TaskStatus,
    example: TaskStatus.ACTIVE,
    default: TaskStatus.ACTIVE,
  })
  @IsEnum(TaskStatus, { message: 'Invalid task status' })
  @IsOptional()
  status?: TaskStatus;
}
