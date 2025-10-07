import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  thumbnail?: { url: string };
  image?: { url: string };
  footer?: { text: string; icon_url?: string };
  timestamp?: string;
}

interface DiscordPayload {
  content?: string;
  username?: string;
  avatar_url?: string;
  embeds?: DiscordEmbed[];
}

@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name);
  private readonly TIMEOUT_MS = 10000; // 10 seconds
  private readonly MAX_RETRIES = 3;
  private readonly BASE_DELAY_MS = 1000; // 1 second

  constructor(private readonly httpService: HttpService) {}

  async sendWebhook(
    webhookUrl: string,
    payload: any,
    attempt = 1,
  ): Promise<boolean> {
    try {
      // Validate webhook URL
      if (!this.isValidDiscordWebhookUrl(webhookUrl)) {
        throw new BadRequestException('Invalid Discord webhook URL format');
      }

      // Validate payload
      if (!this.validateWebhookPayload(payload)) {
        throw new BadRequestException('Invalid Discord webhook payload');
      }

      this.logger.log(
        `Sending webhook to Discord (attempt ${attempt}/${this.MAX_RETRIES})`,
      );

      // Send POST request
      const response = await firstValueFrom(
        this.httpService.post(webhookUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: this.TIMEOUT_MS,
          validateStatus: (status) => status >= 200 && status < 300,
        }),
      );

      this.logger.log(
        `Discord webhook sent successfully - Status: ${response.status}`,
      );
      return true;
    } catch (error) {
      return await this.handleWebhookError(error, webhookUrl, payload, attempt);
    }
  }

  private async handleWebhookError(
    error: any,
    webhookUrl: string,
    payload: any,
    attempt: number,
  ): Promise<boolean> {
    const isAxiosError = error.isAxiosError;
    const errorMessage = this.getErrorMessage(error);

    this.logger.error(
      `Discord webhook failed (attempt ${attempt}/${this.MAX_RETRIES}): ${errorMessage}`,
      error.stack,
    );

    // Don't retry on client errors (4xx)
    if (isAxiosError && error.response?.status >= 400 && error.response?.status < 500) {
      this.logger.warn(
        `Client error (${error.response.status}), not retrying: ${error.response.data?.message || errorMessage}`,
      );
      return false;
    }

    // Retry on network errors, timeouts, and server errors (5xx)
    if (attempt < this.MAX_RETRIES) {
      const delay = this.calculateBackoffDelay(attempt);
      this.logger.log(`Retrying in ${delay}ms...`);

      await this.sleep(delay);
      return await this.sendWebhook(webhookUrl, payload, attempt + 1);
    }

    this.logger.error(
      `Discord webhook failed after ${this.MAX_RETRIES} attempts`,
    );
    return false;
  }

  private getErrorMessage(error: any): string {
    if (error.isAxiosError) {
      const axiosError = error as AxiosError;
      if (axiosError.code === 'ECONNABORTED') {
        return 'Request timeout';
      }
      if (axiosError.code === 'ECONNREFUSED') {
        return 'Connection refused';
      }
      if (axiosError.response) {
        return `HTTP ${axiosError.response.status}: ${axiosError.response.statusText}`;
      }
      return axiosError.message;
    }
    return error.message || 'Unknown error';
  }

  validateWebhookPayload(payload: any): boolean {
    if (!payload || typeof payload !== 'object') {
      this.logger.warn('Payload is not a valid object');
      return false;
    }

    const typedPayload = payload as DiscordPayload;

    // Must have either content or embeds
    const hasContent = typedPayload.content && typeof typedPayload.content === 'string';
    const hasEmbeds = Array.isArray(typedPayload.embeds) && typedPayload.embeds.length > 0;

    if (!hasContent && !hasEmbeds) {
      this.logger.warn('Payload must contain either "content" or "embeds"');
      return false;
    }

    // Validate content length
    if (hasContent && typedPayload.content!.length > 2000) {
      this.logger.warn('Content exceeds 2000 characters');
      return false;
    }

    // Validate username length
    if (typedPayload.username && typedPayload.username.length > 80) {
      this.logger.warn('Username exceeds 80 characters');
      return false;
    }

    // Validate embeds
    if (hasEmbeds) {
      if (typedPayload.embeds!.length > 10) {
        this.logger.warn('Too many embeds (max 10)');
        return false;
      }

      for (const embed of typedPayload.embeds!) {
        if (!this.validateEmbed(embed)) {
          return false;
        }
      }
    }

    return true;
  }

  private validateEmbed(embed: DiscordEmbed): boolean {
    // Validate color (0-16777215 or 0x000000-0xFFFFFF)
    if (embed.color !== undefined) {
      if (typeof embed.color !== 'number' || embed.color < 0 || embed.color > 16777215) {
        this.logger.warn(`Invalid embed color: ${embed.color} (must be 0-16777215)`);
        return false;
      }
    }

    // Validate title length
    if (embed.title && embed.title.length > 256) {
      this.logger.warn('Embed title exceeds 256 characters');
      return false;
    }

    // Validate description length
    if (embed.description && embed.description.length > 4096) {
      this.logger.warn('Embed description exceeds 4096 characters');
      return false;
    }

    // Validate fields
    if (embed.fields) {
      if (embed.fields.length > 25) {
        this.logger.warn('Too many fields (max 25)');
        return false;
      }

      for (const field of embed.fields) {
        if (!field.name || field.name.length > 256) {
          this.logger.warn('Field name is required and must not exceed 256 characters');
          return false;
        }
        if (!field.value || field.value.length > 1024) {
          this.logger.warn('Field value is required and must not exceed 1024 characters');
          return false;
        }
      }
    }

    // Validate footer
    if (embed.footer?.text && embed.footer.text.length > 2048) {
      this.logger.warn('Footer text exceeds 2048 characters');
      return false;
    }

    return true;
  }

  private isValidDiscordWebhookUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      const isDiscordDomain =
        parsedUrl.hostname === 'discord.com' ||
        parsedUrl.hostname === 'discordapp.com' ||
        parsedUrl.hostname.endsWith('.discord.com') ||
        parsedUrl.hostname.endsWith('.discordapp.com');

      const hasWebhookPath = parsedUrl.pathname.includes('/api/webhooks/');

      return isDiscordDomain && hasWebhookPath;
    } catch {
      return false;
    }
  }

  private calculateBackoffDelay(attempt: number): number {
    // Exponential backoff: 1s, 2s, 4s
    return this.BASE_DELAY_MS * Math.pow(2, attempt - 1);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
