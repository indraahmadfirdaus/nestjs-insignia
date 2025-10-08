#!/bin/bash

# Quick Discord Webhook Test Script
# Usage: ./scripts/quick-discord-test.sh "YOUR_FULL_WEBHOOK_URL"

echo "🔍 Quick Discord Webhook Test"
echo "=============================="
echo ""

if [ -z "$1" ]; then
  echo "❌ Error: No webhook URL provided"
  echo ""
  echo "Usage:"
  echo "  ./scripts/quick-discord-test.sh \"https://discord.com/api/webhooks/WEBHOOK_ID/WEBHOOK_TOKEN\""
  echo ""
  echo "Or set environment variable:"
  echo "  export DISCORD_WEBHOOK_URL=\"https://discord.com/api/webhooks/WEBHOOK_ID/WEBHOOK_TOKEN\""
  echo "  ./scripts/quick-discord-test.sh"
  echo ""
  exit 1
fi

WEBHOOK_URL="$1"

echo "📝 Webhook URL: ${WEBHOOK_URL:0:50}..."
echo ""

# Extract webhook ID and token
if [[ $WEBHOOK_URL =~ webhooks/([0-9]+)/([^/]+)$ ]]; then
  WEBHOOK_ID="${BASH_REMATCH[1]}"
  WEBHOOK_TOKEN="${BASH_REMATCH[2]}"

  echo "✅ Webhook ID: $WEBHOOK_ID"
  echo "✅ Token: ${WEBHOOK_TOKEN:0:10}..."
  echo ""
else
  echo "❌ Invalid webhook URL format"
  echo ""
  echo "Expected format:"
  echo "  https://discord.com/api/webhooks/WEBHOOK_ID/WEBHOOK_TOKEN"
  echo ""
  exit 1
fi

echo "📤 Sending test message..."
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "Task Scheduler Test",
    "embeds": [{
      "title": "✅ Test Successful",
      "description": "Your Discord webhook is working correctly!",
      "color": 3066993,
      "fields": [
        {
          "name": "Webhook ID",
          "value": "'"$WEBHOOK_ID"'",
          "inline": true
        },
        {
          "name": "Timestamp",
          "value": "'"$(date)"'",
          "inline": false
        }
      ],
      "footer": {
        "text": "Task Scheduler Backend"
      }
    }]
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
RESPONSE_BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 204 ] || [ "$HTTP_CODE" -eq 200 ]; then
  echo "✅ SUCCESS! Message sent to Discord"
  echo "   HTTP Status: $HTTP_CODE"
  echo ""
  echo "✨ Check your Discord channel!"
  echo ""
  echo "📝 Next steps:"
  echo "   1. Add to your .env file:"
  echo "      DISCORD_WEBHOOK_TOKEN=$WEBHOOK_TOKEN"
  echo ""
  echo "   2. When creating tasks, use webhook ID:"
  echo "      \"channelId\": \"$WEBHOOK_ID\""
  echo ""
else
  echo "❌ FAILED! HTTP Status: $HTTP_CODE"
  echo ""
  echo "Response:"
  echo "$RESPONSE_BODY"
  echo ""

  if [ "$HTTP_CODE" -eq 404 ]; then
    echo "💡 The webhook might have been deleted."
    echo "   Create a new webhook in Discord."
  elif [ "$HTTP_CODE" -eq 401 ]; then
    echo "💡 Invalid webhook token."
    echo "   Check your webhook URL."
  elif [ "$HTTP_CODE" -eq 400 ]; then
    echo "💡 Invalid payload."
    echo "   This shouldn't happen with this test."
  elif [ "$HTTP_CODE" -eq 429 ]; then
    echo "💡 Rate limited."
    echo "   Wait a moment and try again."
  fi
  echo ""
  exit 1
fi
