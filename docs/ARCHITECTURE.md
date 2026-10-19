# Architecture

## Explicit bot offer publication (released 2026-10-19)

Worker ShopProducts projects only explicitly allowlisted Firebase product IDs and
only name/price/currency/term/active fields through the existing server identity.
The Telegram-only shop catalog appends these offers to supplier listings without
altering the public supplier endpoint or exposing private CRM products wholesale.
Purchase checks reread custom offers; existing ShopOrders/manual payment storage
and immutable quotes remain authoritative. TELEGRAM_CLEAN_MENU selects the reviewed
collapsible Menu, complete category grid and single Buy action in TelegramShop.
Inventory and second-source rollout remain independently gated and disabled.

## Shared Firebase inventory adapter (local implementation, 2026-10-19)

The operator chose actual Firebase during local review. Server-owned
atlasInventoryState records hold logical iv: keys with hash IDs and JSON payloads.
Node Admin and Worker REST adapters share that format, transactional claims and
server timestamps. Envelope encryption and operator-only endpoints remain intact.
The loopback service can use real browser Firebase authentication and verify tokens
and CRM references server-side; local browser references are ignored in this mode.
Hosted rollout selects INVENTORY_STORAGE=firestore and reuses the keyring. No
production inventory feature release or legacy ledger import has been performed.

## Private stock and multi-supplier preparation (2026-10-19)

`server/inventory/` adds an encrypted owned-item ledger and atomic allocation in
the existing SQLite coordinator. Persisted supplier policies filter sources before
fetch/cache use. An operator-only paginated metadata summary supplies owned-stock
counts to the dashboard independently of supplier data. Worker inventory routes enforce Firebase operator
claims; a read-only Firestore adapter validates CRM product/customer/purchase
references. The framework-free Inventory view and purchase cards expose private
metadata and explicit audited credential reveals. No browser/demo secret storage.

`server/suppliers/nam.mjs` prepares GET-only fresh USD offers; explicit mappings
combine supplier availability and choose cheapest available cost plus current
margin once. Current supplier cost snapshots remain server-private. Both feature
gates default off; no deployment or live second-provider validation is complete.
See `INVENTORY.md` / ADR 0006.

## Username-only customer identity (2026-10-19)

Quick Add uses one field for phones or handles. `customer-identity.js` normalizes
manual handles and supplies null-phone display fallbacks. Customer IDs remain the
purchase/history relationship key. Username matching uses its own field; phone
imports/merge and official transport retain phone semantics. No null-phone matching,
automatic cross-identity linking or guessed chat URL is used. See
[WHATSAPP_USERNAMES.md](WHATSAPP_USERNAMES.md) and ADR 0005.

## Customer purchase profile (released 2026-10-19)

`js/views/customer-sales.js` renders the profile summary/form; pure validation,
phone search, dates and totals live in `js/utils/customer-sales.js`.
`recordCustomerPurchase` uses one retry-safe Firestore transaction (one localStorage
write in demo) for the purchase, optional linked subscription, timeline and customer
qualification. Existing operator-only rules and manual transport boundaries remain.
See [CUSTOMER_PURCHASES.md](CUSTOMER_PURCHASES.md).

## Mobile Quick Add (released 2026-10-19)

`/?quick-add=1` reuses the operator-gated app with a dedicated narrow form.
`js/views/quick-add.js` owns UI, `js/services/quick-add.js` owns input/source mapping,
and the existing store normalizes/matches records and atomically batches new
customer/activity writes. The existing private Telegram admin menu links to it;
public catalog/shop menus remain unchanged. See [QUICK_ADD.md](QUICK_ADD.md).

## WhatsApp lead capture and desktop alerts — prepared 2026-10-18

The existing Node message repository now atomically stores a server-owned enquiry
alert with an inbound CRM message. A private authenticated loopback feed connects
Genie to these alerts; a separate explicit manual-capture route also records
product interest and a follow-up without fabricating transport or purchase facts.
`npm run leads:local` starts only this private bridge using existing Firebase access.
No public webhook release or WhatsApp-number onboarding is complete. See
[WhatsApp lead alerts](WHATSAPP_LEAD_ALERTS.md).

## Collaborator performance released — 2026-10-17

The operator approved the release. Existing `atlas` Worker version
`fe7e275e-0078-410e-bd3b-aebb018ea3b6` is deployed with all 32 prior production
bindings preserved, including enabled partner tracking. Firebase Hosting reported
successful release of the staged 41 public files. No Firestore rules, Telegram
webhook registration, order records, payouts or Meta campaigns were changed.

