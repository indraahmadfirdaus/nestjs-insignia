import axios from 'axios';

/**
 * Test Discord Webhook Script
 *
 * This script helps you test Discord webhook integration
 *
 * Usage:
 * npx ts-node scripts/test-discord-webhook.ts
 */

async function testDiscordWebhook() {
  console.log('🔍 Testing Discord Webhook Integration\n');

  // Get webhook URL from environment or use full URL
  const FULL_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL ||
    'https://discord.com/api/webhooks/WEBHOOK_ID/WEBHOOK_TOKEN';

  console.log('Webhook URL:', FULL_WEBHOOK_URL.replace(/\/[^/]+$/, '/***'));

  // Parse webhook URL to get ID and token
  const urlMatch = FULL_WEBHOOK_URL.match(/webhooks\/(\d+)\/([^/]+)/);

  if (!urlMatch) {
    console.error('❌ Invalid webhook URL format');
    console.log('\nExpected format: https://discord.com/api/webhooks/WEBHOOK_ID/WEBHOOK_TOKEN');
    console.log('\nHow to get your Discord webhook:');
    console.log('1. Go to Discord Server Settings → Integrations → Webhooks');
    console.log('2. Create a new webhook or select existing one');
    console.log('3. Copy the webhook URL');
    console.log('4. Set DISCORD_WEBHOOK_URL environment variable');
    return;
  }

  const [, webhookId, webhookToken] = urlMatch;

  console.log('✅ Webhook ID:', webhookId);
  console.log('✅ Token:', webhookToken.substring(0, 10) + '...\n');

  // Test payload
  const payload = {
    username: 'Task Scheduler Bot',
    embeds: [
      {
        title: '✅ Test Notification',
        description: 'Testing Discord webhook integration from Task Scheduler',
        color: 3066993, // Green
        fields: [
          {
            name: 'Status',
            value: 'Testing',
            inline: true,
          },
          {
            name: 'Timestamp',
            value: new Date().toLocaleString(),
            inline: true,
          },
        ],
        footer: {
          text: 'Task Scheduler Backend',
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  console.log('📤 Sending test message...\n');

  try {
    const response = await axios.post(FULL_WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    console.log('✅ SUCCESS! Webhook sent successfully');
    console.log('   Status:', response.status, response.statusText);
    console.log('\n✨ Check your Discord channel for the test message!\n');

    // Show how to configure the application
    console.log('📝 To configure your application:');
    console.log('\n1. Add to your .env file:');
    console.log(`   DISCORD_WEBHOOK_ID=${webhookId}`);
    console.log(`   DISCORD_WEBHOOK_TOKEN=${webhookToken}`);

    console.log('\n2. When creating a task, use the webhook ID:');
    console.log(`   {
     "name": "My Task",
     "schedule": "0 9 * * *",
     "channelId": "${webhookId}",
     "maxRetry": 3
   }`);

  } catch (error: any) {
    console.error('❌ FAILED to send webhook\n');

    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));

      if (error.response.status === 404) {
        console.log('\n💡 The webhook URL might be invalid or deleted.');
        console.log('   Please create a new webhook in Discord.');
      } else if (error.response.status === 401) {
        console.log('\n💡 The webhook token might be invalid.');
        console.log('   Please check your webhook URL.');
      } else if (error.response.status === 400) {
        console.log('\n💡 The payload might be invalid.');
        console.log('   Discord payload limits:');
        console.log('   - Content: max 2000 characters');
        console.log('   - Embeds: max 10 embeds');
        console.log('   - Embed title: max 256 characters');
        console.log('   - Embed description: max 4096 characters');
      }
    } else if (error.code === 'ECONNABORTED') {
      console.error('❌ Request timeout');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('❌ Connection refused');
    } else {
      console.error('Error:', error.message);
    }

    console.log('\n🔍 Troubleshooting:');
    console.log('1. Verify the webhook URL is correct');
    console.log('2. Make sure the webhook hasn\'t been deleted in Discord');
    console.log('3. Check your internet connection');
    console.log('4. Verify Discord API is accessible');
  }
}

// Run the test
testDiscordWebhook().catch(console.error);
