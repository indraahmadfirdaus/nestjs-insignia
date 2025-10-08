import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { QueryLogsDto } from './dto/query-logs.dto';
import { TaskStatus, LogStatus } from '@prisma/client';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(private prisma: PrismaService) {}

  async create(createTaskDto: CreateTaskDto) {
    try {
      const task = await this.prisma.task.create({
        data: {
          name: createTaskDto.name,
          schedule: createTaskDto.schedule,
          webhookUrl: createTaskDto.webhookUrl,
          maxRetry: createTaskDto.maxRetry || 3,
          status: (createTaskDto.status as TaskStatus) || TaskStatus.ACTIVE,
        },
      });

      this.logger.log(`Task created: ${task.id} - ${task.name}`);
      return task;
    } catch (error) {
      this.logger.error(`Failed to create task: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAll(page = 1, limit = 10, status?: TaskStatus) {
    try {
      const skip = (page - 1) * limit;
      const where = status ? { status } : {};

      const [tasks, total] = await Promise.all([
        this.prisma.task.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.task.count({ where }),
      ]);

      return {
        data: tasks,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to fetch tasks: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: string) {
    try {
      const task = await this.prisma.task.findUnique({
        where: { id },
        include: {
          logs: {
            orderBy: { executionTime: 'desc' },
            take: 50, // Limit logs to last 50 executions
          },
        },
      });

      if (!task) {
        throw new NotFoundException(`Task with ID ${id} not found`);
      }

      return task;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to fetch task ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(id: string, updateTaskDto: UpdateTaskDto) {
    try {
      // Check if task exists
      await this.findOne(id);

      const task = await this.prisma.task.update({
        where: { id },
        data: {
          ...(updateTaskDto.name && { name: updateTaskDto.name }),
          ...(updateTaskDto.schedule && { schedule: updateTaskDto.schedule }),
          ...(updateTaskDto.webhookUrl && { webhookUrl: updateTaskDto.webhookUrl }),
          ...(updateTaskDto.maxRetry !== undefined && { maxRetry: updateTaskDto.maxRetry }),
          ...(updateTaskDto.status && { status: updateTaskDto.status as TaskStatus }),
        },
      });

      this.logger.log(`Task updated: ${task.id} - ${task.name}`);
      return task;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update task ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async remove(id: string) {
    try {
      // Check if task exists
      await this.findOne(id);

      await this.prisma.task.delete({
        where: { id },
      });

      this.logger.log(`Task deleted: ${id}`);
      return { message: 'Task deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to delete task ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getActiveTasksForScheduler() {
    try {
      return await this.prisma.task.findMany({
        where: { status: TaskStatus.ACTIVE },
        orderBy: { createdAt: 'asc' },
      });
    } catch (error) {
      this.logger.error(`Failed to fetch active tasks: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateTaskStatus(id: string, status: TaskStatus) {
    try {
      // Check if task exists
      await this.findOne(id);

      const task = await this.prisma.task.update({
        where: { id },
        data: { status },
      });

      this.logger.log(`Task status updated: ${id} - ${status}`);
      return task;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to update task status ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async toggleTaskStatus(id: string) {
    try {
      const task = await this.findOne(id);

      const newStatus =
        task.status === TaskStatus.ACTIVE
          ? TaskStatus.INACTIVE
          : TaskStatus.ACTIVE;

      return await this.updateTaskStatus(id, newStatus);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to toggle task status ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getDashboardStats() {
    try {
      const [total, active, inactive, failed] = await Promise.all([
        this.prisma.task.count(),
        this.prisma.task.count({ where: { status: TaskStatus.ACTIVE } }),
        this.prisma.task.count({ where: { status: TaskStatus.INACTIVE } }),
        this.prisma.task.count({ where: { status: TaskStatus.FAILED } }),
      ]);

      return { total, active, inactive, failed };
    } catch (error) {
      this.logger.error(`Failed to fetch dashboard stats: ${error.message}`, error.stack);
      throw error;
    }
  }


  async findLogsByTaskId(
    taskId: string,
    page = 1,
    limit = 20,
    status?: LogStatus,
  ) {
    try {
      // Verify task exists
      await this.findOne(taskId);

      const skip = (page - 1) * limit;
      const where: any = { taskId };

      if (status) {
        where.status = status;
      }

      const [logs, total] = await Promise.all([
        this.prisma.taskLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { executionTime: 'desc' },
          include: {
            task: {
              select: {
                name: true,
              },
            },
          },
        }),
        this.prisma.taskLog.count({ where }),
      ]);

      return {
        data: logs.map((log) => ({
          id: log.id,
          taskId: log.taskId,
          taskName: log.task.name,
          executionTime: log.executionTime,
          status: log.status,
          retryCount: log.retryCount,
          message: log.message,
          createdAt: log.createdAt,
        })),
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to fetch logs for task ${taskId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findAllLogs(queryLogsDto: QueryLogsDto, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      const where: any = {};

      // Apply filters
      if (queryLogsDto.taskId) {
        where.taskId = queryLogsDto.taskId;
      }

      if (queryLogsDto.status) {
        where.status = queryLogsDto.status;
      }

      if (queryLogsDto.dateFrom || queryLogsDto.dateTo) {
        where.executionTime = {};

        if (queryLogsDto.dateFrom) {
          where.executionTime.gte = new Date(queryLogsDto.dateFrom);
        }

        if (queryLogsDto.dateTo) {
          where.executionTime.lte = new Date(queryLogsDto.dateTo);
        }
      }

      const [logs, total] = await Promise.all([
        this.prisma.taskLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { executionTime: 'desc' },
          include: {
            task: {
              select: {
                name: true,
              },
            },
          },
        }),
        this.prisma.taskLog.count({ where }),
      ]);

      return {
        data: logs.map((log) => ({
          id: log.id,
          taskId: log.taskId,
          taskName: log.task.name,
          executionTime: log.executionTime,
          status: log.status,
          retryCount: log.retryCount,
          message: log.message,
          createdAt: log.createdAt,
        })),
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to fetch logs: ${error.message}`, error.stack);
      throw error;
    }
  }
}
