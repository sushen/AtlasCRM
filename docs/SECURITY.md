# Security and Privacy

## Approved hosted inventory activation — 2026-10-19

Existing server-only inventory keyring was uploaded to the current Worker as a
secret, preserving old key IDs and fingerprint key; it is absent from public assets
and Git. Inventory routes are now enabled with existing operator verification,
origin restrictions and rate limits, using the shared server-owned Firestore ledger.
All prior live bindings and Telegram/order/payment settings were preserved. Private
assets remain inaccessible and anonymous inventory reads return 401. No Firestore
browser-rule expansion, account login, external credential delivery or WhatsApp
automation was introduced. See DEPLOYMENT.md for the release/verification boundary.

## Customer-delivery account projection (local development, 2026-10-19)

deliveryDetails is operator-authorized and audited, decrypts only on the server,
and projects structured email/password fields. It never returns 2FA seeds, recovery
codes or other credential fields to the default delivery UI. The view clears
after 30 seconds/visibility change. The existing separate raw admin reveal API
remains privileged and is not called by that UI. No customer delivery transport,
external login, auto-renewal or automatic access revocation is enabled.

## Local journey workspace (development, 2026-10-19)

The journey view reads existing operator-authorized Firebase collections and never
rewrites qualification, payment, delivery or suppression based on opening a screen.
Customer history/text is escaped. Its reply action reuses the official authenticated
sending adapter and customer ID; unknown outcomes are locked without automatic
retries. The generated local review build still disables that adapter entirely.
No Meta onboarding, external message, autonomous reply or reminder was activated.

## Explicit Telegram product publication (released 2026-10-19)

Only TELEGRAM_OWN_PRODUCT_IDS-approved product IDs can enter the real bot's catalog;
active private CRM products are not implicitly published. The existing protected
server identity reads name/price/currency/term/active through a Firestore field
mask. Customer records, purchased credentials and acquisition costs are excluded.
Invalid/inactive/removed offers fail closed. Current quote and active status are
rechecked before purchase; no supplier purchase or automatic delivery is introduced.
Existing manual payment/approval, order storage, access rules and webhook persist.

## Private Telegram sandbox (local, 2026-10-19)

The dedicated sandbox token stays in an ignored, access-restricted local file.
Its separate runner verifies the expected bot identity, rejects a token matching
the live token and refuses an existing webhook. Only configured numeric operators
in matching private chats can trigger replies, with an outbound recipient guard.
Firestore queries project product fields only; customer records and inventory
credentials are not read. Real supplier retail listings are shown; acquisition
costs never enter messages. Test orders, reference/evidence, review and delivery
state use only the separate ignored sandbox file, with no live order access or
Firebase writes. Checkout has no payable account, QR or transfer link. Polling
state is separate from production. Add lead opens the local real Firebase CRM
with an explicit real-save notice; the bot itself does not write CRM records.

## Actual Firebase local review (2026-10-19)

The local workspace's --firebase mode serves real Firebase browser auth. Local
inventory requests require both the random loopback session and a Firebase token
verified with revocation checks and strict atlasOperator:true. Server-side CRM
reference reads replace browser-supplied test references. Shared atlasInventoryState
has no browser allow rule; the server uses its existing protected Firebase identity.
Saves in this mode affect real shared records, clearly labeled by the local banner.
Encryption keys stay server-only. Read connectivity was checked without writes;
hosted adapter/keyring activation remains pending release approval.

## Private inventory boundary (prepared 2026-10-19; disabled)

Inventory routes require trusted Origin and a verified strict operator claim;
the coordinator repeats authorization/rate checks. AES-256-GCM server envelopes
bind credentials to unit/product IDs; separate HMAC claims detect exact duplicate
credentials and protect intent receipts. Lists/audits expose no plaintext secrets.
Reveals are separate POST/no-store/audited actions and expire from the UI. Neither
credentials nor keyrings enter localStorage, public catalog, static assets or logs.
A backed-up server keyring is mandatory; old keys must survive rotation/rollback.
The existing same-project service identity only reads narrow CRM references in
this feature. No extra browser access or Firestore rule change. See `INVENTORY.md`.

New supplier token stays server-only. Only fixed-origin catalog/stock GETs exist;
redirects/error responses are refused and body sizes bounded. No balance or order
method is implemented. Exact equivalence/pool mappings are manual and cross-currency
comparisons fail without an FX policy. Both new gates are disabled until configured
and released. No real supplier credentials were collected in chat.

