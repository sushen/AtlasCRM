import { TelegramShop, QUICK_ADD_URL, ADMIN_SHOP_COMMANDS, MANUAL_CHECKOUT_COMMANDS, MANUAL_CHECKOUT_ADMIN_COMMANDS } from './telegram-shop.mjs';
import { groupMenu } from './telegram-catalog.mjs';
import { catalogGroups } from '../js/utils/catalog-groups.js';
import { ManualCheckoutConversation } from './telegram-manual-checkout.mjs';
import { ShopOrders } from './shop-orders.mjs';
import { telegramEscape as esc } from './telegram-presentation.mjs';
import {readableProductCard} from './telegram-shop-layout.mjs';

const BOT_URL = 'https://t.me/AtlasCrmSandboxBot';
const banner = '🧪 ATLAS TEST · No real payment or delivery\n\n';
export const SANDBOX_COMMANDS = [...ADMIN_SHOP_COMMANDS,...MANUAL_CHECKOUT_COMMANDS,...MANUAL_CHECKOUT_ADMIN_COMMANDS,
  {command:'warranty',description:'Product warranty and terms'}];
export const sandboxOfferLabel = product => `${product.currency} ${product.price ?? '?'} · ${product.name}`;

export function sandboxProductMenu(products, supplierUnavailable = false) {
  const categoryCount = catalogGroups(products).length;
  const rows = [];
  for (let page = 0; page < Math.ceil(categoryCount / 24); page++) {
    const buttons = groupMenu(products,page).reply_markup.inline_keyboard.flat().filter(b => b.callback_data?.startsWith('family:'));
    for (let i=0;i<buttons.length;i+=3) rows.push(buttons.slice(i,i+3));
  }
  const own = products.filter(p => p.id.startsWith('own_'));
  for (const product of own) rows.push([{text:sandboxOfferLabel(product).slice(0,100),callback_data:'product:'+product.id}]);
  return {parse_mode:'HTML',text:`<b>🛍 Products</b>\n\n${products.length} current listings · ${categoryCount} categories\nChoose a category below. Your Atlas offers are listed directly after the categories.\n${supplierUnavailable?'Supplier feed unavailable; only Firebase offers are shown.\n':''}\n${own.length?'<b>Atlas offers</b>\n'+own.map(p=>esc(sandboxOfferLabel(p))).join('\n'):''}`,reply_markup:{inline_keyboard:rows}};
}

export function sandboxProduct(product) {
  if (product.active !== true || typeof product.name !== 'string' || !/^[A-Za-z0-9_-]{1,40}$/.test(product.id || '')) return null;
  return { id: 'own_' + product.id, name: product.name.slice(0,150), price: typeof product.price === 'number' && Number.isFinite(product.price) && product.price >= 0 ? product.price : null,
    currency: /^[A-Z]{3}$/.test(product.currency || '') ? product.currency : '',
    description: 'Atlas-owned offer.' + (Number.isSafeInteger(product.durationDays) && product.durationDays > 0 ? ` Subscription term: ${product.durationDays} day(s).` : '') + ' Supplier fulfillment is arranged separately; no purchased stock is implied.',
    type: 'other', stock: 'unknown', available: null, sold: null, durationDays:product.durationDays, promotions: [], requirements: {}, image: '' };
}

export class SandboxCatalog {
  constructor({ supplierCatalog, listProducts }) { Object.assign(this, { supplierCatalog, listProducts }); }
  async ownProducts() { return (await this.listProducts()).map(sandboxProduct).filter(Boolean); }
  async list() {
    // Failure of a supplier must not hide an operator's actual Firebase offers.
    const [supplier, own] = await Promise.allSettled([this.supplierCatalog.list(), this.ownProducts()]);
    if (own.status !== 'fulfilled') throw Error('Firebase catalog unavailable');
    const result = supplier.status === 'fulfilled' ? supplier.value : { products: [], fetchedAt: new Date().toISOString() };
    return { ...result, products: [...result.products, ...own.value], supplierUnavailable: supplier.status !== 'fulfilled' };
  }
  async verifyStock(product) {
    if (!product) throw Error('Product unavailable');
    if (product.id.startsWith('own_')) {
      const current = (await this.ownProducts()).find(p => p.id === product.id);
      if (!current || current.price !== product.price || current.currency !== product.currency) throw Error('Offer changed');
    } else if (this.supplierCatalog.verifyStock) await this.supplierCatalog.verifyStock(product);
  }
}

class TestPaymentProvider {
  constructor(orders) { this.orders = orders; this.enabled = true; }
  quote(product) {
    if (!Number.isFinite(product.price) || product.price <= 0 || !/^[A-Z]{3,8}$/.test(product.currency)) throw Error('Invalid test quote');
    return { provider: 'binance_pay', mode: 'manual', quantity: 1, sourceCurrency: product.currency, sourceUnitPrice: product.price,
      unitPrice: product.price, totalAmount: product.price, currency: product.currency, decimals: 2,
      receivingUid: 'TEST-NOT-PAYABLE', receivingName: 'SANDBOX ONLY — DO NOT PAY', verificationMode: 'admin_manual', deliveryMode: 'admin_manual' };
  }
  async createPaymentInstructions() { return { photo: null, paymentLink: null }; }
  submitPaymentReference(id,buyer,reference,evidence) { return this.orders.submitReference(id,buyer,reference,{evidence}); }
  verifyPayment(id,admin,decision,note,expectedVersion) { return this.orders.review(id,admin,decision,note,{expectedVersion}); }
}

