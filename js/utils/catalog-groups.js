// Local name-based organization, not supplier-provided categories.
const families = [
  ['ChatGPT & Codex', /chat\s*gpt|\bgpt\b|codex|openai/i],
  ['Claude', /claude/i], ['Canva', /canva/i], ['Notion', /notion/i],
  ['ElevenLabs', /eleven|elevan/i], ['CapCut', /capcut/i],
  ['Microsoft & Windows', /microsoft|\bms365\b|office\s*\d*|windows/i],
  ['YouTube', /youtube/i], ['Adobe', /adobe/i], ['Figma', /figma/i],
  ['Kling AI', /kling/i], ['Google AI & Veo', /gemini|\bveo\s*\d*|google\s*(ai|one)|antigravity/i],
  ['Midjourney', /midjourney/i], ['Perplexity', /perplexity/i], ['Cursor', /cursor/i],
  ['GitHub', /github/i], ['Spotify', /spotify/i], ['Netflix', /netflix/i],
  ['Disney+', /disney/i], ['Amazon', /amazon|prime video/i], ['Grammarly', /grammarly/i],
  ['Duolingo', /duolingo/i], ['LinkedIn', /linkedin/i], ['Zoom', /\bzoom\b/i],
  ['Runway', /runway/i], ['Freepik', /freepik/i], ['Envato', /envato/i],
  ['Suno', /\bsuno\b/i], ['Sora', /\bsora\b/i], ['HeyGen', /heygen/i],
  ['Leonardo AI', /leonardo/i], ['Manus', /\bmanus\b/i], ['Lovable', /lovable/i],
  ['Replit', /replit/i], ['Windsurf', /windsurf/i], ['DeepSeek', /deepseek/i],
  ['Grok', /\bgrok\b/i], ['Qwen', /\bqwen\b/i],
  ['Meitu', /meitu/i], ['Wink', /\bwink\b/i], ['Xingtu', /xingtu/i],
  ['Gamma', /\bgamma\b/i], ['Beautiful.ai', /beautiful/i], ['Locket', /locket/i],
  ['Autodesk', /autodesk|autocad/i], ['Proton', /proton/i],
  ['Higgsfield', /higgs?field|higgfield|\bhigg\b/i],
  ['Email services', /gmail|hotmail|outlook/i], ['Apple', /apple\s*id/i],
  ['Seedance', /seedance/i], ['Domo AI', /\bdomo\b/i], ['MiniMax', /minimax/i],
  ['GPM Login', /gpm\s*login/i], ['Roblox', /roblox|blox fruits/i],
  ['Discord', /discord|server boost/i], ['Reddit', /reddit/i], ['Scribd', /scribd/i],
  ['Akool', /akool/i], ['Kahoot', /kahoot/i], ['Wispr Flow', /wispr/i],
  ['n8n', /\bn8n\b/i], ['Railway', /railway/i], ['Cuty AI', /\bcuty\b/i],
  ['Quizlet', /quizlet/i], ['Xbox', /xbox/i], ['iQIYI', /iqiyi/i],
  ['BeautyCam', /beautycam/i], ['Coursera', /coursera/i], ['Krea', /\bkrea\b/i],
  ['Lart AI', /lartai/i], ['OpenArt', /openart/i], ['Dreamina', /dreamina/i],
  ['Tryclico', /tryclico/i], ['iLovePDF', /ilovepdf/i], ['Muse AI', /muse\s*ai/i],
  ['Telegram', /telegram/i], ['X / Twitter', /twitter|\bx\s+premium\b/i],
  ['TikTok', /tiktok/i], ['Facebook & Instagram', /facebook|instagram/i],
  ['VPN services', /\bvpn\b|nordvpn|surfshark|expressvpn|\bhma\b/i],
  ['Cloud storage', /dropbox|icloud|google drive|onedrive/i]
];

export function productFamily(product) {
  return families.find(([, pattern]) => pattern.test(product.name || ''))?.[0] || 'Other products';
}

const brandDomains = {
  'ChatGPT & Codex': 'chatgpt.com', Claude: 'claude.ai', Canva: 'canva.com', Notion: 'notion.so',
  ElevenLabs: 'elevenlabs.io', CapCut: 'capcut.com', 'Microsoft & Windows': 'microsoft.com',
  YouTube: 'youtube.com', Adobe: 'adobe.com', Figma: 'figma.com', 'Kling AI': 'klingai.com',
  'Google AI & Veo': 'gemini.google.com', Midjourney: 'midjourney.com', Perplexity: 'perplexity.ai',
  Cursor: 'cursor.com', GitHub: 'github.com', Spotify: 'spotify.com', Netflix: 'netflix.com',
  Amazon: 'amazon.com', Grammarly: 'grammarly.com', Duolingo: 'duolingo.com',
  LinkedIn: 'linkedin.com', Zoom: 'zoom.us', Runway: 'runwayml.com', Freepik: 'freepik.com',
  Envato: 'envato.com', Suno: 'suno.com', HeyGen: 'heygen.com', 'Leonardo AI': 'leonardo.ai',
  Lovable: 'lovable.dev', Replit: 'replit.com', Windsurf: 'windsurf.com', DeepSeek: 'deepseek.com',
  Grok: 'grok.com', Gamma: 'gamma.app', 'Beautiful.ai': 'beautiful.ai', Autodesk: 'autodesk.com',
  Proton: 'proton.me', Higgsfield: 'higgsfield.ai', Roblox: 'roblox.com', Discord: 'discord.com',
  Reddit: 'reddit.com', Scribd: 'scribd.com', Kahoot: 'kahoot.com', n8n: 'n8n.io',
  Railway: 'railway.com', Quizlet: 'quizlet.com', Xbox: 'xbox.com', Coursera: 'coursera.org',
  Krea: 'krea.ai', OpenArt: 'openart.ai', iLovePDF: 'ilovepdf.com', Telegram: 'telegram.org',
  'X / Twitter': 'x.com', TikTok: 'tiktok.com', 'Facebook & Instagram': 'facebook.com'
};

export function productBrandImage(family) {
  const domain = brandDomains[family];
  return domain ? 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(domain) + '&sz=128' : '';
}

export function catalogGroups(products) {
  const groups = new Map();
  for (const product of products) {
    const name = productFamily(product);
    if (!groups.has(name)) groups.set(name, { name, products: [], priceRanges: [] });
    groups.get(name).products.push(product);
  }
  return [...groups.values()].map(group => {
    const currencies = new Map();
    for (const product of group.products) {
      if (product.price === null || !Number.isFinite(product.price)) continue;
      const values = currencies.get(product.currency) || [];
      values.push(product.price); currencies.set(product.currency, values);
    }
    return { ...group, image: group.products.find(p => p.image)?.image || '',
      available: group.products.filter(p => p.stock === 'available').length,
      unknown: group.products.filter(p => p.stock === 'unknown').length,
      priceRanges: [...currencies].map(([currency, values]) => ({ currency, min: Math.min(...values), max: Math.max(...values) })) };
  }).sort((a, b) => a.name === 'Other products' ? 1 : b.name === 'Other products' ? -1 : a.name.localeCompare(b.name));
}
