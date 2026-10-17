import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { SupplierCatalog, normalizeProduct } from '../server/catalog.mjs';
import { createAtlasServer } from '../server/http.mjs';
import { filterCatalog, renderCatalog } from '../js/views/catalog.js';
import { catalogGroups, productFamily } from '../js/utils/catalog-groups.js';
import { retailPrice } from '../js/utils/catalog-pricing.js';
import { featuredProducts } from '../js/utils/catalog-featured.js';
import { telegramGroupUrl } from '../server/catalog-settings.mjs';
import {catalogProductLink,catalogShopLink} from '../js/utils/catalog-links.js';
import {shopArtwork,telegramProductImage} from '../js/utils/shop-images.js';

const raw = { productId: 'demo', name: 'Demo product', productType: 'slot',
  description: 'Sample', price: { amount: 12.5, currency: 'USD' }, availability: { available: null } };
test('shop product links preserve selection without arbitrary destinations',()=>{
  assert.equal(catalogProductLink({id:'canva_1'},'https://t.me/atlascrmshop'),'https://t.me/AtlasCrmMarketBot?start=product_canva_1');
  assert.equal(catalogProductLink({id:'bad?key'},'https://t.me/atlascrmshop'),'https://t.me/AtlasCrmMarketBot?start=shop');
  assert.equal(catalogShopLink('https://t.me/atlascrmshop'),'https://t.me/AtlasCrmMarketBot?start=shop');
  assert.equal(catalogProductLink({id:'canva_1'},catalogShopLink('https://t.me/atlascrmshop')),'https://t.me/AtlasCrmMarketBot?start=product_canva_1');
  assert.equal(catalogShopLink('https://t.me/other_shop'),'https://t.me/other_shop');
  assert.equal(shopArtwork('Canva'),'/images/shop/canva.jpg');
  assert.equal(telegramProductImage({name:'Canva Pro'}),'https://atlascrm-c5722.web.app/images/shop/canva.jpg');
  assert.equal(telegramProductImage({name:'Unknown',image:'https://evil.invalid/secret'}),'');
});
test('unknown stock stays unknown and foreign image URLs are removed', () => {
  assert.equal(normalizeProduct(raw).stock, 'unknown');
  assert.equal(normalizeProduct({ ...raw, image: 'javascript:alert(1)' }).image, '');
  assert.equal(normalizeProduct({ ...raw, image: '/uploads/demo.png' }).image, 'https://canboso.com/uploads/demo.png');
  assert.equal(normalizeProduct({ ...raw, availability: { available: 0 } }).stock, 'out');
});
test('cache and concurrent requests produce one read-only upstream request and no key in output', async () => {
  let calls = 0;
  const service = new SupplierCatalog({ key: 'fictional-secret', fetchImpl: async (url, options) => {
    calls++; assert.match(String(url), /telegram-buyer\/products/); assert.equal(options.method, undefined);
    return { ok: true, status: 200, json: async () => ({ success: true, products: [raw], walletCurrency: 'USD' }) };
  }});
  const results = await Promise.all([service.list(), service.list()]);
  await service.list(); assert.equal(calls, 1);
  assert.doesNotMatch(JSON.stringify(results), /fictional-secret/);
});
test('rate limits respect cooldown and unsafe provider errors are sanitized', async () => {
  let calls = 0;
  const service = new SupplierCatalog({ key: 'fictional-secret', now: () => 1000, fetchImpl: async () => {
    calls++; return { status: 429, headers: new Headers({ 'retry-after': '120' }) };
  }});
  await assert.rejects(service.list(), /catalog_rate_limited/);
  await assert.rejects(service.list(), /catalog_temporarily_unavailable/);
  assert.equal(calls, 1);
  const failing = new SupplierCatalog({ key: 'fictional-secret', fetchImpl: async () => { throw Error('URL with fictional-secret'); }});
  await assert.rejects(failing.list(), error => error.message === 'catalog_supplier_unavailable');
});
test('local endpoint denies other origins, writes and private files', async t => {
  const server = createAtlasServer({ catalogService: { list: async () => ({ products: [normalizeProduct(raw)] }) } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(base + '/api/catalog/products')).status, 200);
  const telegramPreview = await (await fetch(base + '/api/catalog/telegram-menu')).json();
  assert.deepEqual(telegramPreview.menu.keyboard.map(row => row.length), [2, 2, 1]);
  assert.ok(telegramPreview.reply_markup.inline_keyboard);
  assert.equal((await fetch(base + '/api/catalog/products', { method: 'POST' })).status, 405);
  assert.equal((await fetch(base + '/api/catalog/products', { headers: { Origin: 'https://untrusted.invalid' } })).status, 403);
  assert.equal((await fetch(base + '/.env')).status, 404);
  assert.equal((await fetch(base + '/.payment-private/binance-pay-receiving.jpg')).status, 404);
  assert.equal((await fetch(base + '/server/payments/config.mjs')).status, 404);
  assert.equal((await fetch(base + '/server/catalog.mjs')).status, 404);
});
test('product filtering uses exact stock states', () => {
  const products = [normalizeProduct(raw), normalizeProduct({ ...raw, name: 'Available', availability: { available: 2 } })];
  assert.equal(filterCatalog(products, { stock: 'available' }).length, 1);
  assert.equal(filterCatalog(products, { search: 'demo', type: 'slot' }).length, 1);
});
test('catalog renders escaped supplier content and applies search without customer data', async () => {
  const { document } = parseHTML('<html><body><div id="view"></div></body></html>');
  const previous = globalThis.document; globalThis.document = document;
  try {
    const malicious = normalizeProduct({ ...raw, name: '<script>alert(1)</script>' });
    const el = document.querySelector('#view');
    await renderCatalog(el, { fetchImpl: async () => ({ ok: true, json: async () => ({ products: [malicious], currency: 'USD', fetchedAt: new Date().toISOString() }) }) });
    el.querySelector('[data-all]').click();
    assert.equal(el.querySelectorAll('script').length, 0);
    assert.match(el.textContent, /Availability unknown/);
    assert.match(el.textContent, /\$13.75/);
    const search = el.querySelector('[data-search]'); search.value = 'no-match';
    search.dispatchEvent(new document.defaultView.Event('input'));
    assert.match(el.textContent, /No matching products/);
  } finally { globalThis.document = previous; }
});

