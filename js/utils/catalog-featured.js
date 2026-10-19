import { productFamily } from './catalog-groups.js';

export const FEATURED_FAMILIES = [
  { family: 'ChatGPT & Codex', name: 'ChatGPT', tagline: 'A new perspective on everyday work.', pattern: /chat\s*gpt.*plus|gpt.*plus/i, tone: 'jade' },
  { family: 'Claude', name: 'Claude', tagline: 'Room for deeper thinking.', pattern: /claude.*pro/i, tone: 'clay' },
  { family: 'Google AI & Veo', name: 'Gemini', tagline: 'Explore your next idea.', pattern: /gemini|google.*ai/i, tone: 'blue' },
  { family: 'Canva', name: 'Canva', tagline: 'Give your ideas a visual voice.', pattern: /canva.*pro/i, tone: 'violet' },
  { family: 'Notion', name: 'Notion', tagline: 'Make space for what matters.', pattern: /notion.*plus|notion.*business/i, tone: 'sand' }
];

export function featuredProducts(products) {
  return FEATURED_FAMILIES.map(feature => {
    const candidates = products.filter(p => productFamily(p) === feature.family);
    const priced = candidates.filter(p => Number.isFinite(p.price));
    const preferred = priced.filter(p => feature.pattern.test(p.name));
    const ordered = [...preferred.filter(p => p.stock === 'available'), ...preferred,
      ...priced.filter(p => p.stock === 'available'), ...priced, ...candidates];
    return { ...feature, product: ordered[0] || null, count: candidates.length };
  });
}