Released partner routes verify Firebase identity and active owner UID on every
read, and strict `atlasOperator:true` for administrative changes. Public referral
events cannot set commission or order ownership. Opaque single-customer Telegram
tokens expire after 20 minutes; order attribution is immutable. New Firestore rules
deny all client partner writes and isolate owner profiles from private accounting.
Server-only HMAC/Firestore credential bindings are required before feature activation.
The operator-approved release completed on 2026-10-16. See `PARTNERS.md` for privacy/fraud limits,
token revocation latency, outbox semantics and retention requirements.

The prepared Genie business-report endpoint uses the same separate admin bearer
authorization and no-browser-origin boundary as bot-state. Only aggregate metrics
and bounded product rankings are returned; no private buyer identity, references
or payment screenshot IDs cross this boundary. It has no write operations.

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

## Manual payment preparation — not deployed

Receiving QR/identity/file references live in ignored private settings/storage,
never public assets. Original QR is copied unchanged and checksummed, with Windows
current-user/SYSTEM access. Worker delivery uses a same-bot photo file ID; no local
path/QR bytes enter the bundle. Payment screenshot IDs remain private evidence.
Admin authorization is enforced in both model and bot; approval is atomic with
approved-reference uniqueness and evidence-version checks. Buyer evidence cannot
verify funds. Payment and delivery stay separate, and legacy quotes are preserved.
QR/link instructions require enabled/configured checkout; saved local mode is
disabled. No merchant API, payment, auto-delivery or production action was performed.
Telegram Stars requirements for digital goods remain a deployment constraint.
See `PAYMENT_ARCHITECTURE.md` and `ADMIN_PAYMENT_VERIFICATION.md`.

## Telegram shop privacy / review boundary

Channel posts contain only public catalog snapshots and shop/contact URLs. Private
orders/history/payment references never appear in channel posts or website APIs.
Buyer operations require a private chat with matching actor/chat identity; records
enforce ownership. Review/fulfillment requires configured numeric admin identity,
not username or callback contents. Approvals require a second explicit confirmation
and can only advance a submitted-reference order; fulfillment follows approval.
Transactions commit before notifications, and duplicate intents/references/reviews
do not repeat actions. Notifications can be lost on interruption; use order queries
for reconciliation. The bot never verifies funds by comparing text, collects payment
credentials or invokes supplier purchasing. Admin checks actual received funds.
Private order state expands durable storage requirements and needs deliberate
retention/backups. See `TELEGRAM_SHOP.md`; local file mode alone is not Windows ACL.

## Prepared Atlas Market Worker

Supplier key, bot token, Telegram webhook secret and separate admin bearer token
are server-only bindings. `.env`/`.dev.vars`, runtime state and build outputs are
ignored and excluded from Hosting staging. Fixed routes, body limits, exact-origin
CORS, persistent budgets and safe errors restrict access. The user explicitly
selected public catalog mode on 2026-10-14; products require no identity token.
Private-mode token verification remains available but is not used by Market.
CORS is not authentication and can be forged outside
browsers. No arbitrary proxy, wallet, purchasing or CRM-data route exists. Receipts
limit duplicate reply attempts for 48 hours; interruption can lose a reply.
Worker/Hosting release was authorized on 2026-10-14; webhook and bot activation
remain approval-gated. Supplier and bot credentials are now encrypted bindings.
Wrangler's initial diff printed prior readable dashboard values; the wrapper now
redacts configured private values. Rotate those exposed credentials. See
[Cloudflare security/operation details](CLOUDFLARE.md).

## Supplier catalog preview

The storefront exposes marked-up retail prices and a validated Telegram channel
link; neither buyer key nor bot token reaches browser assets. The Telegram bot
uses a numeric chat allowlist unless public private-chat catalog replies are
explicitly enabled. It never reads or displays the shared supplier wallet or
accepts payment. The ignored `.catalog-state/` holds only an update offset.
Both catalog HTTP routes retain the loopback Host/Origin/socket restrictions.
The Telegram layout preview is a local simulation, not an authenticated chat.

The catalog preview reads a supplier buyer key only on the server from the ignored
`.env`. It binds to loopback and checks Host/Origin without granting CORS access.
Only normalized catalog data is exposed; wallet/customer/order/credential data is
excluded. Static file serving continues to deny `.env` and server source. The
catalog-only index preview does not load Firebase or customer data and does not
alter the normal CRM authentication flow. It is not a public deployment.

## Current controls

