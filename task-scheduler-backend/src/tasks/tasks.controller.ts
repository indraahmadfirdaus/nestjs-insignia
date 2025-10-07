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
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskStatus } from '@prisma/client';

@Controller('tasks')
export class TasksController {
  private readonly logger = new Logger(TasksController.name);

  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createTaskDto: CreateTaskDto) {
    this.logger.log(`Creating task: ${createTaskDto.name}`);
    return await this.tasksService.create(createTaskDto);
  }

  @Get()
  async findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
    @Query('status') status?: TaskStatus,
  ) {
    this.logger.log(`Fetching tasks - Page: ${page}, Limit: ${limit}, Status: ${status || 'all'}`);
    return await this.tasksService.findAll(page, limit, status);
  }

  @Get('dashboard/stats')
  async getDashboardStats() {
    this.logger.log('Fetching dashboard statistics');
    return await this.tasksService.getDashboardStats();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    this.logger.log(`Fetching task: ${id}`);
    return await this.tasksService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
    this.logger.log(`Updating task: ${id}`);
    return await this.tasksService.update(id, updateTaskDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    this.logger.log(`Deleting task: ${id}`);
    return await this.tasksService.remove(id);
  }

  @Post(':id/toggle')
  @HttpCode(HttpStatus.OK)
  async toggleStatus(@Param('id') id: string) {
    this.logger.log(`Toggling task status: ${id}`);
    return await this.tasksService.toggleTaskStatus(id);
  }
}