The authenticated collaborator endpoint returned HTTP 200, schema version 1 and
complete coverage with zero tracking campaigns. Genie successfully persisted this
live empty report. Authentication, browser-origin and write boundaries returned
401/403/405 as expected; the existing hosted bot remained enabled. The runtime
Windsor credential is still missing in Genie, so automatic Meta cost reporting
requires the operator to save it privately. A real operator-created collaborator,
creative link and Meta-ad mapping are still required before measuring outcomes.
No fictional production records were created. Verification before release: 134
Atlas tests, 58 Genie checks, Worker dry-run and Hosting staging passed.


## Collaborator performance loop — prepared 2026-10-17

Added per-creative briefs, unique immutable Meta-ad mappings and an authenticated
aggregate report for Genie. Payment/delivery and spend approvals remain manual.
Worker and Hosting release are pending operator approval; see
[COLLABORATOR_PERFORMANCE.md](COLLABORATOR_PERFORMANCE.md).

## Partner attribution and commission extension (released 2026-10-16)

`server/partners/` adds transactional attribution/ledger/payout/reporting to the
existing order store. Orders snapshot first-touch 30-day attribution and rates;
verified payment plus delivered status creates one credit, refunds one reversal.
Worker routes use Firebase identities and canonical partner ownership. A durable
outbox mirrors records to Firestore through a Worker-native REST adapter. The
`/?partners=1` portal and catalog referral capture reuse the static ES-module stack.
No automatic payment, delivery, supplier purchase or advertising write is added.
See [PARTNERS.md](PARTNERS.md) for schema, roles, limits and deployment requirements.

## Genie business reporting (prepared 2026-10-16)

The existing admin-authenticated Worker now has a prepared aggregate business-report
route. The coordinator reuses serialized order storage and `business-report.mjs`
without exposing private buyer evidence or changing the payment/order schema.
Genie persists report snapshots and enforces a narrow saved reporting/bot-state
policy locally. It cannot approve payments or confirm delivery through this route.
See `GENIE_BUSINESS.md`; release remains pending approval.

## Manual payment release — 2026-10-15

After the operator explicitly requested live deployment and clarified the desired
manual reference-tracking flow, the existing atlas Worker was released with
manual Binance instructions enabled using private payment bindings. The receiving
QR was sent once to the configured private admin; its same-bot photo reference
is retrievable. Bot buyer/admin command scopes were updated and verified; the
hosted shop remains enabled and the existing webhook/SQLite namespace is preserved.
The shop keyboard omits Wallet/API buttons. No customer balance, Binance API,
automatic funds verification, supplier purchasing or automatic delivery exists.
Buyers create an order, view the receiving details/QR, submit a reference, and
wait for authorized human verification and manual delivery. The explicit 1:1
USD/USDT quote rule follows the single 10% catalog markup. Local default remains
disabled; the prepared deployed bindings enable production.

Validation: all 104 tests passed; the 28 affected payment/shop tests passed again
after menu simplification; local mocked workerd/SQLite payment smoke and Wrangler
dry-run passed. Live QR retrieval, command scopes, enabled shop and existing
webhook were checked. Secret scans passed. No real customer order/payment was
created or approved during verification. Receiving identity is operator-supplied;
the QR's encoded recipient was not independently verified in Binance.

Telegram's published digital-goods Stars requirement was disclosed to the operator;
this release is not a claim of platform approval/compliance. Earlier preparation
sections below describe the pre-release state and are superseded by this release
record where they say local-only, missing QR file reference or not deployed.
Rollback new instructions by releasing MANUAL_CHECKOUT_ENABLED=false, preserving
all order/evidence state; do not revert to incompatible order-schema code.

## Prepared manual payment infrastructure (2026-10-15; not deployed)

The existing order store is extended with separate payment/delivery states,
versioned human review, bounded private screenshot references, approved-reference
uniqueness and paginated review/delivery queues. `server/payments/` contains the
validated configuration, modular manual Binance provider and Node-only private
QR loader; `telegram-manual-checkout.mjs` supplies private buttons/prompts and
notifications. Existing catalog/markup, Worker coordinator and local JSON store
are reused. Disabled by default and in saved local settings; no production or
Firestore schema change occurred. Older quotes project compatibly without bulk
rewrites. See `PAYMENT_ARCHITECTURE.md` and `BINANCE_PAY_SETUP.md` for setup,
manual-only semantics and Telegram digital-goods deployment limitations.

Public `images/shop/` now holds six original JPEG family/welcome cards generated
from code-native SVG layouts. Hosting stages that folder; the local static handler
permits only the six named JPEGs. Browser shares `shop-images.js` for safe local/
supplier fallbacks and `catalog-links.js` for exact listing deep links. Channel
publisher upgrades known posts using editMessageMedia, and private bot sends photo
then full detail controls. Coordinator can return flagged sanitized cache up to
six hours old during upstream failure; shop creation rejects stale quotes.

## Channel shop / human payment review (2026-10-14)