Firebase Authentication permits public Market signup, while private CRM Firestore
access requires the strict Admin-set boolean `atlasOperator:true` claim. Only the
pre-existing workspace operator was promoted. Browser routing checks the refreshed
token, but Firestore is the authorization boundary. Customer deletes remain allowed
for operator duplicate merging; activities/follow-up deletes remain denied. Demo
data lives in browser localStorage and is not a secure store. See [AUTHENTICATION.md](AUTHENTICATION.md).

## Known limitation

Operators retain workspace-wide collection permissions, including broad sales
collection writes. Public Market users are denied all private CRM paths. There
is no per-record ownership or tenant isolation; the operator claim supports a
single trusted workspace, not multi-tenant customer CRM access.

## Data handling

Phone numbers and notes are private customer information. Do not put real numbers in source, public JSON, README files, screenshots, fixtures, or logs. Imports and exports require deliberate handling and must not be committed.

Never commit real customer TXT/CSV files, WhatsApp HTML exports, customer database exports, backups containing customer information, credentials, service-account keys, or private environment files. `.gitignore` covers common export locations and secret files while leaving prompt `.txt` files trackable.

## Operational concerns

Review Firebase Authentication providers, rules, indexes, Hosting access, backups, and least privilege before production. Use a separate test project for fictional data. Future multi-user authorization should add ownership and role checks rather than relying on sign-in alone.

## Cloud API backend

The new lead-alert feed/manual-capture bridge is private to native loopback clients
with the existing admin bearer token. It rejects Origin/Sec-Fetch-Site, non-loopback
source and wrong Host; it grants no CORS. Its masked feed omits message bodies and
full phone numbers. `whatsappLeadAlerts` remains server-owned under the default
Firestore client denial. Manual input is bounded, normalized, transactionally
deduplicated and never interpreted as API-verified source, sent reply or sale.
No new browser claims, public exposure or automatic outbound messages are enabled.

Meta access/verify tokens and app secret are runtime server settings. Raw errors,
request URLs, bodies and phone numbers are not logged. POST webhooks require the
app secret's raw-body HMAC-SHA256 signature and the configured business/phone IDs;
GET verification checks the existing verify token. Public input is bounded and
validated. There is no unrestricted send route and no execution of message content.
Outbound CLI honors `blocked`/`do_not_contact` and requires an existing CRM contact.

The direct web send route also requires a verified Firebase ID token with
revocation checking and membership in `WHATSAPP_ALLOWED_USER_UIDS`. An empty list
disables web sending. It accepts only a CRM customer ID and bounded text/request ID;
the backend resolves the private recipient number. It grants no cross-origin CORS
access. Send intent is atomically keyed by actor/request so duplicate HTTP attempts
cannot repeat the API call. Meta acceptance is shown separately from delivery.
Keep the approved list limited to trusted operators; this is not multi-tenant ACL.

Firebase Admin uses Application Default Credentials and bypasses client rules;
protect its identity through IAM and never put private credential files in the
repository. `messages` allows signed-in reads and customer-only re-association,
while message creation/deletion and client access to `whatsappEvents` and
`whatsappSendAttempts` are denied. Existing broad single-workspace customer/activity
permissions are unchanged. Transport evidence does not change qualification states.

The Node static handler has an asset allowlist. Hosting now targets a staging
directory populated only with browser assets by `npm run build:hosting`. Protect
reverse-proxy access logs too: webhook verification URLs contain the verify token.
No backend deployment occurred. The additive transport rules were compared with
the existing live policies, compiled and deployed on 2026-10-05 at the operator's
request. Existing collection permissions were preserved. Hosting was released
from browser-only staging, and live backend-source requests remain 404.

For the chosen local sending mode, the server binds only to `127.0.0.1`. Hosted
CRM requests may reach it using tightly restricted CORS/private-network preflights
for the known Firebase Hosting origins. Firebase identity/revocation/UID checks
still apply. Host/Origin validation rejects other domains, and browser endpoint
validation prevents bearer-token forwarding to arbitrary URLs. Browser local
network permission may be needed; do not disable browser security checks.

Existing Firebase CLI login can supply local ADC through a per-process file
outside the repository with current-user/SYSTEM-only ACLs. No credential values
are logged or uploaded; cleanup runs on normal exit. Existing configured ADC and
UID lists take precedence. This local fallback selects only a unique enabled
Firebase operator with `atlasOperator:true`; public Market accounts are excluded,
and multiple operators require explicit approval settings.
Without the app secret, local webhooks return 503 and outbound sending stays usable.
