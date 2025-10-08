// Minimal env setup for e2e tests to avoid external dependencies
process.env.NODE_ENV = 'test';
process.env.API_KEY = process.env.API_KEY || 'test-api-key-12345';
process.env.DISCORD_WEBHOOK_TOKEN =
  process.env.DISCORD_WEBHOOK_TOKEN || 'test-webhook-token';