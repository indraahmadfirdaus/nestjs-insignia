import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { createMockPrisma } from './utils/mock-prisma';
import { TaskStatus } from '@prisma/client';

describe('Tasks API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let createdTaskId: string;

  const validApiKey = 'test-api-key-12345';
  const invalidApiKey = 'invalid-api-key';

  beforeAll(async () => {
    const mockPrisma = createMockPrisma();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleFixture.createNestApplication();

    // Apply same configurations as main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('api');

    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Clean in-memory store before tests
    await prisma.taskLog.deleteMany();
    await prisma.task.deleteMany();
  });

  afterAll(async () => {
    // Clean up after tests
    await prisma.taskLog.deleteMany();
    await prisma.task.deleteMany();
    await prisma.$disconnect();
    await app.close();
  });

  describe('Authentication', () => {
    it('should return 401 when no API key is provided', () => {
      return request(app.getHttpServer())
        .get('/api/tasks')
        .expect(401);
    });

    it('should return 401 when invalid API key is provided', () => {
      return request(app.getHttpServer())
        .get('/api/tasks')
        .set('X-API-Key', invalidApiKey)
        .expect(401);
    });

    it('should return 200 when valid API key is provided', () => {
      return request(app.getHttpServer())
        .get('/api/tasks')
        .set('X-API-Key', validApiKey)
        .expect(200);
    });
  });

  describe('POST /api/tasks - Create Task', () => {
    it('should create a new task with valid data', async () => {
      const createTaskDto = {
        name: 'Test Task',
        schedule: '0 9 * * *',
        webhookUrl: 'https://discord.com/api/webhooks/1234567890123456789/abcdefghijklmnopqrstuvwxyz123456',
        maxRetry: 3,
        status: 'ACTIVE',
      };

      const response = await request(app.getHttpServer())
        .post('/api/tasks')
        .set('X-API-Key', validApiKey)
        .send(createTaskDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(createTaskDto.name);
      expect(response.body.schedule).toBe(createTaskDto.schedule);
      expect(response.body.webhookUrl).toBe(createTaskDto.webhookUrl);
      expect(response.body.maxRetry).toBe(createTaskDto.maxRetry);
      expect(response.body.status).toBe(createTaskDto.status);

      createdTaskId = response.body.id;

      // Verify task exists in database
      const taskInDb = await prisma.task.findUnique({
        where: { id: createdTaskId },
      });
      expect(taskInDb).toBeTruthy();
      expect(taskInDb?.name).toBe(createTaskDto.name);
    });

    it('should create task with default values', async () => {
      const createTaskDto = {
        name: 'Task with Defaults',
        schedule: '@daily',
        webhookUrl: 'https://discord.com/api/webhooks/9876543210987654321/abcdefghijklmnopqrstuvwxyz123456',
      };

      const response = await request(app.getHttpServer())
        .post('/api/tasks')
        .set('X-API-Key', validApiKey)
        .send(createTaskDto)
        .expect(201);

      expect(response.body.maxRetry).toBe(3); // default value
      expect(response.body.status).toBe('ACTIVE'); // default value
    });

    it('should fail with invalid cron expression', async () => {
      const createTaskDto = {
        name: 'Invalid Cron Task',
        schedule: 'invalid-cron',
        webhookUrl: 'https://discord.com/api/webhooks/1234567890123456789/abcdefghijklmnopqrstuvwxyz123456',
      };

      const response = await request(app.getHttpServer())
        .post('/api/tasks')
        .set('X-API-Key', validApiKey)
        .send(createTaskDto)
        .expect(400);

      const msg = response.body.message;
      const contains = Array.isArray(msg)
        ? msg.some((m: string) => m.includes('Invalid cron expression'))
        : String(msg).includes('Invalid cron expression');
      expect(contains).toBe(true);
    });

    it('should fail with invalid webhook URL format', async () => {
      const createTaskDto = {
        name: 'Invalid Webhook Task',
        schedule: '0 9 * * *',
        webhookUrl: 'not-a-valid-url',
      };

      const response = await request(app.getHttpServer())
        .post('/api/tasks')
        .set('X-API-Key', validApiKey)
        .send(createTaskDto)
        .expect(400);

      const msg2 = response.body.message;
      const contains2 = Array.isArray(msg2)
        ? msg2.some((m: string) => m.includes('Invalid webhook URL'))
        : String(msg2).includes('Invalid webhook URL');
      expect(contains2).toBe(true);
    });

    it('should fail with maxRetry out of range', async () => {
      const createTaskDto = {
        name: 'Max Retry Task',
        schedule: '0 9 * * *',
        webhookUrl: 'https://discord.com/api/webhooks/1234567890123456789/abcdefghijklmnopqrstuvwxyz123456',
        maxRetry: 15, // max is 10
      };

      const response = await request(app.getHttpServer())
        .post('/api/tasks')
        .set('X-API-Key', validApiKey)
        .send(createTaskDto)
        .expect(400);

      expect(response.body.message).toContain('Max retry cannot exceed 10');
    });

    it('should fail with missing required fields', async () => {
      const createTaskDto = {
        name: 'Incomplete Task',
        // missing schedule and webhookUrl
      };

      await request(app.getHttpServer())
        .post('/api/tasks')
        .set('X-API-Key', validApiKey)
        .send(createTaskDto)
        .expect(400);
    });
  });

  describe('GET /api/tasks - List Tasks', () => {
    beforeAll(async () => {
      // Create multiple tasks for pagination testing
      await prisma.task.createMany({
        data: [
          {
            name: 'Active Task 1',
            schedule: '0 9 * * *',
            webhookUrl: 'https://discord.com/api/webhooks/1111111111111111111/abcdefghijklmnopqrstuvwxyz111111',
            status: TaskStatus.ACTIVE,
          },
          {
            name: 'Active Task 2',
            schedule: '0 10 * * *',
            webhookUrl: 'https://discord.com/api/webhooks/2222222222222222222/abcdefghijklmnopqrstuvwxyz222222',
            status: TaskStatus.ACTIVE,
          },
          {
            name: 'Inactive Task',
            schedule: '0 11 * * *',
            webhookUrl: 'https://discord.com/api/webhooks/3333333333333333333/abcdefghijklmnopqrstuvwxyz333333',
            status: TaskStatus.INACTIVE,
          },
        ],
      });
    });

    it('should return paginated list of tasks', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tasks')
        .set('X-API-Key', validApiKey)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta).toHaveProperty('total');
      expect(response.body.meta).toHaveProperty('page');
      expect(response.body.meta).toHaveProperty('limit');
      expect(response.body.meta).toHaveProperty('totalPages');
    });

    it('should filter tasks by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tasks?status=ACTIVE')
        .set('X-API-Key', validApiKey)
        .expect(200);

      expect(response.body.data.every((task) => task.status === 'ACTIVE')).toBe(
        true,
      );
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tasks?page=1&limit=2')
        .set('X-API-Key', validApiKey)
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(2);
    });
  });

  describe('GET /api/tasks/:id - Get Task by ID', () => {
    it('should return task with logs', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/tasks/${createdTaskId}`)
        .set('X-API-Key', validApiKey)
        .expect(200);

      expect(response.body.id).toBe(createdTaskId);
      expect(response.body).toHaveProperty('logs');
      expect(Array.isArray(response.body.logs)).toBe(true);
    });

    it('should return 404 for non-existent task', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app.getHttpServer())
        .get(`/api/tasks/${fakeId}`)
        .set('X-API-Key', validApiKey)
        .expect(404);

      expect(response.body.message).toContain('not found');
    });
  });

  describe('PATCH /api/tasks/:id - Update Task', () => {
    it('should update task successfully', async () => {
      const updateDto = {
        name: 'Updated Task Name',
        schedule: '0 10 * * *',
        maxRetry: 5,
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/tasks/${createdTaskId}`)
        .set('X-API-Key', validApiKey)
        .send(updateDto)
        .expect(200);

      expect(response.body.name).toBe(updateDto.name);
      expect(response.body.schedule).toBe(updateDto.schedule);
      expect(response.body.maxRetry).toBe(updateDto.maxRetry);

      // Verify in database
      const taskInDb = await prisma.task.findUnique({
        where: { id: createdTaskId },
      });
      expect(taskInDb?.name).toBe(updateDto.name);
    });

    it('should update only provided fields', async () => {
      const originalTask = await prisma.task.findUnique({
        where: { id: createdTaskId },
      });

      const updateDto = {
        maxRetry: 7,
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/tasks/${createdTaskId}`)
        .set('X-API-Key', validApiKey)
        .send(updateDto)
        .expect(200);

      expect(response.body.maxRetry).toBe(7);
      expect(response.body.name).toBe(originalTask?.name); // unchanged
      expect(response.body.schedule).toBe(originalTask?.schedule); // unchanged
    });

    it('should return 404 for non-existent task', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const updateDto = {
        name: 'Updated Name',
      };

      await request(app.getHttpServer())
        .patch(`/api/tasks/${fakeId}`)
        .set('X-API-Key', validApiKey)
        .send(updateDto)
        .expect(404);
    });
  });

  describe('POST /api/tasks/:id/toggle - Toggle Task Status', () => {
    it('should toggle task from ACTIVE to INACTIVE', async () => {
      // Ensure task is ACTIVE
      await prisma.task.update({
        where: { id: createdTaskId },
        data: { status: TaskStatus.ACTIVE },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/tasks/${createdTaskId}/toggle`)
        .set('X-API-Key', validApiKey)
        .expect(200);

      expect(response.body.status).toBe('INACTIVE');
    });

    it('should toggle task from INACTIVE to ACTIVE', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/tasks/${createdTaskId}/toggle`)
        .set('X-API-Key', validApiKey)
        .expect(200);

      expect(response.body.status).toBe('ACTIVE');
    });

    it('should return 404 for non-existent task', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .post(`/api/tasks/${fakeId}/toggle`)
        .set('X-API-Key', validApiKey)
        .expect(404);
    });
  });

  describe('GET /api/tasks/dashboard/stats - Dashboard Statistics', () => {
    it('should return dashboard statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tasks/dashboard/stats')
        .set('X-API-Key', validApiKey)
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('active');
      expect(response.body).toHaveProperty('inactive');
      expect(response.body).toHaveProperty('failed');
      expect(typeof response.body.total).toBe('number');
      expect(typeof response.body.active).toBe('number');
      expect(typeof response.body.inactive).toBe('number');
      expect(typeof response.body.failed).toBe('number');
    });
  });

  describe('DELETE /api/tasks/:id - Delete Task', () => {
    let taskToDelete: string;

    beforeAll(async () => {
      const task = await prisma.task.create({
        data: {
          name: 'Task to Delete',
          schedule: '0 12 * * *',
          webhookUrl: 'https://discord.com/api/webhooks/4444444444444444444/abcdefghijklmnopqrstuvwxyz444444',
          status: TaskStatus.ACTIVE,
        },
      });
      taskToDelete = task.id;
    });

    it('should delete task successfully', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/tasks/${taskToDelete}`)
        .set('X-API-Key', validApiKey)
        .expect(200);

      expect(response.body.message).toContain('deleted successfully');

      // Verify task is deleted from database
      const taskInDb = await prisma.task.findUnique({
        where: { id: taskToDelete },
      });
      expect(taskInDb).toBeNull();
    });

    it('should return 404 when deleting non-existent task', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .delete(`/api/tasks/${fakeId}`)
        .set('X-API-Key', validApiKey)
        .expect(404);
    });

    it('should cascade delete task logs', async () => {
      // Create task with logs
      const task = await prisma.task.create({
        data: {
          name: 'Task with Logs',
          schedule: '0 13 * * *',
          webhookUrl: 'https://discord.com/api/webhooks/5555555555555555555/abcdefghijklmnopqrstuvwxyz555555',
          status: TaskStatus.ACTIVE,
        },
      });

      await prisma.taskLog.create({
        data: {
          taskId: task.id,
          status: 'SUCCESS',
          message: 'Test log',
        },
      });

      // Delete task
      await request(app.getHttpServer())
        .delete(`/api/tasks/${task.id}`)
        .set('X-API-Key', validApiKey)
        .expect(200);

      // Verify logs are also deleted
      const logsInDb = await prisma.taskLog.findMany({
        where: { taskId: task.id },
      });
      expect(logsInDb.length).toBe(0);
    });
  });

  describe('GET /api/tasks/:taskId/logs - Get Task Logs', () => {
    let taskWithLogs: string;

    beforeAll(async () => {
      const task = await prisma.task.create({
        data: {
          name: 'Task for Logs',
          schedule: '0 14 * * *',
          webhookUrl: 'https://discord.com/api/webhooks/6666666666666666666/abcdefghijklmnopqrstuvwxyz666666',
          status: TaskStatus.ACTIVE,
        },
      });
      taskWithLogs = task.id;

      // Create multiple logs
      await prisma.taskLog.createMany({
        data: [
          {
            taskId: taskWithLogs,
            status: 'SUCCESS',
            message: 'First execution',
            retryCount: 0,
          },
          {
            taskId: taskWithLogs,
            status: 'RETRYING',
            message: 'Second execution failed, retrying',
            retryCount: 1,
          },
          {
            taskId: taskWithLogs,
            status: 'SUCCESS',
            message: 'Third execution succeeded',
            retryCount: 0,
          },
        ],
      });
    });

    it('should return task logs with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/tasks/${taskWithLogs}/logs`)
        .set('X-API-Key', validApiKey)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter logs by status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/tasks/${taskWithLogs}/logs?status=SUCCESS`)
        .set('X-API-Key', validApiKey)
        .expect(200);

      expect(
        response.body.data.every((log) => log.status === 'SUCCESS'),
      ).toBe(true);
    });

    it('should return 404 for non-existent task', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .get(`/api/tasks/${fakeId}/logs`)
        .set('X-API-Key', validApiKey)
        .expect(404);
    });
  });

  describe('GET /api/logs - Get All Logs', () => {
    it('should return all logs with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/logs')
        .set('X-API-Key', validApiKey)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter logs by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/logs?status=SUCCESS')
        .set('X-API-Key', validApiKey)
        .expect(200);

      expect(
        response.body.data.every((log) => log.status === 'SUCCESS'),
      ).toBe(true);
    });

    it('should filter logs by date range', async () => {
      const dateFrom = new Date('2025-01-01').toISOString();
      const dateTo = new Date().toISOString();

      const response = await request(app.getHttpServer())
        .get(`/api/logs?dateFrom=${dateFrom}&dateTo=${dateTo}`)
        .set('X-API-Key', validApiKey)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });
  });
});