test('retail pricing applies ten percent once with currency rounding', () => {
  assert.equal(retailPrice(10, 'USD'), 11);
  assert.equal(retailPrice(12.5, 'USD'), 13.75);
  assert.equal(retailPrice(0.39, 'USD'), 0.43);
  assert.equal(retailPrice(0.05, 'USD'), 0.06);
  assert.equal(retailPrice(50000, 'VND'), 55000);
  assert.equal(retailPrice(0, 'USD'), 0);
  assert.equal(retailPrice(null), null);
  assert.equal(retailPrice(-1), null);
  assert.equal(normalizeProduct(raw).price, 13.75);
});
test('Telegram destination accepts invite links and rejects credential or script URLs', () => {
  assert.equal(telegramGroupUrl('https://t.me/+test_invite'), 'https://t.me/+test_invite');
  for (const url of ['javascript:alert(1)', 'http://t.me/testshop', 'https://evil.invalid/group', 'https://user:secret@t.me/testshop']) {
    assert.throws(() => telegramGroupUrl(url));
  }
});
test('featured products retain requested order and prefer actual available variants', () => {
  const products = [normalizeProduct({ ...raw, name: 'ChatGPT Plus', availability: { available: 5 } }),
    normalizeProduct({ ...raw, name: 'Claude Pro', availability: { available: 2 } }),
    normalizeProduct({ ...raw, name: 'Gemini Advanced' })];
  const features = featuredProducts(products);
  assert.deepEqual(features.map(f => f.name), ['ChatGPT', 'Claude', 'Gemini', 'Canva', 'Notion']);
  assert.equal(features[0].product.price, 13.75);
  assert.equal(features[3].product, null);
});
test('storefront links to the configured group and displays retail variant price', async () => {
  const { document } = parseHTML('<html><body><div id="view"></div></body></html>');
  const previous = globalThis.document; globalThis.document = document;
  try {
    const el = document.querySelector('#view');
    await renderCatalog(el, { fetchImpl: async () => ({ ok: true, json: async () => ({ products: [normalizeProduct({ ...raw, name: 'Canva Pro' })],
      currency: 'USD', fetchedAt: new Date().toISOString(), storefront: { telegramUrl: 'https://t.me/+test_invite' } }) }) });
    el.querySelector('[data-all]').click();
    assert.equal(el.querySelector('a.catalog-telegram').getAttribute('href'), 'https://t.me/+test_invite');
    assert.match(el.querySelector('.catalog-price').textContent, /\$13.75/);
    assert.equal(el.querySelectorAll('.market-feature-card').length, 5);
    assert.equal(el.querySelector('[data-market-branding] h1').textContent, 'Big ideas.Better tools.');
  } finally { globalThis.document = previous; }
});

