import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { initializeApp, applicationDefault, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { prepareLocalFirebase } from './local-firebase.mjs';
import { TelegramApi } from './telegram-catalog.mjs';
import { createSandboxShop, SANDBOX_COMMANDS } from './telegram-sandbox-shop.mjs';
import { SupplierCatalog } from './catalog.mjs';
import { ShopFileStorage } from './shop-file-storage.mjs';

let app, cleanup, phase = 'test identity';
const controller = new AbortController();
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => controller.abort());
try {
  const token = process.env.TELEGRAM_TEST_BOT_TOKEN;
  if (!token || token === process.env.TELEGRAM_BOT_TOKEN) throw Error('Separate test token required');
  const api = new TelegramApi(token);
  const identity = await api.call('getMe');
  if (identity.username !== 'AtlasCrmSandboxBot') throw Error('Unexpected bot identity');
  if ((await api.call('getWebhookInfo')).url) throw Error('Test bot already has a webhook');
  phase = 'Firebase connection';
  cleanup = await prepareLocalFirebase('atlascrm-c5722');
  app = initializeApp({ credential: applicationDefault(), projectId: 'atlascrm-c5722' }, 'telegram-sandbox');
  const db = getFirestore(app);
  const listProducts = async () => (await db.collection('products').where('active', '==', true).select('name', 'price', 'currency', 'durationDays', 'active').get()).docs.map(doc => ({...doc.data(),id:doc.id}));
  const operatorIds = (process.env.TELEGRAM_SHOP_ADMIN_IDS || '').split(',').map(id => id.trim()).filter(Boolean);
  const bot = createSandboxShop({ api, listProducts, operatorIds, supplierCatalog:new SupplierCatalog(), storage:new ShopFileStorage(resolve('.worker-private/telegram-test-orders.json')) });
  if (process.argv.includes('--check')) {
    const products = await listProducts();
    const catalog = await bot.catalog.list();
    console.log(JSON.stringify({ testBotVerified: true, firebaseReadVerified: true, activeProducts: products.length, combinedCatalogProducts:catalog.products.length,supplierAvailable:!catalog.supplierUnavailable,
      requestedOfferVerified: products.some(p => p.id === 'atlas_one_day_one_usd' && p.name === 'ChatGPT — 1 day' && p.price === 1 && p.currency === 'USD' && p.durationDays === 1) }));
  } else {
    const state = resolve('.worker-private/telegram-test-offset.json');
    let offset = 0;
    try { offset = JSON.parse(await readFile(state, 'utf8')).offset; }
    catch (error) { if (error.code !== 'ENOENT') throw Error('Invalid test polling state'); }
    if (!Number.isSafeInteger(offset) || offset < 0) throw Error('Invalid test polling offset');
    phase = 'private command menu';
    for (const chatId of operatorIds) {
      try {
        const commands=SANDBOX_COMMANDS;
        const scope={type:'chat',chat_id:Number(chatId)};
        await api.call('setMyCommands',{scope,commands});
        await api.call('setChatMenuButton',{chat_id:Number(chatId),menu_button:{type:'commands'}});
        if ((await api.call('getMyCommands',{scope})).length !== commands.length || (await api.call('getChatMenuButton',{chat_id:Number(chatId)})).type !== 'commands') throw Error('Menu verification failed');
        console.log('Operator command menu and phone menu button verified.');
      }
      catch { console.error('Private command shortcuts unavailable for an operator; typed commands remain available.'); }
    }
    phase = 'test polling';
    console.log('Atlas Test running: full private shop, real catalog, isolated test orders, no real payments.');
    while (!controller.signal.aborted) {
      try {
        const updates = await api.call('getUpdates', { offset, timeout: 25, allowed_updates: ['message', 'callback_query'] }, controller.signal);
        for (const update of updates) {
          if (controller.signal.aborted) break;
          offset = update.update_id + 1;
          await mkdir(dirname(state), { recursive: true });
          await writeFile(state + '.tmp', JSON.stringify({ offset }), { mode: 0o600 });
          await rename(state + '.tmp', state);
          try { await bot.handle(update); } catch { console.error('A sandbox reply failed; it will not be replayed automatically.'); }
        }
      } catch (error) {
        if (controller.signal.aborted) break;
        if (error.code === 409) throw Error('Another sandbox poller is active');
        console.error('Sandbox polling temporarily unavailable.');
        await delay(Math.max(3000, (error.retryAfter || 0) * 1000), undefined, { signal: controller.signal }).catch(() => {});
      }
    }
  }
} catch { console.error(`Atlas Test stopped during ${phase}. Check the private configuration or retry after a connection failure.`); process.exitCode = 1; }
finally { if (app) await deleteApp(app); cleanup?.(); }
