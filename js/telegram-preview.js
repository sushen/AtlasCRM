const root = document.querySelector('#app');
root.innerHTML = `<div class="telegram-shop"><header class="telegram-shop-head"><span class="telegram-avatar"><img src="/images/brand/atlas-logo.jpg" alt="" width="42" height="42"></span><div><strong>Atlas Market</strong><small>Telegram bot layout preview · local only</small></div><a href="/?catalog=1">Website ↗</a></header><main class="telegram-chat"><div class="telegram-date">SHOP PREVIEW</div><div class="telegram-bubble"><strong>Welcome to Atlas Market.</strong><p>Choose a product below. This local preview uses the same menu and prices as the bot.</p></div><div class="telegram-bubble"><p class="telegram-message" data-shop-message role="status">Loading catalog…</p><div class="telegram-inline-grid" data-shop-inline></div></div></main><footer class="telegram-shop-menu"><div class="telegram-compose"><span>Menu</span><small>Choose a quick menu below</small></div><div data-shop-menu></div></footer></div>`;
const message = root.querySelector('[data-shop-message]');
const inline = root.querySelector('[data-shop-inline]');
const bottom = root.querySelector('[data-shop-menu]');
let busy = false; let groupUrl = ''; let requestGeneration = 0;
const showInfo = action => {
  requestGeneration++; busy = false;
  const info = { '💬 Support': 'For product questions, contact our team in the Telegram group.',
    '👛 Wallet': 'Orders and payments are arranged in our Telegram group. This preview does not collect payment or show the supplier wallet.',
    '🔌 API': 'The website and Telegram bot share one catalog and retail pricing. Private API keys are not provided.',
    '🛡 Warranty': 'Warranty terms vary by product. Open its details and confirm the terms with support before ordering.' };
  message.textContent = info[action] || ''; inline.replaceChildren();
  if (groupUrl) {
    const link = document.createElement('a'); link.href = groupUrl; link.target = '_blank'; link.rel = 'noopener noreferrer';
    link.textContent = 'Continue in our Telegram group ↗'; inline.append(link);
  }
};
async function load(action = 'groups:0') {
  if (busy) return;
  const generation = ++requestGeneration;
  busy = true; message.textContent = 'Loading catalog…';
  try {
    const response = await fetch('/api/catalog/telegram-menu?' + new URLSearchParams({ action }));
    if (!response.ok) throw Error('unavailable');
    const body = await response.json();
    if (generation !== requestGeneration) return;
    groupUrl = body.telegramUrl;
    message.textContent = body.text; inline.replaceChildren();
    for (const row of body.reply_markup.inline_keyboard) {
      const line = document.createElement('div'); line.className = 'telegram-inline-row';
      for (const item of row) {
        const button = document.createElement(item.url ? 'a' : 'button'); button.textContent = item.text;
        if (item.url) { button.href = item.url; button.target = '_blank'; button.rel = 'noopener noreferrer'; }
        else button.onclick = () => load(item.callback_data);
        line.append(button);
      }
      inline.append(line);
    }
    bottom.replaceChildren();
    for (const row of body.menu.keyboard) {
      const line = document.createElement('div'); line.className = 'telegram-bottom-row';
      for (const item of row) {
        const button = document.createElement('button'); button.textContent = item.text;
        button.onclick = () => item.text === '🛍 Products' ? load() : showInfo(item.text); line.append(button);
      }
      bottom.append(line);
    }
  } catch { if (generation === requestGeneration) message.textContent = 'Catalog temporarily unavailable. Keep the local preview server running, then reload.'; }
  finally { if (generation === requestGeneration) busy = false; }
}
await load();
