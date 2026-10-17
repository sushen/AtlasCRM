import { catalogGroups, productFamily, productBrandImage } from '../utils/catalog-groups.js';
import { formatCatalogPrice } from '../utils/catalog-pricing.js';
import { brandedCatalogHero, bindCatalogBranding } from './catalog-branding.js?v=20261014-shop-ui';
import { catalogFetch } from '../services/catalog-api.js';
import { catalogProductLink, catalogShopLink } from '../utils/catalog-links.js';
import { shopArtwork } from '../utils/shop-images.js';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const typeLabel = type => ({ account: 'Account', slot: 'Team slot', upgrade_account: 'Account upgrade', other: 'Other' }[type]);
const imageMarkup = (image, name, family = productFamily({ name })) => {
  const initials = Array.from(name).slice(0, 2).join('').toUpperCase();
  const logo = productBrandImage(family);
  const art=shopArtwork(family);
  const source = image || art || logo;
  return source ? `<img src="${esc(source)}" alt="${esc(name)}" loading="lazy" referrerpolicy="no-referrer" data-brand-image="${esc(image ? art||logo : art ? logo : '')}" data-image-fallback="${esc(initials)}">`
    : `<span class="catalog-monogram">${esc(initials)}</span>`;
};
const bindImageFallbacks = grid => grid.querySelectorAll('img').forEach(img => {
  img.onerror = () => {
    if (img.dataset.brandImage) {
      const logo = img.dataset.brandImage; img.dataset.brandImage = ''; img.src = logo;
      img.title = 'Product brand logo'; return;
    }
    const fallback = document.createElement('span');
    fallback.className = 'catalog-monogram'; fallback.textContent = img.dataset.imageFallback;
    fallback.title = 'Supplier image unavailable'; img.replaceWith(fallback);
  };
});
export function catalogPrice(product) {
  return formatCatalogPrice(product);
}
export function filterCatalog(products, { search = '', type = '', stock = '' } = {}) {
  const query = search.trim().toLowerCase();
  return products.filter(p => (!query || (p.name + ' ' + p.description).toLowerCase().includes(query))
    && (!type || p.type === type) && (!stock || p.stock === stock));
}
export async function renderCatalog(el, { fetchImpl = catalogFetch } = {}) {
  el.innerHTML = `<div data-market-branding>${brandedCatalogHero([])}</div><section data-catalog-browser id="catalog-browser"><div class="page-heading"><div><span class="catalog-eyebrow">THE COLLECTION</span><h2 data-heading>Explore product groups</h2><p class="muted" data-intro>Choose a product family to compare its plans and variants.</p></div><button class="button" data-reload>Refresh catalog</button></div>
    <div class="catalog-navigation"><button class="button primary" data-groups>Product groups</button><button class="button" data-all>Full catalog</button><span class="muted small" data-breadcrumb>Product groups</span></div>
    <div class="catalog-quick-filters" aria-label="Quick catalog filters"><button class="button" data-stock-shortcut="available">In stock only</button><button class="button" data-stock-shortcut="">All availability</button><button class="button" data-reset>Clear filters</button><label>Sort by<select data-sort><option value="recommended">Recommended</option><option value="name">Name A–Z</option><option value="price">Price: low to high</option></select></label></div>
    <div class="catalog-summary" data-summary></div><p class="catalog-note" data-stale-notice hidden>Showing a saved catalog while the supplier refresh is unavailable. Confirm price and stock with admin before ordering.</p>
    <div class="card catalog-filters"><label>Search products<input type="search" data-search placeholder="Search names or descriptions"></label>
    <label>Product type<select data-type><option value="">All types</option><option value="account">Accounts</option><option value="slot">Team slots</option><option value="upgrade_account">Account upgrades</option></select></label>
    <label>Availability<select data-stock><option value="">All availability</option><option value="available">In stock</option><option value="out">Out of stock</option><option value="unknown">Availability unknown</option></select></label></div>
    <p class="muted small" data-status role="status" aria-live="polite">Loading supplier catalog…</p><div class="catalog-grid" data-grid></div>
    <p class="muted small catalog-disclaimer">Prices shown are our retail prices. Availability can change; unspecified stock is not a guarantee. Confirm your chosen product with us on Telegram.</p></section>`;
  const grid = el.querySelector('[data-grid]'); const status = el.querySelector('[data-status]');
  const button = el.querySelector('[data-reload]'); let products = []; let shown = 0;
  let mode = 'groups'; let family = '';
  let telegramUrl = '';
  let clearBranding = () => {};
  const telegramLink = product => telegramUrl
    ? `<a class="catalog-telegram" href="${esc(catalogProductLink(product,telegramUrl))}" target="_blank" rel="noopener noreferrer">${product?.stock === 'out' ? 'View listing & ask about stock' : 'View & order in Telegram'} <span aria-hidden="true">↗</span></a>`
    : '<span class="catalog-telegram disabled" aria-disabled="true">Telegram coming soon</span>';
  const navigate = (nextMode, nextFamily = '') => {
    mode = nextMode; family = nextFamily; shown = 30;
    el.querySelector('[data-search]').value = '';
    for (const selector of ['[data-type]', '[data-stock]']) {
      el.querySelector(selector).querySelectorAll('option').forEach(option => { option.selected = option.value === ''; });
    }
    render();
    el.querySelector('[data-catalog-browser]').scrollIntoView?.({ block: 'start' });
  };
  el.querySelector('[data-groups]').onclick = () => navigate('groups');
  el.querySelector('[data-all]').onclick = () => navigate('all');
  const render = () => {
    const source = family ? products.filter(p => productFamily(p) === family) : products;
    const matches = filterCatalog(source, { search: el.querySelector('[data-search]').value,
      type: el.querySelector('[data-type]').value, stock: el.querySelector('[data-stock]').value });
    const sort=el.querySelector('[data-sort]').value;
    if(sort==='name')matches.sort((a,b)=>a.name.localeCompare(b.name));
    if(sort==='price')matches.sort((a,b)=>a.currency.localeCompare(b.currency)||(a.price??Infinity)-(b.price??Infinity));
    if(sort==='recommended')matches.sort((a,b)=>({available:0,unknown:1,out:2}[a.stock]-{available:0,unknown:1,out:2}[b.stock]));
    el.querySelector('[data-heading]').textContent = mode === 'groups' ? 'Explore product groups' : family || 'Full product catalog';
    el.querySelector('[data-intro]').textContent = mode === 'groups' ? 'Choose a product family to compare its plans and variants.' : family ? 'Compare prices, stock and requirements across this product’s variants.' : 'Browse every supplier listing in one place.';
    el.querySelector('[data-breadcrumb]').textContent = family ? 'Product groups / ' + family : mode === 'groups' ? 'Product groups' : 'Full catalog';
    el.querySelector('[data-groups]').classList.toggle('primary', mode === 'groups');
    el.querySelector('[data-all]').classList.toggle('primary', mode === 'all');
    if (mode === 'groups') {
      const groups = catalogGroups(matches);
      if(sort==='recommended')groups.sort((a,b)=>b.available-a.available);
      if(sort==='price')groups.sort((a,b)=>{
        const left=[...a.priceRanges].sort((x,y)=>x.currency.localeCompare(y.currency))[0];
        const right=[...b.priceRanges].sort((x,y)=>x.currency.localeCompare(y.currency))[0];
        return (left?.currency||'~').localeCompare(right?.currency||'~')||(left?.min??Infinity)-(right?.min??Infinity);
      });
      status.textContent = `${groups.length} product groups · ${matches.length} matching variants`;
      grid.innerHTML = groups.map(group => {
        const range = group.priceRanges.map(price => catalogPrice({ price: price.min, currency: price.currency })
          + (price.min !== price.max ? ' – ' + catalogPrice({ price: price.max, currency: price.currency }) : '')).join(' · ') || 'Prices unavailable';
        return `<article class="card catalog-family"><div class="catalog-family-art">${imageMarkup(group.image, group.name, group.name)}</div><span class="catalog-type">PRODUCT FAMILY</span>
          <h2>${esc(group.name)}</h2><p class="muted">${group.products.length} variants · ${group.available} in stock</p>
          <div class="catalog-family-range">${esc(range)}</div><p class="muted small">${group.unknown} variants with unspecified stock</p>
          <button class="button" data-family="${esc(group.name)}">Explore ${esc(group.name)}</button></article>`;
      }).join('') || '<div class="card card-pad"><h2>No matching groups</h2><p class="muted">Try another search or filter.</p></div>';
      grid.querySelectorAll('[data-family]').forEach(button => { button.onclick = () => navigate('family', button.dataset.family); });
      bindImageFallbacks(grid);
      return;
    }
    const visible = matches.slice(0, shown);
    status.textContent = `${matches.length} matching products · showing ${visible.length}`;
    grid.innerHTML = visible.map(p => {
      const stock = p.stock === 'available' ? `${p.available} in stock` : p.stock === 'out' ? 'Out of stock' : 'Availability unknown';
      const requirements = [p.requirements.email ? 'Customer email required' : '', p.requirements.accounts ? 'Account details required' : '', p.requirements.months ? 'Duration required' : ''].filter(Boolean);
      return `<article class="card catalog-product"><div class="catalog-art">${imageMarkup(p.image, p.name)}</div>
      <div class="catalog-product-body"><div class="catalog-meta"><span class="catalog-type">${esc(typeLabel(p.type))}</span><span class="catalog-stock ${esc(p.stock)}">${esc(stock)}</span></div>
      <h2>${esc(p.name)}</h2><p class="catalog-description">${esc(p.description || 'No description provided.')}</p>
      <details class="catalog-details"><summary>Product details</summary><p>${esc(p.description || 'No description provided.')}</p>${p.requirements.allowedMonths.length ? '<p>Available durations: ' + esc(p.requirements.allowedMonths.join(', ')) + ' months</p>' : ''}</details>
      <div class="catalog-price">${esc(catalogPrice(p))}<span>retail price</span></div>
      ${p.promotions.length ? '<div class="catalog-note">' + p.promotions.map(promo => esc(promo.percent !== null ? `${promo.percent}% discount from ${promo.minQty ?? '?'} units` : promo.bonusQty !== null ? `${promo.bonusQty} bonus units from ${promo.minQty ?? '?'} units` : 'Promotion available')).join(' · ') + '</div>' : ''}
      ${requirements.length ? '<div class="catalog-note">' + esc(requirements.join(' · ')) + '</div>' : ''}
      ${telegramLink(p)}<div class="catalog-product-code">Product reference: ${esc(p.id)}</div></div></article>`;
    }).join('') || '<div class="card card-pad"><h2>No matching products</h2><p class="muted">Try another search or use Clear filters to see the collection.</p></div>';
    bindImageFallbacks(grid);
    if (matches.length > shown) {
      const more = document.createElement('button'); more.className = 'button catalog-more'; more.textContent = 'Show more products';
      more.onclick = () => { shown += 30; render(); }; grid.append(more);
    }
  };
  el.querySelector('[data-sort]').addEventListener('change',()=>{shown=30;render();});
  el.querySelectorAll('[data-stock-shortcut]').forEach(button=>button.onclick=()=>{
    const value=button.dataset.stockShortcut;
    el.querySelector('[data-stock]').querySelectorAll('option').forEach(option=>{option.selected=option.value===value;});shown=30;render();
  });
  el.querySelector('[data-reset]').onclick=()=>{
    el.querySelector('[data-search]').value='';
    for(const selector of ['[data-type]','[data-stock]'])el.querySelector(selector).querySelectorAll('option').forEach(option=>{option.selected=option.value==='';});
    shown=30;render();
  };
  for (const selector of ['[data-search]', '[data-type]', '[data-stock]']) el.querySelector(selector).addEventListener('input', () => { shown = 30; render(); });
  const load = async () => {
    button.disabled = true; status.textContent = 'Loading supplier catalog…';
    try {
      const response = await fetchImpl('/api/catalog/products', { headers: { Accept: 'application/json' } });
      if (!response.ok) throw Error('catalog_unavailable');
      const body = await response.json(); products = body.products; shown = 30;
      el.querySelector('[data-stale-notice]').hidden=!body.stale;
      const providedUrl = body.storefront?.telegramUrl || '';
      telegramUrl = /^https:\/\/(?:t\.me|telegram\.me)\/(?:[a-zA-Z][a-zA-Z0-9_]{4,31}|\+[a-zA-Z0-9_-]+|joinchat\/[a-zA-Z0-9_-]+)\/?$/.test(providedUrl) ? providedUrl : '';
      const branding = el.querySelector('[data-market-branding]');
      clearBranding(); branding.innerHTML = brandedCatalogHero(products);
      clearBranding = bindCatalogBranding(branding, navigate);
      const scope = el.closest('.market-shell') || el;
      scope.querySelectorAll('[data-telegram-action]').forEach(link => {
        if (telegramUrl) { link.href = catalogShopLink(telegramUrl); link.target = '_blank'; link.rel = 'noopener noreferrer'; link.removeAttribute('aria-disabled'); }
        else { link.removeAttribute('href'); link.setAttribute('aria-disabled', 'true'); }
      });
      el.querySelector('[data-summary]').innerHTML = `<div><strong>${products.length}</strong><span>Catalog products</span></div><div><strong>${products.filter(p => p.stock === 'available').length}</strong><span>In stock</span></div><div><strong>${products.filter(p => p.stock === 'unknown').length}</strong><span>Stock unspecified</span></div><div><strong>${esc(body.currency || 'Mixed')}</strong><span>Display currency</span></div>`;
      render(); status.textContent += body.stale?' · Showing a saved catalog while the supplier refresh is unavailable. Confirm price and stock with admin.':` · updated ${new Date(body.fetchedAt).toLocaleTimeString()}`;
    } catch { status.textContent = 'Catalog temporarily unavailable. Please refresh later or contact support.'; }
    finally { button.disabled = false; }
  };
  button.onclick = load; await load();
}
