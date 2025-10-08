import { Test, TestingModule } from '@nestjs/testing';
import { HttpModule, HttpService } from '@nestjs/axios';
import { DiscordService } from '../src/discord/discord.service';
import { of, throwError } from 'rxjs';
import { AxiosError, AxiosResponse } from 'axios';

describe('Discord Service Integration (e2e)', () => {
  let discordService: DiscordService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        HttpModule.register({
          timeout: 10000,
          maxRedirects: 5,
        }),
      ],
      providers: [DiscordService],
    }).compile();

    discordService = module.get<DiscordService>(DiscordService);
    httpService = module.get<HttpService>(HttpService);
  });

  describe('Webhook URL Validation', () => {
    it('should validate correct Discord webhook URL', () => {
      const validUrl = 'https://discord.com/api/webhooks/1320387296511655998/abcdefghijklmnopqrstuvwxyz123456';
      const isValid = discordService['isValidDiscordWebhookUrl'](validUrl);
      expect(isValid).toBe(true);
    });

    it('should validate discordapp.com webhook URL', () => {
      const validUrl = 'https://discordapp.com/api/webhooks/1320387296511655998/abcdefghijklmnopqrstuvwxyz123456';
      const isValid = discordService['isValidDiscordWebhookUrl'](validUrl);
      expect(isValid).toBe(true);
    });

    it('should reject invalid webhook URL domain', () => {
      const invalidUrl = 'https://evil.com/api/webhooks/1320387296511655998/token';
      const isValid = discordService['isValidDiscordWebhookUrl'](invalidUrl);
      expect(isValid).toBe(false);
    });

    it('should reject URL without webhook path', () => {
      const invalidUrl = 'https://discord.com/api/channels/1320387296511655998';
      const isValid = discordService['isValidDiscordWebhookUrl'](invalidUrl);
      expect(isValid).toBe(false);
    });

    it('should reject malformed URL', () => {
      const invalidUrl = 'not-a-url';
      const isValid = discordService['isValidDiscordWebhookUrl'](invalidUrl);
      expect(isValid).toBe(false);
    });
  });

  describe('Discord Payload Construction', () => {
    it('should build success notification payload', () => {
      const taskId = 'task-123';
      const taskName = 'Test Task';
      const status = 'success' as const;
      const retryCount = 0;

      const payload = discordService['buildExecutionPayload'](
        taskId,
        taskName,
        status,
        retryCount,
      );

      expect(payload).toHaveProperty('username', 'Task Scheduler Bot');
      expect(payload).toHaveProperty('embeds');
      expect(payload.embeds).toHaveLength(1);
      expect(payload.embeds![0].title).toContain('✅');
      expect(payload.embeds![0].color).toBe(3066993); // Green
      expect(payload.embeds![0].fields).toBeDefined();
      expect(
        payload.embeds![0].fields!.find((f) => f.name === 'Task ID')?.value,
      ).toBe(taskId);
      expect(
        payload.embeds![0].fields!.find((f) => f.name === 'Task Name')?.value,
      ).toBe(taskName);
    });

    it('should build failed notification payload', () => {
      const taskId = 'task-456';
      const taskName = 'Failed Task';
      const status = 'failed' as const;
      const retryCount = 3;
      const message = 'Max retries exceeded';

      const payload = discordService['buildExecutionPayload'](
        taskId,
        taskName,
        status,
        retryCount,
        message,
      );

      expect(payload.embeds![0].title).toContain('❌');
      expect(payload.embeds![0].color).toBe(15158332); // Red
      expect(
        payload.embeds![0].fields!.find((f) => f.name === 'Retry Count')?.value,
      ).toBe('3');
      expect(
        payload.embeds![0].fields!.find((f) => f.name === 'Details')?.value,
      ).toContain(message);
    });

    it('should build retrying notification payload', () => {
      const taskId = 'task-789';
      const taskName = 'Retrying Task';
      const status = 'retrying' as const;
      const retryCount = 1;

      const payload = discordService['buildExecutionPayload'](
        taskId,
        taskName,
        status,
        retryCount,
      );

      expect(payload.embeds![0].title).toContain('⚠️');
      expect(payload.embeds![0].color).toBe(16776960); // Yellow
      expect(
        payload.embeds![0].fields!.find((f) => f.name === 'Retry Count')?.value,
      ).toBe('1');
    });

    it('should include timestamp in payload', () => {
      const taskId = 'task-timestamp';
      const taskName = 'Timestamp Task';
      const status = 'success' as const;
      const retryCount = 0;

      const payload = discordService['buildExecutionPayload'](
        taskId,
        taskName,
        status,
        retryCount,
      );

      expect(payload.embeds![0].timestamp).toBeDefined();
      expect(new Date(payload.embeds![0].timestamp!).getTime()).toBeLessThanOrEqual(
        Date.now(),
      );
    });

    it('should truncate long error messages', () => {
      const taskId = 'task-long-error';
      const taskName = 'Long Error Task';
      const status = 'failed' as const;
      const retryCount = 2;
      const longMessage = 'Error: '.repeat(500); // Very long message

      const payload = discordService['buildExecutionPayload'](
        taskId,
        taskName,
        status,
        retryCount,
        longMessage,
      );

      const detailsField = payload.embeds![0].fields!.find(
        (f) => f.name === 'Details',
      );
      expect(detailsField?.value.length).toBeLessThanOrEqual(1024);
    });
  });

  describe('Payload Validation', () => {
    it('should validate correct Discord payload', () => {
      const payload = {
        username: 'Test Bot',
        embeds: [
          {
            title: 'Test',
            description: 'Test description',
            color: 3066993,
          },
        ],
      };

      const isValid = discordService.validateWebhookPayload(payload);
      expect(isValid).toBe(true);
    });

    it('should reject payload without content or embeds', () => {
      const payload = {
        username: 'Test Bot',
      };

      const isValid = discordService.validateWebhookPayload(payload);
      expect(isValid).toBe(false);
    });

    it('should reject payload with content exceeding 2000 characters', () => {
      const payload = {
        content: 'a'.repeat(2001),
      };

      const isValid = discordService.validateWebhookPayload(payload);
      expect(isValid).toBe(false);
    });

    it('should reject payload with too many embeds', () => {
      const payload = {
        embeds: Array(11).fill({ title: 'Test' }),
      };

      const isValid = discordService.validateWebhookPayload(payload);
      expect(isValid).toBe(false);
    });

    it('should reject embed with invalid color', () => {
      const payload = {
        embeds: [
          {
            title: 'Test',
            color: 16777216, // Out of range
          },
        ],
      };

      const isValid = discordService.validateWebhookPayload(payload);
      expect(isValid).toBe(false);
    });

    it('should reject embed with title exceeding 256 characters', () => {
      const payload = {
        embeds: [
          {
            title: 'a'.repeat(257),
          },
        ],
      };

      const isValid = discordService.validateWebhookPayload(payload);
      expect(isValid).toBe(false);
    });

    it('should reject embed with description exceeding 4096 characters', () => {
      const payload = {
        embeds: [
          {
            title: 'Test',
            description: 'a'.repeat(4097),
          },
        ],
      };

      const isValid = discordService.validateWebhookPayload(payload);
      expect(isValid).toBe(false);
    });

    it('should reject embed with too many fields', () => {
      const payload = {
        embeds: [
          {
            title: 'Test',
            fields: Array(26).fill({ name: 'Field', value: 'Value' }),
          },
        ],
      };

      const isValid = discordService.validateWebhookPayload(payload);
      expect(isValid).toBe(false);
    });

    it('should accept valid payload with content only', () => {
      const payload = {
        content: 'Valid message',
      };

      const isValid = discordService.validateWebhookPayload(payload);
      expect(isValid).toBe(true);
    });

    it('should accept valid payload with embeds only', () => {
      const payload = {
        embeds: [
          {
            title: 'Valid Embed',
            description: 'Valid description',
          },
        ],
      };

      const isValid = discordService.validateWebhookPayload(payload);
      expect(isValid).toBe(true);
    });
  });

  describe('Task Notification Sending', () => {
    it('should successfully send task notification', async () => {
      const mockResponse: AxiosResponse = {
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'post').mockReturnValue(of(mockResponse));

      const result = await discordService.sendTaskNotification(
        'https://discord.com/api/webhooks/1234567890123456789/abcdefghijklmnopqrstuvwxyz123456',
        'task-123',
        'Test Task',
        'success',
        0,
      );

      expect(result).toBe(true);
    });

    it('should handle 4xx client errors without retry', async () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 400,
          data: { message: 'Bad Request' },
        },
      } as AxiosError;

      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(throwError(() => error));

      const result = await discordService.sendTaskNotification(
        'https://discord.com/api/webhooks/1234567890123456789/abcdefghijklmnopqrstuvwxyz123456',
        'task-400',
        'Bad Request Task',
        'success',
        0,
      );

      expect(result).toBe(false);
    });

    it('should retry on 5xx server errors', async () => {
      let attempts = 0;
      const mockResponse: AxiosResponse = {
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'post').mockImplementation(() => {
        attempts++;
        if (attempts < 2) {
          const error = {
            isAxiosError: true,
            response: {
              status: 500,
              statusText: 'Internal Server Error',
            },
          } as AxiosError;
          return throwError(() => error);
        }
        return of(mockResponse);
      });

      const result = await discordService.sendTaskNotification(
        'https://discord.com/api/webhooks/1320387296511655998/abcdefghijklmnopqrstuvwxyz123456',
        'task-500',
        'Server Error Task',
        'success',
        0,
      );

      expect(result).toBe(true);
      expect(attempts).toBe(2);
    });

    it('should fail after max retries on persistent errors', async () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 500,
          statusText: 'Internal Server Error',
        },
      } as AxiosError;

      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(throwError(() => error));

      const result = await discordService.sendTaskNotification(
        'https://discord.com/api/webhooks/1320387296511655998/abcdefghijklmnopqrstuvwxyz123456',
        'task-persistent-error',
        'Persistent Error Task',
        'success',
        0,
      );

      expect(result).toBe(false);
    });

    it('should handle network timeout errors', async () => {
      const error = {
        isAxiosError: true,
        code: 'ECONNABORTED',
        message: 'timeout of 10000ms exceeded',
      } as AxiosError;

      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(throwError(() => error));

      const result = await discordService.sendTaskNotification(
        'https://discord.com/api/webhooks/1320387296511655998/abcdefghijklmnopqrstuvwxyz123456',
        'task-timeout',
        'Timeout Task',
        'success',
        0,
      );

      expect(result).toBe(false);
    });

    it('should handle connection refused errors', async () => {
      const error = {
        isAxiosError: true,
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED',
      } as AxiosError;

      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(throwError(() => error));

      const result = await discordService.sendTaskNotification(
        'https://discord.com/api/webhooks/1320387296511655998/abcdefghijklmnopqrstuvwxyz123456',
        'task-connection-refused',
        'Connection Refused Task',
        'success',
        0,
      );

      expect(result).toBe(false);
    });

    it('should include retry count in notification', async () => {
      const mockResponse: AxiosResponse = {
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      let capturedPayload: any;

      jest.spyOn(httpService, 'post').mockImplementation((_url, data) => {
        capturedPayload = data;
        return of(mockResponse);
      });

      await discordService.sendTaskNotification(
        'https://discord.com/api/webhooks/1320387296511655998/abcdefghijklmnopqrstuvwxyz123456',
        'task-with-retry',
        'Task with Retry',
        'retrying',
        2,
        'Previous attempt failed',
      );

      expect(capturedPayload.embeds[0].fields).toContainEqual(
        expect.objectContaining({
          name: 'Retry Count',
          value: '2',
        }),
      );

      expect(capturedPayload.embeds[0].fields).toContainEqual(
        expect.objectContaining({
          name: 'Details',
          value: expect.stringContaining('Previous attempt failed'),
        }),
      );
    });
  });

  describe('Error Message Handling', () => {
    it('should extract error message from Axios error', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 400,
          statusText: 'Bad Request',
        },
      } as AxiosError;

      const message = discordService['getErrorMessage'](error);

      expect(message).toContain('400');
      expect(message).toContain('Bad Request');
    });

    it('should handle timeout errors', () => {
      const error = {
        isAxiosError: true,
        code: 'ECONNABORTED',
      } as AxiosError;

      const message = discordService['getErrorMessage'](error);

      expect(message).toBe('Request timeout');
    });

    it('should handle connection refused errors', () => {
      const error = {
        isAxiosError: true,
        code: 'ECONNREFUSED',
      } as AxiosError;

      const message = discordService['getErrorMessage'](error);

      expect(message).toBe('Connection refused');
    });

    it('should handle generic errors', () => {
      const error = new Error('Generic error');

      const message = discordService['getErrorMessage'](error);

      expect(message).toBe('Generic error');
    });
  });

  describe('Exponential Backoff', () => {
    it('should calculate correct backoff delays', () => {
      const delay1 = discordService['calculateBackoffDelay'](1);
      const delay2 = discordService['calculateBackoffDelay'](2);
      const delay3 = discordService['calculateBackoffDelay'](3);

      expect(delay1).toBe(1000); // 1s
      expect(delay2).toBe(2000); // 2s
      expect(delay3).toBe(4000); // 4s
    });
  });
});
