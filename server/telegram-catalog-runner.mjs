import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { SupplierCatalog } from './catalog.mjs';
import { storefrontSettings } from './catalog-settings.mjs';
import { TelegramApi, TelegramCatalogBot } from './telegram-catalog.mjs';
import { ShopOrders } from './shop-orders.mjs';
import { ShopFileStorage } from './shop-file-storage.mjs';
import { TelegramShop } from './telegram-shop.mjs';
import { paymentConfiguration } from './payments/config.mjs';
import { BinanceManualPaymentProvider } from './payments/binance-manual.mjs';
import { loadLocalPaymentQr } from './payments/local-qr.mjs';
import {PartnerProgram} from './partners/program.mjs';

try {
  const api = new TelegramApi(process.env.TELEGRAM_BOT_TOKEN);
  const allowed = (process.env.TELEGRAM_CATALOG_CHAT_IDS || '').split(',').map(id => id.trim()).filter(Boolean);
  if (allowed.some(id => !/^-?\d+$/.test(id))) throw Error('Invalid allowed chat ID');
  const groupUrl = storefrontSettings().telegramUrl;
  if (!groupUrl) throw Error('Configure the Telegram sales group URL');
  if (!allowed.length && process.env.TELEGRAM_PUBLIC_CATALOG_DMS !== 'true') throw Error('Configure allowed Telegram chat IDs');
  const webhook = await api.call('getWebhookInfo');
  if (webhook.url) throw Error('This bot has an existing webhook. Use a dedicated catalog bot.');
  const identity = await api.call('getMe');
  const bot = new TelegramCatalogBot({ api, catalog: new SupplierCatalog(), allowedChatIds: allowed,
    groupUrl, username: identity.username, publicPrivateChats: process.env.TELEGRAM_PUBLIC_CATALOG_DMS === 'true' });
  const adminIds=(process.env.TELEGRAM_SHOP_ADMIN_IDS||'').split(',').filter(id=>/^\d+$/.test(id));
  const orderStorage=new ShopFileStorage(resolve('.catalog-state/shop-orders.json'));
  const partnerEnabled=process.env.PARTNER_TRACKING_ENABLED==='true';
  const partners=partnerEnabled?new PartnerProgram(orderStorage,{secret:process.env.PARTNER_HASH_SECRET}):null;
  const orders=new ShopOrders(orderStorage,{adminIds,partnerSecret:partnerEnabled?process.env.PARTNER_HASH_SECRET:''});
  const payments=new BinanceManualPaymentProvider(paymentConfiguration(process.env),orders,{loadQr:loadLocalPaymentQr});
  const shop=process.env.TELEGRAM_SHOP_ENABLED==='true'?new TelegramShop({api,
    orders,payments,partners,catalog:new SupplierCatalog(),adminIds,
    supportUrl:process.env.TELEGRAM_SHOP_SUPPORT_URL||'',channelUrl:groupUrl,username:identity.username}):null;
  const stateFile = resolve('.catalog-state/telegram-offset.json');
  let offset = 0;
  try { offset = JSON.parse(await readFile(stateFile, 'utf8')).offset || 0; } catch (error) { if (error.code !== 'ENOENT') throw Error('Telegram state could not be read'); }
  if (!Number.isSafeInteger(offset) || offset < 0) throw Error('Invalid Telegram state');
  let stopped = false;
  const controller = new AbortController();
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { stopped = true; controller.abort(); });
  console.log('Atlas Telegram catalog is running. Product commands only; no payments or supplier purchases.');
  while (!stopped) {
    try {
      const updates = await api.call('getUpdates', { offset, timeout: 30, allowed_updates: ['message', 'callback_query'] }, controller.signal);
      for (const update of updates) {
        if (stopped) break;
        // Persist before answering: uncertain sends are not blindly replayed after a crash.
        offset = update.update_id + 1;
        await mkdir(dirname(stateFile), { recursive: true });
        await writeFile(stateFile + '.tmp', JSON.stringify({ offset }), { mode: 0o600 });
        await rename(stateFile + '.tmp', stateFile);
        try { if(!shop||!await shop.handle(update))await bot.handleUpdate(update); } catch { console.error('A shop/catalog reply could not be completed. The request will not be retried automatically.'); }
      }
    } catch (error) {
      if (stopped) break;
      console.error('Telegram polling temporarily unavailable.');
      await delay(Math.max(3000, (error.retryAfter || 0) * 1000), undefined, { signal: controller.signal }).catch(() => {});
    }
  }
} catch { console.error('Telegram catalog could not start. Check the private bot token, sales group, allowed chat IDs and existing webhook.'); process.exitCode = 1; }