`server/channel-shop.mjs` prepares welcome/featured channel posts with private bot
deep links. `telegram-shop.mjs` handles buyer selection, private history/profile,
order-reference submission and numeric-admin review/fulfillment controls.
`shop-orders.mjs` owns transactional intent/reference deduplication and audited
states. Worker persists private orders in coordinator SQLite; local polling uses
atomic ignored file storage. No supplier purchasing/payment API is called and
no CRM/customer schema is changed. Public website remains catalog-only. See
`TELEGRAM_SHOP.md` for storage, privacy, activation and manual payment boundaries.

## Prepared Cloudflare Atlas Market transport (2026-10-14)

Firebase Hosting remains the frontend. `worker/index.mjs` provides the fixed
read-only catalog, secret-authenticated Telegram webhook and separate admin gate
protocol for the existing lowercase `atlas` Worker. `worker/firebase-auth.mjs`
verifies Firebase ID tokens for private catalog access; public access requires
explicit configuration. `worker/coordinator.mjs` serializes cache, cooldowns,
budgets, 48-hour receipts and persistent enable state in one SQLite Durable Object.
No customer/payment database or Firestore change is introduced. Shared adapters
support both Node polling and Workers fetch semantics. The existing Worker is
deployed and the frontend uses its fixed address. Catalog browsing is explicitly
public and does not initialize Firebase or attach tokens. Private-mode Firebase
verification remains available in the Worker. CRM is operator-only; the hosted
bot is active through its registered webhook. Local polling remains a development
option only after coordinated webhook removal. Order storage/review is described above.
See [CLOUDFLARE.md](CLOUDFLARE.md).

## Local supplier catalog (2026-10-14)

Atlas Market adds a storefront hero/featured rail and Telegram enquiry links on
the existing local index preview. `catalog-pricing.js` defines the shared stock-based 10–40%
markup/currency-rounding rule (see `CATALOG.md`); `server/catalog.mjs` applies it before public output.
`catalog-settings.mjs` validates the private configured Telegram group URL.
`telegram-catalog.mjs` owns menu formatting and the allowlisted command bot;
`telegram-catalog-runner.mjs` supplies official polling and ignored offset state.
The loopback-only `/api/catalog/telegram-menu` powers a clearly labeled local
shop preview using those same formatters. No supplier purchase or customer-payment
route is introduced. Bot activation requires a dedicated token and chat IDs.

The index and CRM navigation now offer a read-only Supplier catalog view.
`js/views/catalog.js` owns rendering/filtering; `server/catalog.mjs` owns supplier
fetching, normalization and a short cache. `server/catalog-preview.mjs` enables
the loopback-only `/api/catalog/products` route and loads the ignored `.env` via
the npm launcher. `?catalog=1` loads a catalog-only shell without customer modules;
configured Worker requests restore Firebase identity. Normal CRM authentication and WhatsApp services remain
unchanged. No purchase route or hosted catalog deployment is added. See `CATALOG.md`.

## Current shape

```text
Browser
  |
  +-- index.html -> js/app.js -> views rendered into #app
  +-- login.html -> js/login.js
  |
  +-- js/utils (phone, dates, WhatsApp)
  +-- js/services (store, imports)
  |
  +-- js/firebase.js -> Firebase Authentication / Firestore (when configured)
  +-- localStorage demo store (when unconfigured or ?demo=1)
  |
  +-- WhatsApp Web chat link -> WhatsApp (external)
```

## Startup and authentication

`index.html` loads `js/app.js`. If Firebase is unconfigured, the app renders local
demo mode. Configured CRM startup redirects signed-out users to login and routes
nonoperators to Market before rendering. Login offers Google popup and existing
email/password authentication, routing by the refreshed `atlasOperator` claim.
Only operators receive the CRM shell; Firestore independently enforces that claim.
The Worker catalog accepts valid project tokens from Market users. See `AUTHENTICATION.md`.

## Rendering and modules

`js/app.js` owns the current view, shell, dashboard, contacts, profile modal, follow-ups, imports, and settings rendering. `js/services/store.js` is the data/service boundary and switches between Firestore and localStorage. `js/services/imports.js` parses and previews input. `js/utils/phone.js`, `dates.js`, and `whatsapp.js` provide reusable transformations. CSS is split into variables, base rules, layout, and components. `index.html` dynamically imports `app.js` so module-load failures become a visible startup error instead of an endless loading message.

## Data access and workflow

The store reads and writes `customers`, `activities`, and `followups`. Customer creation normalizes a phone and writes an import activity. Status transitions update contact/reply timestamps and append activities. Follow-up creation writes a follow-up, updates `nextFollowUpAt`, and records an activity. The profile displays activities in chronological order.

## WhatsApp and errors

