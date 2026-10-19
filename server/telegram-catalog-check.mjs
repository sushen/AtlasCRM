// Read-only setup check. Never sends messages or prints the private token.
import { TelegramApi } from './telegram-catalog.mjs';

try {
  const api = new TelegramApi(process.env.TELEGRAM_BOT_TOKEN);
  const identity = await api.call('getMe');
  console.log('Bot: @' + identity.username);
  const webhook = await api.call('getWebhookInfo');
  if (webhook.url) {
    console.log('An existing webhook is configured. Use a dedicated catalog bot.');
    process.exitCode = 1;
  } else {
    const updates = await api.call('getUpdates', { timeout: 0, allowed_updates: ['message', 'callback_query'] });
    const chats = new Map();
    for (const update of updates) {
      const chat = update.message?.chat || update.callback_query?.message?.chat;
      if (chat) chats.set(String(chat.id), chat.type);
    }
    if (!chats.size) console.log('No pending chat IDs found. Add the bot to your group, send /catalog@' + identity.username + ', then run this check again.');
    for (const [id, type] of chats) console.log(`Chat ID: ${id} (${type})`);
    console.log('Save only approved IDs in TELEGRAM_CATALOG_CHAT_IDS. No messages were sent.');
  }
} catch { console.error('Telegram setup check failed. Configure the private bot token and verify connectivity. No messages were sent.'); process.exitCode = 1; }
