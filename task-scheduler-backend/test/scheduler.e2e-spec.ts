import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { SchedulerService } from '../src/scheduler/scheduler.service';
import { DiscordService } from '../src/discord/discord.service';
import { TaskStatus, LogStatus } from '@prisma/client';
import { createMockPrisma } from './utils/mock-prisma';

describe('Scheduler Service Integration (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let schedulerService: SchedulerService;
  let discordService: DiscordService;

  beforeAll(async () => {
    const mockPrisma = createMockPrisma();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    schedulerService = app.get<SchedulerService>(SchedulerService);
    discordService = app.get<DiscordService>(DiscordService);

    // Clean in-memory store
    await prisma.taskLog.deleteMany();
    await prisma.task.deleteMany();
  });

  afterAll(async () => {
    await prisma.taskLog.deleteMany();
    await prisma.task.deleteMany();
    await prisma.$disconnect();
    await app.close();
  });

  describe('Task Registration', () => {
    it('should load active tasks on initialization', async () => {
      // Create active tasks
      const task1 = await prisma.task.create({
        data: {
          name: 'Active Task 1',
          schedule: '0 9 * * *',
          webhookUrl: 'https://discord.com/api/webhooks/1234567890123456789/abcdefghijklmnopqrstuvwxyz123456',
          status: TaskStatus.ACTIVE,
        },
      });

      const task2 = await prisma.task.create({
        data: {
          name: 'Active Task 2',
          schedule: '0 10 * * *',
          webhookUrl: 'https://discord.com/api/webhooks/9876543210987654321/abcdefghijklmnopqrstuvwxyz123456',
          status: TaskStatus.ACTIVE,
        },
      });

      // Create inactive task (should not be loaded)
      await prisma.task.create({
        data: {
          name: 'Inactive Task',
          schedule: '0 11 * * *',
          webhookUrl: 'https://discord.com/api/webhooks/1111111111111111111/abcdefghijklmnopqrstuvwxyz123456',
          status: TaskStatus.INACTIVE,
        },
      });

      // Reload tasks
      await schedulerService.loadActiveTasks();

      // Check if cron jobs exist
      const cronJobs = schedulerService.getCronJobs();
      expect(cronJobs).toContain(task1.id);
      expect(cronJobs).toContain(task2.id);
      expect(cronJobs.length).toBe(2);
    });

    it('should add cron job for new task', async () => {
      const task = await prisma.task.create({
        data: {
          name: 'New Task',
          schedule: '0 12 * * *',
          webhookUrl: 'https://discord.com/api/webhooks/2222222222222222222/abcdefghijklmnopqrstuvwxyz123456',
          status: TaskStatus.ACTIVE,
        },
      });

      await schedulerService.addCronJob(
        task.id,
        task.name,
        task.schedule,
        task.webhookUrl,
        task.maxRetry,
      );

      expect(schedulerService.hasCronJob(task.id)).toBe(true);
    });

    it('should remove cron job when task is deleted', async () => {
      const task = await prisma.task.create({
        data: {
          name: 'Task to Remove',
          schedule: '0 13 * * *',
          webhookUrl: 'https://discord.com/api/webhooks/3333333333333333333/abcdefghijklmnopqrstuvwxyz123456',
          status: TaskStatus.ACTIVE,
        },
      });

      await schedulerService.addCronJob(
        task.id,
        task.name,
        task.schedule,
        task.webhookUrl,
        task.maxRetry,
      );

      expect(schedulerService.hasCronJob(task.id)).toBe(true);

      schedulerService.removeCronJob(task.id);

      expect(schedulerService.hasCronJob(task.id)).toBe(false);
    });

    it('should update cron job when task schedule changes', async () => {
      const task = await prisma.task.create({
        data: {
          name: 'Task to Update',
          schedule: '0 14 * * *',
          webhookUrl: 'https://discord.com/api/webhooks/4444444444444444444/abcdefghijklmnopqrstuvwxyz123456',
          status: TaskStatus.ACTIVE,
        },
      });

      await schedulerService.addCronJob(
        task.id,
        task.name,
        task.schedule,
        task.webhookUrl,
        task.maxRetry,
      );

      const newSchedule = '0 15 * * *';
      await schedulerService.updateCronJob(
        task.id,
        task.name,
        newSchedule,
        task.webhookUrl,
        task.maxRetry,
      );

      expect(schedulerService.hasCronJob(task.id)).toBe(true);
    });
  });

  describe('Task Execution with Mocked Discord', () => {
    let testTask: any;

    beforeEach(async () => {
      // Create a test task
      testTask = await prisma.task.create({
        data: {
          name: 'Test Execution Task',
          schedule: '* * * * *', // every minute (won't actually run in test)
          webhookUrl: 'https://discord.com/api/webhooks/5555555555555555555/abcdefghijklmnopqrstuvwxyz123456',
          maxRetry: 2,
          status: TaskStatus.ACTIVE,
        },
      });
    });

    afterEach(async () => {
      if (testTask) {
        schedulerService.removeCronJob(testTask.id);
      }
    });

    it('should create log on successful execution', async () => {
      // Mock Discord service to return success
      jest
        .spyOn(discordService, 'sendTaskNotification')
        .mockResolvedValue(true);

      await schedulerService.addCronJob(
        testTask.id,
        testTask.name,
        testTask.schedule,
        testTask.webhookUrl,
        testTask.maxRetry,
      );

      // Manually trigger execution (simulate cron trigger)
      await schedulerService['executeTask'](
        testTask.id,
        testTask.name,
        testTask.webhookUrl,
        testTask.maxRetry,
      );

      // Check if log was created
      const logs = await prisma.taskLog.findMany({
        where: { taskId: testTask.id },
      });

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].status).toBe(LogStatus.SUCCESS);
      expect(logs[0].retryCount).toBe(0);
    });

    it('should retry on failure and create retry logs', async () => {
      // Mock Discord service to fail
      jest
        .spyOn(discordService, 'sendTaskNotification')
        .mockResolvedValue(false);

      await schedulerService.addCronJob(
        testTask.id,
        testTask.name,
        testTask.schedule,
        testTask.webhookUrl,
        testTask.maxRetry,
      );

      // Manually trigger execution
      await schedulerService['executeTask'](
        testTask.id,
        testTask.name,
        testTask.webhookUrl,
        testTask.maxRetry,
      );

      // Check logs
      const logs = await prisma.taskLog.findMany({
        where: { taskId: testTask.id },
        orderBy: { executionTime: 'asc' },
      });

      // Should have retry logs
      expect(logs.length).toBeGreaterThan(1);
      expect(logs.some((log) => log.status === LogStatus.RETRYING)).toBe(true);
      expect(logs[logs.length - 1].status).toBe(LogStatus.FAILED);
    });

    it('should mark task as FAILED after max retries', async () => {
      // Mock Discord service to always fail
      jest
        .spyOn(discordService, 'sendTaskNotification')
        .mockResolvedValue(false);

      await schedulerService.addCronJob(
        testTask.id,
        testTask.name,
        testTask.schedule,
        testTask.webhookUrl,
        testTask.maxRetry,
      );

      // Manually trigger execution
      await schedulerService['executeTask'](
        testTask.id,
        testTask.name,
        testTask.webhookUrl,
        testTask.maxRetry,
      );

      // Check task status
      const updatedTask = await prisma.task.findUnique({
        where: { id: testTask.id },
      });

      expect(updatedTask?.status).toBe(TaskStatus.FAILED);

      // Check that cron job was removed
      expect(schedulerService.hasCronJob(testTask.id)).toBe(false);
    });

    it('should succeed after retries if Discord eventually succeeds', async () => {
      let callCount = 0;

      // Mock Discord service to fail first, then succeed
      jest
        .spyOn(discordService, 'sendTaskNotification')
        .mockImplementation(async () => {
          callCount++;
          return callCount > 1; // Fail first call, succeed on retry
        });

      await schedulerService.addCronJob(
        testTask.id,
        testTask.name,
        testTask.schedule,
        testTask.webhookUrl,
        testTask.maxRetry,
      );

      // Manually trigger execution
      await schedulerService['executeTask'](
        testTask.id,
        testTask.name,
        testTask.webhookUrl,
        testTask.maxRetry,
      );

      // Check logs
      const logs = await prisma.taskLog.findMany({
        where: { taskId: testTask.id },
        orderBy: { executionTime: 'desc' },
      });

      // Should have success log
      expect(logs[0].status).toBe(LogStatus.SUCCESS);
      expect(logs[0].retryCount).toBeGreaterThan(0);

      // Task should still be ACTIVE
      const updatedTask = await prisma.task.findUnique({
        where: { id: testTask.id },
      });
      expect(updatedTask?.status).toBe(TaskStatus.ACTIVE);
    });
  });

  describe('Cron Job Management', () => {
    it('should get all active cron jobs', async () => {
      // Create and register tasks
      const task1 = await prisma.task.create({
        data: {
          name: 'Cron Task 1',
          schedule: '0 16 * * *',
          webhookUrl: 'https://discord.com/api/webhooks/6666666666666666666/abcdefghijklmnopqrstuvwxyz123456',
          status: TaskStatus.ACTIVE,
        },
      });

      const task2 = await prisma.task.create({
        data: {
          name: 'Cron Task 2',
          schedule: '0 17 * * *',
          webhookUrl: 'https://discord.com/api/webhooks/7777777777777777777/abcdefghijklmnopqrstuvwxyz123456',
          status: TaskStatus.ACTIVE,
        },
      });

      await schedulerService.addCronJob(
        task1.id,
        task1.name,
        task1.schedule,
        task1.webhookUrl,
        task1.maxRetry,
      );

      await schedulerService.addCronJob(
        task2.id,
        task2.name,
        task2.schedule,
        task2.webhookUrl,
        task2.maxRetry,
      );

      const cronJobs = schedulerService.getCronJobs();

      expect(cronJobs).toContain(task1.id);
      expect(cronJobs).toContain(task2.id);
    });

    it('should check if specific cron job exists', async () => {
      const task = await prisma.task.create({
        data: {
          name: 'Check Cron Task',
          schedule: '0 18 * * *',
          webhookUrl: 'https://discord.com/api/webhooks/8888888888888888888/abcdefghijklmnopqrstuvwxyz123456',
          status: TaskStatus.ACTIVE,
        },
      });

      expect(schedulerService.hasCronJob(task.id)).toBe(false);

      await schedulerService.addCronJob(
        task.id,
        task.name,
        task.schedule,
        task.webhookUrl,
        task.maxRetry,
      );

      expect(schedulerService.hasCronJob(task.id)).toBe(true);
    });

    it('should handle duplicate job registration', async () => {
      const task = await prisma.task.create({
        data: {
          name: 'Duplicate Task',
          schedule: '0 19 * * *',
          webhookUrl: 'https://discord.com/api/webhooks/9999999999999999999/abcdefghijklmnopqrstuvwxyz123456',
          status: TaskStatus.ACTIVE,
        },
      });

      await schedulerService.addCronJob(
        task.id,
        task.name,
        task.schedule,
        task.webhookUrl,
        task.maxRetry,
      );

      // Try adding again (should replace)
      await schedulerService.addCronJob(
        task.id,
        task.name,
        task.schedule,
        task.webhookUrl,
        task.maxRetry,
      );

      const cronJobs = schedulerService.getCronJobs();
      const taskJobCount = cronJobs.filter((id) => id === task.id).length;

      expect(taskJobCount).toBe(1); // Should only have one job
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid cron expression gracefully', async () => {
      const task = await prisma.task.create({
        data: {
          name: 'Invalid Cron Task',
          schedule: 'invalid-cron',
          webhookUrl: 'https://discord.com/api/webhooks/1010101010101010101/abcdefghijklmnopqrstuvwxyz123456',
          status: TaskStatus.ACTIVE,
        },
      });

      await expect(
        schedulerService.addCronJob(
          task.id,
          task.name,
          task.schedule,
          task.webhookUrl,
          task.maxRetry,
        ),
      ).rejects.toThrow();
    });

    it('should handle task execution errors', async () => {
      // Mock Discord service to throw error
      jest
        .spyOn(discordService, 'sendTaskNotification')
        .mockRejectedValue(new Error('Network error'));

      const task = await prisma.task.create({
        data: {
          name: 'Error Task',
          schedule: '* * * * *',
          webhookUrl: 'https://discord.com/api/webhooks/1212121212121212121/abcdefghijklmnopqrstuvwxyz123456',
          maxRetry: 1,
          status: TaskStatus.ACTIVE,
        },
      });

      await schedulerService.addCronJob(
        task.id,
        task.name,
        task.schedule,
        task.webhookUrl,
        task.maxRetry,
      );

      // Manually trigger execution
      await schedulerService['executeTask'](
        task.id,
        task.name,
        task.webhookUrl,
        task.maxRetry,
      );

      // Should create error logs
      const logs = await prisma.taskLog.findMany({
        where: { taskId: task.id },
      });

      expect(logs.length).toBeGreaterThan(0);
      expect(logs.some((log) => log.message?.includes('error'))).toBe(true);
    });
  });
});
