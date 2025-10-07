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

enum TaskStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  FAILED = 'FAILED',
}

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'Task name must not exceed 100 characters' })
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^((\*|[0-9,\-\/*]+)\s+){4}(\*|[0-9,\-\/*]+)(\s+(\*|[0-9,\-\/*]+))?$|^@(yearly|annually|monthly|weekly|daily|hourly|reboot)$/, {
    message: 'Invalid cron expression format. Use standard cron format (e.g., "0 9 * * *") or predefined (@daily, @hourly, etc.)',
  })
  schedule: string;

  @IsUrl({}, { message: 'Invalid webhook URL format' })
  @IsNotEmpty()
  webhookUrl: string;

  @IsObject()
  @IsNotEmpty()
  payload: Record<string, any>;

  @IsInt()
  @Min(0, { message: 'Max retry must be at least 0' })
  @Max(10, { message: 'Max retry cannot exceed 10' })
  @IsOptional()
  maxRetry?: number;

  @IsEnum(TaskStatus, { message: 'Invalid task status' })
  @IsOptional()
  status?: TaskStatus;
}