test('family grouping uses names, retains all variants and keeps currencies separate', () => {
  const products = [
    normalizeProduct({ ...raw, name: 'ChatGPT Plus 1 month' }),
    normalizeProduct({ ...raw, name: 'GPT GO', price: { amount: 50000, currency: 'VND' } }),
    normalizeProduct({ ...raw, name: 'Canva Pro slot' }),
    normalizeProduct({ ...raw, name: 'Unknown brand' })
  ];
  assert.equal(productFamily(products[0]), 'ChatGPT & Codex');
  assert.equal(productFamily(products[1]), 'ChatGPT & Codex');
  const groups = catalogGroups(products);
  assert.equal(groups.reduce((count, group) => count + group.products.length, 0), 4);
  assert.equal(groups.find(g => g.name === 'ChatGPT & Codex').priceRanges.length, 2);
  assert.equal(groups.at(-1).name, 'Other products');
});
test('group detail shows only its variants and full catalog remains accessible', async () => {
  const { document } = parseHTML('<html><body><div id="view"></div></body></html>');
  const previous = globalThis.document; globalThis.document = document;
  try {
    const products = [normalizeProduct({ ...raw, name: 'Canva Pro', image: '/uploads/canva.png' }), normalizeProduct({ ...raw, name: 'Canva Education' }), normalizeProduct({ ...raw, name: 'Notion Plus' })];
    const el = document.querySelector('#view');
    await renderCatalog(el, { fetchImpl: async () => ({ ok: true, json: async () => ({ products, currency: 'USD', fetchedAt: new Date().toISOString() }) }) });
    assert.equal(el.querySelectorAll('[data-family]').length, 2);
    const image = el.querySelector('.catalog-family-art img');
    assert.equal(image.getAttribute('src'), 'https://canboso.com/uploads/canva.png');
    assert.equal(image.getAttribute('alt'), 'Canva');
    image.onerror();
    assert.equal(image.src, '/images/shop/canva.jpg');
    image.onerror();
    assert.equal(el.querySelector('.catalog-family-art .catalog-monogram').textContent, 'CA');
    el.querySelector('[data-family="Canva"]').click();
    assert.equal(el.querySelector('[data-heading]').textContent, 'Canva');
    assert.equal(el.querySelectorAll('.catalog-product').length, 2);
    assert.equal(el.querySelectorAll('details').length, 2);
    el.querySelector('[data-groups]').click();
    assert.equal(el.querySelectorAll('[data-family]').length, 2);
    el.querySelector('[data-all]').click();
    assert.equal(el.querySelectorAll('.catalog-product').length, 3);
  } finally { globalThis.document = previous; }
});
