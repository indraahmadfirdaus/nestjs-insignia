import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { TasksService } from '../tasks/tasks.service';
import { DiscordService } from '../discord/discord.service';
import { PrismaService } from '../prisma/prisma.service';
import { TaskStatus, LogStatus } from '@prisma/client';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private schedulerRegistry: SchedulerRegistry,
    private tasksService: TasksService,
    private discordService: DiscordService,
    private prisma: PrismaService,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing scheduler service...');
    await this.loadActiveTasks();
  }

  /**
   * Load all active tasks and register their cron jobs
   */
  async loadActiveTasks() {
    try {
      const tasks = await this.tasksService.getActiveTasksForScheduler();
      this.logger.log(`Loading ${tasks.length} active tasks...`);

      for (const task of tasks) {
        await this.addCronJob(task.id, task.name, task.schedule, task.webhookUrl, task.maxRetry);
      }

      this.logger.log(`Successfully loaded ${tasks.length} tasks`);
    } catch (error) {
      this.logger.error(`Failed to load active tasks: ${error.message}`, error.stack);
    }
  }

  /**
   * Add a new cron job for a task
   */
  async addCronJob(
    taskId: string,
    taskName: string,
    schedule: string,
    webhookUrl: string,
    maxRetry: number,
  ) {
    try {
      // Remove existing job if it exists
      if (this.schedulerRegistry.doesExist('cron', taskId)) {
        this.schedulerRegistry.deleteCronJob(taskId);
        this.logger.log(`Removed existing cron job for task: ${taskId}`);
      }

      // Create new cron job
      const job = new CronJob(schedule, async () => {
        await this.executeTask(taskId, taskName, webhookUrl, maxRetry);
      });

      this.schedulerRegistry.addCronJob(taskId, job);
      job.start();

      this.logger.log(
        `Added cron job for task: ${taskId} (${taskName}) with schedule: ${schedule}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to add cron job for task ${taskId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Remove a cron job for a task
   */
  removeCronJob(taskId: string) {
    try {
      if (this.schedulerRegistry.doesExist('cron', taskId)) {
        this.schedulerRegistry.deleteCronJob(taskId);
        this.logger.log(`Removed cron job for task: ${taskId}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to remove cron job for task ${taskId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Update a cron job for a task
   */
  async updateCronJob(
    taskId: string,
    taskName: string,
    schedule: string,
    webhookUrl: string,
    maxRetry: number,
  ) {
    this.removeCronJob(taskId);
    await this.addCronJob(taskId, taskName, schedule, webhookUrl, maxRetry);
  }

  /**
   * Execute a task and send Discord notification
   */
  private async executeTask(
    taskId: string,
    taskName: string,
    webhookUrl: string,
    maxRetry: number,
  ) {
    // Check if task is still active before executing
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { status: true },
    });

    if (!task || task.status !== TaskStatus.ACTIVE) {
      this.logger.warn(
        `Skipping execution for task ${taskId} - Task is ${task?.status || 'not found'}`,
      );
      return;
    }

    this.logger.log(`Executing task: ${taskId} (${taskName})`);

    let retryCount = 0;
    let success = false;
    let errorMessage: string | undefined;

    // Attempt to send notification with retries
    while (retryCount <= maxRetry && !success) {
      try {
        const status = retryCount === 0 ? 'success' : 'retrying';

        // Send task notification to Discord
        success = await this.discordService.sendTaskNotification(
          webhookUrl,
          taskId,
          taskName,
          status,
          retryCount,
          errorMessage,
        );

        if (success) {
          // Log success
          await this.createTaskLog(
            taskId,
            LogStatus.SUCCESS,
            retryCount,
            'Task executed successfully',
          );

          this.logger.log(
            `Task ${taskId} executed successfully${retryCount > 0 ? ` after ${retryCount} retries` : ''}`,
          );
          break;
        } else {
          errorMessage = 'Discord notification failed';
          retryCount++;

          if (retryCount <= maxRetry) {
            // Log retry attempt
            await this.createTaskLog(
              taskId,
              LogStatus.RETRYING,
              retryCount,
              `Retrying task execution (attempt ${retryCount}/${maxRetry})`,
            );

            this.logger.warn(
              `Task ${taskId} failed, retrying... (${retryCount}/${maxRetry})`,
            );
          }
        }
      } catch (error) {
        errorMessage = error.message || 'Unknown error occurred';
        retryCount++;

        this.logger.error(
          `Task ${taskId} execution error (retry ${retryCount}/${maxRetry}): ${errorMessage}`,
          error.stack,
        );

        if (retryCount <= maxRetry) {
          // Log retry attempt
          await this.createTaskLog(
            taskId,
            LogStatus.RETRYING,
            retryCount,
            `Error: ${errorMessage}. Retrying... (${retryCount}/${maxRetry})`,
          );
        }
      }
    }

    // If still not successful after all retries
    if (!success) {
      await this.handleTaskFailure(taskId, taskName, webhookUrl, retryCount, errorMessage);
    }
  }

  /**
   * Handle task failure after max retries
   */
  private async handleTaskFailure(
    taskId: string,
    taskName: string,
    webhookUrl: string,
    retryCount: number,
    errorMessage?: string,
  ) {
    this.logger.error(
      `Task ${taskId} failed after ${retryCount} attempts. Marking as FAILED.`,
    );

    // Log failure
    await this.createTaskLog(
      taskId,
      LogStatus.FAILED,
      retryCount,
      errorMessage || 'Task failed after maximum retry attempts',
    );

    // Send final failure notification
    try {
      await this.discordService.sendTaskNotification(
        webhookUrl,
        taskId,
        taskName,
        'failed',
        retryCount,
        errorMessage,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send failure notification for task ${taskId}: ${error.message}`,
      );
    }

    // Update task status to FAILED
    try {
      await this.tasksService.updateTaskStatus(taskId, TaskStatus.FAILED);
      this.removeCronJob(taskId);
      this.logger.log(`Task ${taskId} status updated to FAILED and removed from scheduler`);
    } catch (error) {
      this.logger.error(
        `Failed to update task status for ${taskId}: ${error.message}`,
      );
    }
  }

  /**
   * Create a task log entry
   */
  private async createTaskLog(
    taskId: string,
    status: LogStatus,
    retryCount: number,
    message: string,
  ) {
    try {
      await this.prisma.taskLog.create({
        data: {
          taskId,
          status,
          retryCount,
          message,
          executionTime: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to create task log for ${taskId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Get all active cron jobs
   */
  getCronJobs(): string[] {
    const jobs = this.schedulerRegistry.getCronJobs();
    return Array.from(jobs.keys());
  }

  /**
   * Check if a cron job exists
   */
  hasCronJob(taskId: string): boolean {
    return this.schedulerRegistry.doesExist('cron', taskId);
  }
}
