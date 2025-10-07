import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { QueryLogsDto } from './dto/query-logs.dto';
import { LogStatus } from '@prisma/client';

@Controller('logs')
export class LogsController {
  private readonly logger = new Logger(LogsController.name);

  constructor(private readonly tasksService: TasksService) {}

  @Get()
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

@Controller('tasks/:taskId/logs')
export class TaskLogsController {
  private readonly logger = new Logger(TaskLogsController.name);

  constructor(private readonly tasksService: TasksService) {}

  @Get()
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
