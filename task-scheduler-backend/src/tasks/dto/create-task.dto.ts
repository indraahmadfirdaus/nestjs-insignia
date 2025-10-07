import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsObject } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  schedule: string;

  @IsString()
  @IsNotEmpty()
  webhookUrl: string;

  @IsObject()
  @IsNotEmpty()
  payload: Record<string, any>;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxRetry?: number;
}