`whatsappUrl` creates a `https://web.whatsapp.com/send?phone=<number>&text=<encoded-message>` URL from a normalized number. The operator edits an optional message in an in-app dialog, then clicks a native link to open WhatsApp Web in a new tab. Atlas records `whatsapp_opened` as an opening request, not proof of navigation or sending. Cancel does not open a chat or record activity. Activity write failures appear in the dialog. Atlas does not inspect WhatsApp.

The same dialog's **Mark sent and close** action calls the manual `contacted` transition, disables repeated clicks while saving, and closes after success. Failure leaves the dialog open with a retryable error. Confirmations for an already contacted customer increment the attempt count and append another sent activity.

An accessible desktop icon alongside the Web link uses `whatsappDesktopUrl` to request opening the installed app via `whatsapp://send?phone=<number>&text=<encoded-message>`. Both destinations share phone validation and message encoding and update when text is edited or a snippet is selected. Desktop opening depends on the operating system's registered WhatsApp handler and may show a browser confirmation. Atlas records only the operator's opening request, not proof that the app opened or a message was sent.

## Configuration and responsibilities

Static pages are staged with `npm run build:hosting`; `firebase.json` points Hosting at `.firebase/hosting-public` and maps Firestore rules/indexes. `js/firebase.js` contains the configured client Firebase settings; client config is not a secret, but service-account keys never belong here. `firestore.rules` is the browser authorization boundary.

## Directory responsibilities

`css/` presentation; `js/app.js` UI orchestration; `js/services/` persistence and parsing; `js/utils/` pure helpers; root HTML entry points; `firestore.rules` and `firestore.indexes.json` Firebase policy/configuration; `docs/` durable system knowledge.

## Architectural invariants

- Keep the browser app framework-free and module-based.
- Keep Firebase access behind `js/firebase.js` and service modules.
- Preserve immutable activity history.
- Normalize phone numbers before duplicate detection and WhatsApp links.
- Treat WhatsApp actions as external events, never delivery proof.
- Use authenticated access for Firestore and do not broaden rules casually.
- Keep future sales entities separate from the current contact journey.

## Official WhatsApp transport (2026-10-05)

`server/` adds a framework-free Node HTTP backend with native fetch and Firebase
Admin. The browser architecture and manual links remain unchanged. The backend
exposes GET/POST `/webhooks/whatsapp`, authenticated GET `/api/whatsapp/config`
and POST `/api/whatsapp/messages`; outbound sending is available through a local
operator CLI and the existing message dialog's **Send via WhatsApp API** button.
`server/config.mjs` reads runtime environment, `whatsapp.mjs` handles Meta,
`webhook.mjs` verifies/parses input, `repository.mjs` owns atomic data/history
processing, and `firestore.mjs` adapts it to existing Firestore. `http.mjs` serves
only allowed browser assets and the webhook. Windows startup fills only missing
process settings from the saved User/Machine environment.

Server-owned `messages`, `whatsappEvents` and `whatsappSendAttempts` supplement
`customers`/`activities`. Conversations are message streams linked by customer ID.
Unknown inbound senders become new leads, existing business states are preserved,
and normalized phone matching reuses existing contacts. Official acceptance,
incoming messages and status evidence appear in the existing timeline. Demo
localStorage has no connection to the server. There is no AI execution/response.

`server/auth.mjs` verifies Firebase ID tokens with revocation checks and an
explicit environment UID allowlist. Empty allowlists disable web sending.
`js/services/whatsapp-api.js` handles same-origin requests, authentication and safe
outcome messages. Web requests identify a customer rather than providing a phone;
private per-user/request attempt records prevent concurrent duplicate sends.
The dialog blocks repeated/manual sending during accepted or uncertain outcomes.

The backend requires Meta app-secret signatures and Firebase Admin credentials;
static Hosting has no backend rewrite yet. See `WHATSAPP_SETUP.md`. The official
API supplies real evidence independently of manual Web/desktop opening actions.

## Local messaging connection

The chosen deployment mode is now a local Windows service plus the existing
Firebase-hosted CRM. `server/local.mjs` starts outbound sending on loopback after
read-only Firebase/Meta checks, reusing existing environment and Firebase CLI login
when ADC is absent. Its per-process ADC file is outside the repo in a restricted
Windows folder and is cleaned on exit. Only a unique enabled Firebase account
with `atlasOperator:true` may be selected when no explicit UID list exists.

`js/utils/messaging-backend.js` validates the fixed loopback endpoint and defaults
the two known Hosting origins to local sending. Settings can choose This computer
or Hosted backend; explicit preferences are stored per browser. The local HTTP
handler grants restricted CORS/PNA preflights only to those Hosting origins, still
verifies Firebase identity, rejects untrusted Host/Origin headers and listens only
on loopback. Cloud deployment/billing is optional for this outbound path. Signed
incoming/status webhooks still require public HTTPS and the app secret.
