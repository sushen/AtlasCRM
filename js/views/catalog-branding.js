import { featuredProducts } from '../utils/catalog-featured.js';
import { productBrandImage } from '../utils/catalog-groups.js';
import { formatCatalogPrice } from '../utils/catalog-pricing.js';
import { shopArtwork } from '../utils/shop-images.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function brandedCatalogHero(products) {
  const features = featuredProducts(products);
  return `<section class="market-hero" aria-label="Featured products"><div class="market-hero-copy"><div class="market-kicker"><span></span> YOUR DIGITAL TOOLKIT, REIMAGINED</div>
    <h1>Big ideas.<br>Better <em>tools.</em></h1><p>A considered collection of digital products for the way you create, think and work. Find your fit. Continue the conversation on Telegram.</p>
    <div class="market-hero-actions"><button class="market-button cream" data-browse>Explore the collection <span aria-hidden="true">↗</span></button><a class="market-text-link" data-telegram-action aria-disabled="true">Open the Telegram shop <span aria-hidden="true">↗</span></a></div>
    <div class="market-hero-foot"><span>01 / DISCOVER</span><span>02 / COMPARE</span><span>03 / CONNECT</span></div></div>
    <div class="market-hero-visual" aria-hidden="true"><div class="market-orbit orbit-one"></div><div class="market-orbit orbit-two"></div><div class="market-orbit orbit-three"></div><div class="market-orbit-core"><img src="/images/brand/atlas-logo.jpg" alt="" width="220" height="220"><span>THE ATLAS COLLECTION</span></div>
      ${features.map((f, index) => `<div class="market-floating float-${index}"><img src="${esc(productBrandImage(f.family))}" alt="" referrerpolicy="no-referrer"><span>${esc(f.name)}</span></div>`).join('')}</div></section>
    <div class="market-trust-strip"><span><i aria-hidden="true">✧</i> A collection for every workflow</span><span><i aria-hidden="true">◈</i> Clear prices, current availability</span><span><i aria-hidden="true">↗</i> Continue on Telegram</span></div>
    <section class="market-featured" aria-labelledby="market-featured-title"><div class="market-section-title"><div><span class="market-eyebrow">THE SHORTLIST</span><h2 id="market-featured-title">Five places to begin.</h2></div><div class="market-carousel-controls"><button aria-label="Previous featured products" data-featured-prev>←</button><button aria-label="Next featured products" data-featured-next>→</button></div></div>
    <div class="market-featured-rail" data-featured-rail>${features.map((f, index) => `<article class="market-feature-card tone-${f.tone}"><div class="market-feature-top"><span>0${index + 1}</span><img src="${esc(productBrandImage(f.family))}" alt="${esc(f.name)} logo" loading="lazy" referrerpolicy="no-referrer"></div><h3>${esc(f.name)}</h3><p class="market-feature-tagline">${esc(f.tagline)}</p>
      ${f.product ? `<div class="market-feature-art"><img src="${esc(f.product.image||shopArtwork(f.family)||productBrandImage(f.family))}" data-art-fallback="${esc(shopArtwork(f.family))}" alt="${esc(f.product.name)}" loading="lazy" referrerpolicy="no-referrer"></div><div class="market-feature-variant">${esc(f.product.name)}</div><div class="market-feature-price">${esc(formatCatalogPrice(f.product))}<small>${f.product.stock === 'available' ? 'In stock' : f.product.stock === 'out' ? 'Out of stock' : 'Confirm availability'}</small></div>` : '<div class="market-feature-variant">Explore the collection when available.</div>'}
      <button data-featured-family="${esc(f.family)}" ${f.count ? '' : 'disabled'}>Explore ${esc(f.name)} <span aria-hidden="true">↗</span></button></article>`).join('')}</div></section>`;
}

export function bindCatalogBranding(container, navigate) {
  const browse = () => container.parentElement.querySelector('[data-catalog-browser]')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  container.querySelector('[data-browse]').onclick = browse;
  container.querySelectorAll('[data-featured-family]').forEach(button => { button.onclick = () => navigate('family', button.dataset.featuredFamily); });
  const rail = container.querySelector('[data-featured-rail]');
  container.querySelector('[data-featured-prev]').onclick = () => rail.scrollBy?.({ left: -340, behavior: 'smooth' });
  container.querySelector('[data-featured-next]').onclick = () => rail.scrollBy?.({ left: 340, behavior: 'smooth' });
  container.querySelectorAll('img').forEach(image => { image.onerror = () => {if(image.dataset.artFallback){image.src=image.dataset.artFallback;image.dataset.artFallback='';}else image.hidden=true;}; });
  if (typeof window === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return () => {};
  const timer = setInterval(() => {
    if (!rail.isConnected) { clearInterval(timer); return; }
    if (document.hidden || rail.matches(':hover') || rail.contains(document.activeElement)) return;
    const end = rail.scrollWidth - rail.clientWidth;
    if (end <= 0) return;
    if (rail.scrollLeft >= end - 5) rail.scrollTo({ left: 0, behavior: 'smooth' });
    else rail.scrollBy({ left: 330, behavior: 'smooth' });
  }, 6000);
  return () => clearInterval(timer);
}