export function createSandboxShop({ api, supplierCatalog, listProducts, storage, operatorIds }) {
  const operators = new Set(operatorIds.map(String));
  if (!operators.size || [...operators].some(id => !/^[1-9]\d*$/.test(id))) throw Error('Private operator allowlist required');
  const catalog = new SandboxCatalog({ supplierCatalog, listProducts });
  // Guard all outbound destinations as well as incoming requests; no live customer can be notified.
  const safeApi = { call: async (method, data = {}) => {
    if (!['sendMessage','editMessageText','sendPhoto','answerCallbackQuery'].includes(method)) throw Error('Sandbox method denied');
    if (method !== 'answerCallbackQuery' && !operators.has(String(data.chat_id))) throw Error('Sandbox destination denied');
    const value = structuredClone(data);
    for (const field of ['text','caption']) if (typeof value[field] === 'string') value[field] = banner + value[field];
    // General navigation belongs to Telegram's collapsible Menu, not a keyboard
    // that takes space away from product descriptions and the conversation.
    if (value.reply_markup?.keyboard) value.reply_markup = {remove_keyboard:true};
    for (const row of value.reply_markup?.inline_keyboard || []) for (const button of row) {
      if (button.url === QUICK_ADD_URL) button.url = 'http://localhost:3199/?quick-add=1';
      if (button.text === 'Pay with Binance') button.text = 'Preview test payment step';
      if (button.text === 'I Have Paid') button.text = 'Submit test reference';
    }
    if (value.text?.includes('Add lead in Atlas CRM.')) value.text += '\nLocal CRM uses real shared Firebase records; deliberate saves are real.';
    if (method !== 'answerCallbackQuery') value.protect_content = true;
    return api.call(method, value);
  }};
  const orders = new ShopOrders(storage, { adminIds: operatorIds });
  const payments = new TestPaymentProvider(orders);
  const shop = new TelegramShop({ api: safeApi, orders, catalog, adminIds: operatorIds, supportUrl: BOT_URL, channelUrl: BOT_URL, username: 'AtlasCrmSandboxBot' });
  shop.detail = readableProductCard;
  const checkout = new ManualCheckoutConversation({ api: safeApi, orders, catalog, payments, adminIds: operatorIds, supportUrl: BOT_URL,
    presentation: {
      instructionText: order => `<b>Test checkout · do not send money</b>\n\n${esc(order.product.name)}\nTest quote: ${esc(order.currency)} ${order.totalAmount.toFixed(2)}\nOrder: <code>${esc(order.id)}</code>\n\nNo payment account, QR or transfer link is connected. Use Submit test reference to exercise review with a made-up reference.`,
      referencePrompt: order => `Enter a made-up test reference for order ${esc(order.id)}. Do not make a payment or provide a real transaction reference.`,
      referencePlaceholder:'Enter a made-up test reference'
    } });
  checkout.instructionRows = order => checkout.checkoutButtons(order);
  shop.checkout = checkout;
  return { catalog, orders, async handle(update) {
    const callback = update.callback_query, message = callback?.message || update.message, actor = callback?.from || message?.from;
    if (!message || message.chat?.type !== 'private' || String(message.chat.id) !== String(actor?.id) || actor?.is_bot || !operators.has(String(actor?.id))) return false;
    // The shared checkout parser historically targets the live username. Normalize only after validating this test identity.
    if (message.text?.match(/\/[a-z]+@/i)) {
      if (!/\/[a-z]+@AtlasCrmSandboxBot(?:\s|$)/i.test(message.text)) return false;
      update = structuredClone(update);
      const target = update.callback_query?.message || update.message;
      target.text = target.text.replace(/@AtlasCrmSandboxBot(?=\s|$)/i, '');
    }
    const navigation = /^sandbox:nav:(profile|history|addlead|orders)$/.exec(callback?.data || '');
    if (navigation) {
      await safeApi.call('answerCallbackQuery',{callback_query_id:callback.id});
      return shop.handle({update_id:update.update_id,message:{...message,from:actor,text:'/'+navigation[1]}});
    }
    const currentText = (update.callback_query?.message || update.message)?.text || '';
    if (/^\/(menu|products|start)\s*$/i.test(currentText) || ['🛍 Products','🛒 Buy','🏷 Atlas offers'].includes(currentText) || /^groups:\d+$/.test(callback?.data || '') || callback?.data?.startsWith('sandbox:page:')) {
      if (callback) await safeApi.call('answerCallbackQuery', {callback_query_id:callback.id});
      if (!callback) await safeApi.call('sendMessage',{chat_id:message.chat.id,text:'Use Telegram’s Menu button for Products, Profile, Purchase history, Support and Warranty. Products includes supplier listings and your own offers.',reply_markup:{remove_keyboard:true}});
      try {
        const result = await catalog.list();
        return safeApi.call('sendMessage',{chat_id:message.chat.id,...sandboxProductMenu(result.products,result.supplierUnavailable)});
      } catch { return safeApi.call('sendMessage',{chat_id:message.chat.id,text:'Products are temporarily unavailable. Use /products to retry.'}); }
    }
    const handled = await shop.handle(update);
    if (!handled) await safeApi.call('sendMessage',{chat_id:message.chat.id,text:'Use /menu to open the full test shop. All order actions here affect only sandbox records.'});
    return true;
  }};
}
