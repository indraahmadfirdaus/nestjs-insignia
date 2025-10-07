import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { QueryLogsDto, PaginatedLogsResponseDto } from './dto/query-logs.dto';
import { LogStatus } from '@prisma/client';

@ApiTags('logs')
@ApiSecurity('api-key')
@Controller('logs')
export class LogsController {
  private readonly logger = new Logger(LogsController.name);

  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all execution logs',
    description: 'Retrieves paginated task execution logs with optional filtering by task ID, status, and date range'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)', example: 20 })
  @ApiQuery({ name: 'taskId', required: false, type: String, description: 'Filter by task ID' })
  @ApiQuery({ name: 'status', required: false, enum: LogStatus, description: 'Filter by execution status' })
  @ApiQuery({ name: 'dateFrom', required: false, type: String, description: 'Filter logs from this date (ISO 8601)', example: '2025-10-01T00:00:00.000Z' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, description: 'Filter logs until this date (ISO 8601)', example: '2025-10-07T23:59:59.999Z' })
  @ApiResponse({ status: 200, description: 'Logs retrieved successfully', type: PaginatedLogsResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing API key' })
  async findAllLogs(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
    @Query() queryLogsDto: QueryLogsDto,
  ) {
    this.logger.log(
      `Fetching all logs - Page: ${page}, Limit: ${limit}, Filters: ${JSON.stringify(queryLogsDto)}`,
    );
    return await this.tasksService.findAllLogs(queryLogsDto, page, limit);
  }
}

@ApiTags('logs')
@ApiSecurity('api-key')
@Controller('tasks/:taskId/logs')
export class TaskLogsController {
  private readonly logger = new Logger(TaskLogsController.name);

  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({
    summary: 'Get logs for specific task',
    description: 'Retrieves paginated execution logs for a specific task with optional status filtering'
  })
  @ApiParam({ name: 'taskId', description: 'Task UUID', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)', example: 20 })
  @ApiQuery({ name: 'status', required: false, enum: LogStatus, description: 'Filter by execution status' })
  @ApiResponse({ status: 200, description: 'Logs retrieved successfully', type: PaginatedLogsResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing API key' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async findLogsByTask(
    @Param('taskId') taskId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
    @Query('status') status?: LogStatus,
  ) {
    this.logger.log(
      `Fetching logs for task ${taskId} - Page: ${page}, Limit: ${limit}, Status: ${status || 'all'}`,
    );
    return await this.tasksService.findLogsByTaskId(taskId, page, limit, status);
  }
}
