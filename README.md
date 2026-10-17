# Atlas CRM

Atlas CRM is a private, framework-free CRM for managing WhatsApp leads and customers through a contact, conversation, follow-up, and customer journey. WhatsApp remains an external communication system; Atlas records workflow and history and does not claim that opening a link proves a message was sent or answered.

## Current status

The current MVP includes TXT/CSV import preview, phone normalization, customer statuses, activity timelines, follow-ups, search/filtering, Firebase Authentication/Firestore integration, products/purchases/subscriptions/templates, and a local browser demo. The optional official WhatsApp Cloud API backend is implemented; live Meta/backend validation remains pending. Static Hosting releases have been verified; browser Firestore/auth workflows remain unverified.

## Technology and quick start

HTML5, CSS3, browser ES modules, Firebase Authentication, and Firestore, plus an optional Node 20.19+ backend. Run `npm ci --ignore-scripts`, then `npm run preview` and open `http://127.0.0.1:3000/index.html?demo=1` for a private asset-only demo preview. For Cloud API startup/configuration and operator-initiated sending, see [WhatsApp setup](docs/WHATSAPP_SETUP.md).

For Firebase use, configure `js/firebase.js`, enable Email/Password Authentication and Firestore, create a user, and select a Firebase CLI project. Stage browser assets with `npm run build:hosting` before a Hosting release; review rules separately. See the deployment guide before deploying.

## Documentation

- [Agent guide](AGENTS.md)
- [Project](docs/PROJECT.md)
- [Current state](docs/CURRENT_STATE.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Data model](docs/DATA_MODEL.md)
- [Customer journey](docs/CUSTOMER_JOURNEY.md)
- [Firebase](docs/FIREBASE.md)
- [Google login and CRM access](docs/AUTHENTICATION.md)
- [Security](docs/SECURITY.md)
- [Development](docs/DEVELOPMENT.md)
- [Testing](docs/TESTING.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Atlas Market Cloudflare preparation](docs/CLOUDFLARE.md)
- [Telegram channel shop and manual payment review](docs/TELEGRAM_SHOP.md)
- [Prepared manual payment architecture](docs/PAYMENT_ARCHITECTURE.md)
- [Binance manual setup and deployment constraints](docs/BINANCE_PAY_SETUP.md)
- [Order workflow](docs/ORDER_WORKFLOW.md)
- [Admin payment verification](docs/ADMIN_PAYMENT_VERIFICATION.md)
- [Payment tests](docs/PAYMENT_TESTING.md)
- [Roadmap](docs/ROADMAP.md)

## Privacy

Never commit WhatsApp HTML exports, TXT/CSV contact lists, customer exports, backups, Firebase credentials, service-account keys, or other secrets. Firestore access requires authentication, but current rules are designed for a single trusted workspace and need ownership controls before multi-user use.

## Local supplier catalog preview

The existing `atlas` Cloudflare Worker integration is deployed with a
persistent bot gate and public read-only catalog. Firebase stays the
frontend; polling remains available. Firebase and the existing Worker were
released on 2026-10-14. Everyone can browse products without login and continue
enquiries through the [Telegram channel](https://t.me/atlascrmshop); private CRM remains operator-only. Webhook changes
were activated with user approval on 2026-10-14. Channel posts open private bot
orders, with human payment-reference review and manual fulfillment. Do not run
local polling while the registered webhook is active; see the shop guide.
`npm test` includes Worker checks; `npm run worker:check` uses Node 22+ for the
pinned Wrangler dry-run. See the Cloudflare guide for runtime smoke testing and
future release commands.

Atlas Market now displays retail prices at supplier price +10%, five featured
products, group/detail views and sales enquiries through the configured Telegram
group. Preview the bot's shop layout at `http://127.0.0.1:3100/?catalog=telegram`.
For real bot activation, see [Telegram setup](docs/TELEGRAM.md).

Run `npm run preview:catalog` from this folder, then visit
`http://127.0.0.1:3100/?catalog=1`. It displays live supplier product cards,
prices and availability using the private `.env` key on the backend. It does not
purchase products. See [catalog setup](docs/CATALOG.md).
