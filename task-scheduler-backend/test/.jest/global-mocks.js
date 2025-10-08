// Ensure a webhook token exists for tests that build URLs
process.env.DISCORD_WEBHOOK_TOKEN =
  process.env.DISCORD_WEBHOOK_TOKEN || 'test-webhook-token';

// Mock DiscordService network side effects globally
const { DiscordService } = require('../../src/discord/discord.service');

// Only apply the global mock for non-Discord tests to avoid interfering
// with Discord e2e specs that verify real error-handling behavior.
const testPath = (typeof expect !== 'undefined' && expect.getState && expect.getState().testPath) || '';
const isDiscordSpec = typeof testPath === 'string' && testPath.includes('discord.e2e-spec.ts');

if (!isDiscordSpec && DiscordService && DiscordService.prototype) {
  try {
    jest.spyOn(DiscordService.prototype, 'sendTaskNotification').mockResolvedValue(true);
  } catch (e) {
    // ignore if already mocked or not available
  }
}