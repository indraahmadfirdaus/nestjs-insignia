import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
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
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import {
  TaskResponseDto,
  TaskWithLogsResponseDto,
  PaginatedTasksResponseDto,
  DashboardStatsDto,
} from './dto/task-response.dto';
import { TaskStatus } from '@prisma/client';

@ApiTags('tasks')
@ApiSecurity('api-key')
@Controller('tasks')
export class TasksController {
  private readonly logger = new Logger(TasksController.name);

  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new task', description: 'Creates a new scheduled task with Discord webhook configuration' })
  @ApiResponse({ status: 201, description: 'Task created successfully', type: TaskResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing API key' })
  async create(@Body() createTaskDto: CreateTaskDto) {
    this.logger.log(`Creating task: ${createTaskDto.name}`);
    return await this.tasksService.create(createTaskDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tasks', description: 'Retrieves a paginated list of all tasks with optional status filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)', example: 10 })
  @ApiQuery({ name: 'status', required: false, enum: TaskStatus, description: 'Filter by task status' })
  @ApiResponse({ status: 200, description: 'Tasks retrieved successfully', type: PaginatedTasksResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing API key' })
  async findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
    @Query('status') status?: TaskStatus,
  ) {
    this.logger.log(`Fetching tasks - Page: ${page}, Limit: ${limit}, Status: ${status || 'all'}`);
    return await this.tasksService.findAll(page, limit, status);
  }

  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Get dashboard statistics', description: 'Retrieves summary statistics of all tasks' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully', type: DashboardStatsDto })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing API key' })
  async getDashboardStats() {
    this.logger.log('Fetching dashboard statistics');
    return await this.tasksService.getDashboardStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID', description: 'Retrieves a specific task with its execution logs (last 50 executions)' })
  @ApiParam({ name: 'id', description: 'Task UUID', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiResponse({ status: 200, description: 'Task retrieved successfully', type: TaskWithLogsResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing API key' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async findOne(@Param('id') id: string) {
    this.logger.log(`Fetching task: ${id}`);
    return await this.tasksService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task', description: 'Updates an existing task. All fields are optional.' })
  @ApiParam({ name: 'id', description: 'Task UUID', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiResponse({ status: 200, description: 'Task updated successfully', type: TaskResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing API key' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
    this.logger.log(`Updating task: ${id}`);
    return await this.tasksService.update(id, updateTaskDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete task', description: 'Permanently deletes a task and all its execution logs' })
  @ApiParam({ name: 'id', description: 'Task UUID', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiResponse({ status: 200, description: 'Task deleted successfully', schema: { example: { message: 'Task deleted successfully' } } })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing API key' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async remove(@Param('id') id: string) {
    this.logger.log(`Deleting task: ${id}`);
    return await this.tasksService.remove(id);
  }

  @Post(':id/toggle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle task status', description: 'Toggles task status between ACTIVE and INACTIVE' })
  @ApiParam({ name: 'id', description: 'Task UUID', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiResponse({ status: 200, description: 'Task status toggled successfully', type: TaskResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing API key' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async toggleStatus(@Param('id') id: string) {
    this.logger.log(`Toggling task status: ${id}`);
    return await this.tasksService.toggleTaskStatus(id);
  }
}
