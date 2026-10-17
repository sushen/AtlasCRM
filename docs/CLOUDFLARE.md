# Atlas Market on the existing Cloudflare Worker

Latest activation 2026-10-14: user approved shop activation. Existing Worker release
`480fdcb1-baed-479b-b68f-fb45a2d86853` includes private shop/order storage and
manual admin review. Webhook now points to Atlas and hosted gate is enabled.
No local polling process was found; never start polling with this webhook present.
Admin/contact secret bindings and private-shop flag are configured. Six channel
posts published, welcome pinned and commands verified. Payment references never
establish payment automatically; admin verifies real funds and handles fulfillment.
See `TELEGRAM_SHOP.md`. Earlier bot-off/unregistered snapshots are historical.

Channel destination update 2026-10-14: the operator supplied
`https://t.me/atlascrmshop`. Local saved configuration and the existing Worker's
`TELEGRAM_GROUP_URL` now target that channel. The legacy setting name is preserved;
bot approved chat IDs and gate are separate and unchanged. No Telegram channel
admin settings, webhook, bot membership or broadcast was changed. Local polling
retains its loaded settings until the operator restarts it.

Latest state 2026-10-14: user explicitly requested public catalog browsing without
login, with all enquiries/orders handled in the Telegram group. Existing Worker
release `9d1c4196-5d3e-4a4e-8e57-c5b7b4da7c8e` sets
`CATALOG_PUBLIC_ENABLED=true`. Live unauthenticated catalog returned 200 and 394
products, with the configured sales-group link. Firebase client release removes
Market Firebase imports, token forwarding and login controls. CRM retains its
operator-only Firestore boundary. Hosted bot remains off and webhook/polling
cutover is still approval-gated. Earlier private-catalog sections below describe
historical/default mode; public mode retains exact-origin CORS, fixed read-only
routes, caching and budgets. No payment/order/purchase route exists.

Current release 2026-10-14: following user approval and successful OAuth, the
existing `atlas` Worker was verified and deployed. Its original starter version
metadata is retained privately for rollback. Released version is
`0ac195e3-b9c0-408d-b385-053e713b1d7a`. Existing supplier/token settings matched
local setup. The supplier key (legacy `CANBOSO_BUYER_API_KEY`) and bot token are
now encrypted secrets; separate admin/webhook secrets were also uploaded.
Private catalog and bot-off settings are active; preview URLs are disabled.
Live health/access boundaries and authenticated admin off state passed.
The frontend Worker address is configured and the connected Hosting release is
complete, with a login link for signed-out visitors. Telegram webhook registration/activation remain approval-gated,
and local polling is untouched. Earlier preparation and login-failure sections
below are historical; commands remain useful for future approved releases.

Wrangler initially printed the prior readable dashboard credentials in its diff.
The runtime wrapper now redacts local token/key/secret values from command output.
Rotate previously exposed supplier/bot credentials; conversion to secret bindings
does not invalidate earlier copies. Private rollback metadata can contain old
plaintext bindings and must remain ignored/private. No credentials were rotated.

Update 2026-10-14: user approved website publication; the 27-file Firebase
Hosting-only release completed. Market shell is published, but its catalog
connection remains pending Cloudflare login/verification/backend deployment.
Frontend origin remains empty/local. OAuth sign-in attempts timed out; no
Cloudflare deployment/secret upload, webhook registration or bot toggle occurred.
The preparation/release instructions below describe the remaining backend work;
earlier statements that Firebase was not released are historical preparation facts.

Prepared locally on 2026-10-14; production deployment, secret uploads, hosted bot
activation, Telegram webhook registration and Firebase Hosting changes remain
approval-gated. The canonical existing script ID is lowercase `atlas` (dashboard
display Atlas), at https://atlas.meshstocks.workers.dev. Do not create or delete a
replacement Worker. A read-only `versions list` attempt could not verify its
existence because this session has no Cloudflare login. Verify in the correct
account before proceeding; the deployment wrapper repeats that check and stops
if it fails. Never use Wrangler's temporary-account option here.

## Architecture and access

Firebase Hosting remains the static frontend. `worker/index.mjs` exposes only
GET `/health`, GET `/api/catalog/products`, POST `/webhooks/telegram`, and
authenticated GET/POST `/api/admin/bot-state`. No arbitrary supplier proxy,
wallet, payment, order, WhatsApp or customer-data route is added.

The catalog accepts exact configured browser origins and no query parameters.
It requires a signed Firebase ID token by default, validating RS256 signature,
project audience/issuer, subject and time claims with Google's cached public keys.
This authenticates any valid user of the configured project; it does not provide
UID roles, account-disable/revocation checks, or CRM authorization. A revoked
token can remain usable until expiry. Firebase Admin credentials are unnecessary.
For private use sign in at the existing CRM/login page before opening `?catalog=1`.
The frontend waits for Firebase auth restoration before requesting the catalog.

Only explicit `CATALOG_PUBLIC_ENABLED=true` allows anonymous catalog access.
Choose private or public before release. CORS is a browser restriction, not
cryptographic authentication: non-browser callers can forge Origin. Public mode
still uses a fixed read-only route, sanitized output, short cache and budgets,
but it cannot prevent scraping or quota exhaustion. There is no public-DM switch
in the Worker: Telegram always requires a numeric chat allowlist.

One SQLite-backed Durable Object (`AtlasCoordinator`) holds the enable gate,
60-second normalized catalog cache, supplier/Telegram cooldowns, request counters
and update-ID receipts for 48 hours. It stores no Telegram message bodies or CRM
customers. Temporary counter keys may contain approved chat IDs and hashed IPs;
these are operational identifiers, not anonymous customer analytics. Cache data
includes only the normalized retail catalog/group link. The existing Firestore
schema/rules are untouched. No separate customer/payment database is needed.

Requests and cleanup serialize on the coordinator; storage writes finish before
outbound attempts. Approved update receipts are claimed before replies, providing
at-most-once processing within retention. A crash, disable, cooldown or uncertain
send can lose a reply; buyers request again with a new update. Expired receipts
do not prevent later replay. There is no automatic outgoing retry or queue.
Disabled updates are acknowledged and discarded. Disable waits behind in-flight
work; a confirmed off response means that earlier serialized work has completed.
Hourly cleanup uses 128-key batches (within the asynchronous delete API limit)
and is not postponed by incoming updates.

Website budgets: 30 requests/IP/minute and 300 globally/minute. Telegram budgets:
20 updates/chat/minute and 120 globally/minute, plus persistent provider cooldowns.
Rejected requests still consume platform requests; these are application controls,
not a guarantee against denial of service. Supplier errors return fixed safe
messages. Both Node and Workers share normalization and apply the 10% markup once.

## Runtime configuration

Set these on the **existing atlas Worker**, using secrets for the first four:

| Setting | Purpose / value |
| --- | --- |
| `CANBOSS_BUYER_API_KEY` | Private supplier read-only buyer key |
| `TELEGRAM_BOT_TOKEN` | Private token for @AtlasCrmMarketBot |
| `TELEGRAM_WEBHOOK_SECRET` | Separate random 32–256 character Telegram header secret |
| `ATLAS_ADMIN_TOKEN` | Separate random bearer token, at least 32 characters, for Genie/admin |
| `CANBOSS_API_BASE_URL` | `https://canboso.com` only |
| `FIREBASE_PROJECT_ID` | `atlascrm-c5722` |
| `CATALOG_ALLOWED_ORIGINS` | `https://atlascrm-c5722.web.app,https://atlascrm-c5722.firebaseapp.com` |
| `CATALOG_PUBLIC_ENABLED` | `false` by default; public requires explicit choice |
| `TELEGRAM_BOT_ENABLED` | `false` for initial deployment |
| `TELEGRAM_BOT_USERNAME` | `AtlasCrmMarketBot` |
| `TELEGRAM_CATALOG_CHAT_IDS` | `-5513909100` (add only approved IDs) |
| `TELEGRAM_GROUP_URL` | `https://t.me/atlascrmshop` (legacy name; channel destination) |

The old `CANBOSO_*` spelling remains supported by the local/shared adapter. Set
only one spelling; differing key aliases are rejected. Dashboard bindings supply
runtime secrets, not `.env` deployment. `keep_vars:true` preserves dashboard
variables. The new Durable Object binding/migration is managed by `wrangler.jsonc`;
review existing bindings, routes and Worker source before overwriting its code.

`npm run worker:prepare-secrets` only writes ignored `.env` and `.dev.vars` locally;
it generates missing admin/webhook tokens and does not upload anything. Local dev
vars include loopback origin; do not copy that origin into production. Never paste
tokens into command lines, frontend files or documentation. Rotate credentials
previously shared in chat through the corresponding providers; synchronize the
private local and hosted settings during an approved cutover.

Genie's Project Integrations → Atlas Market provides Check status / Bot on / Bot
off using `ATLAS_WORKER_URL` and `ATLAS_ADMIN_TOKEN` from private AtlasCRM `.env`.
The protocol is GET/POST `/api/admin/bot-state`, POST body `{"enabled":false}` or
`{"enabled":true}`, Authorization Bearer admin token, with confirmed response
`{"service":"atlas-market","enabled":boolean}`. It refuses browser Origin
headers. No CORS or Telegram token is granted to Genie. Saved gate state wins over
`TELEGRAM_BOT_ENABLED` across code restarts/releases; redeploying with false does
not override an already enabled stored gate. No automatic start/shutdown toggle.

## Local tests and Cmder commands

Each command below is a separate single line in Cmder, from this repository.
Node 20.19+ supports the local app/tests; pinned Wrangler 4.151.0 requires Node 22+.
`scripts/wrangler.mjs` uses the current Node if sufficient, otherwise the installed
Codex Node 24 runtime; on another machine install Node 22+ before using Wrangler.
Do not downgrade to a vulnerable CLI to work around the runtime requirement.

```bat
cd /d C:\Users\user\PycharmProjects\AtlasCRM
npm ci
npm test
npm audit
npm run worker:check
node scripts/check-market-secrets.mjs
"C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" scripts/worker-smoke.mjs
```

Smoke testing requires the fresh dry-run bundle. It runs the actual local workerd
runtime with SQLite and fictional bindings; every supplier/Telegram request is
intercepted, including Google's keys for a fictional signed Firebase token.
It never reads `.env` or `.dev.vars` or registers a webhook. `npm run
worker:dev` uses real local `.dev.vars`; leave its bot gate off unless deliberately
testing messages, and never run polling alongside webhook delivery.

## Future release — explicit approval required

These commands are prepared instructions and have **not been executed**. First
review the existing Worker's code/configuration, save its current version ID and
bindings, and confirm the existing `atlas` script in the correct account. Login
is interactive; do not use a temporary Worker/account. The read-only commands:

```bat
node scripts/wrangler.mjs login
node scripts/wrangler.mjs whoami
node scripts/wrangler.mjs versions list --name atlas
node scripts/wrangler.mjs deployments list --name atlas
node scripts/wrangler.mjs secret list --name atlas
npm run telegram:webhook-status
```

After explicit approval, set the table's nonsecret dashboard variables, keeping
the bot off. Upload missing/rotated secrets using interactive prompts (never place
their values in shell arguments). Secret changes can themselves release a Worker
version, so they belong to the same approved release window:

```bat
node scripts/wrangler.mjs secret put CANBOSS_BUYER_API_KEY --name atlas
node scripts/wrangler.mjs secret put TELEGRAM_BOT_TOKEN --name atlas
node scripts/wrangler.mjs secret put TELEGRAM_WEBHOOK_SECRET --name atlas
node scripts/wrangler.mjs secret put ATLAS_ADMIN_TOKEN --name atlas
npm run worker:deploy
curl.exe --fail https://atlas.meshstocks.workers.dev/health
```

The wrapper verifies existing versions before deployment; do not bypass a failed
check. Verify health identifies `atlas-market`, unsigned webhook requests get
401, wrong-origin catalog gets 403, and Genie Check status confirms off. Health
alone does not verify bindings, credentials, supplier availability or bot readiness.

Copyable read-only unauthenticated boundary probes (after approved deployment):

```bat
curl.exe -i -X POST https://atlas.meshstocks.workers.dev/webhooks/telegram -H "Content-Type: application/json" --data "{}"
curl.exe -i https://atlas.meshstocks.workers.dev/api/catalog/products -H "Origin: https://unapproved.invalid"
curl.exe -i https://atlas.meshstocks.workers.dev/api/catalog/products -H "Origin: https://atlascrm-c5722.web.app"
```

Expected statuses: 401, 403, then 401 in private mode (200/503 in public mode,
depending on supplier readiness). Use Genie Check status for authenticated admin
verification; do not put bearer tokens into command arguments.

For the separately approved Telegram cutover, stop the operator's current polling
process deliberately (Ctrl+C in its own terminal). It was not interrupted during
preparation. Inspect webhook status; if it belongs to another integration, review
before replacement. Registration preserves pending updates and uses one connection:

```bat
npm run telegram:webhook-register
npm run telegram:webhook-status
```

Only after verifying the callback should the operator select Bot on in Genie.
Send an operator test command in the approved group; activation does not broadcast.
Pending updates delivered while off are discarded, so keep the cutover window
short and issue a fresh test command after activation.

For the separately approved frontend release, choose private/public access first,
then set the fixed public backend address locally and stage/release browser assets:

```bat
node scripts/configure-catalog-worker.mjs https://atlas.meshstocks.workers.dev
npm run build:hosting
firebase deploy --only hosting --project atlascrm-c5722 --non-interactive
```

This includes current uncommitted browser changes: review the staged release as a
whole before approval. It does not deploy Firestore rules/indexes. Frontend config
currently remains local/empty; Firebase production has not changed.

## Quotas and rollback

Official Cloudflare documentation checked 2026-10-14: SQLite Durable Objects are
available on Workers Free. DO Free allowances are 100,000 requests/day (including
alarms), 13,000 GB-s/day, 5 million rows read/day, 100,000 rows written/day and 5 GB
total storage. Free per-object storage is 1 GB. KV-style get/put/list/delete on this
SQLite object still count as row operations; alarm updates and deletes count as
writes. Platform Worker limits also apply. Exceeding Free limits causes failures;
limits reset at 00:00 UTC (06:00 Asia/Dhaka). Paid plans have separate allowances
and charges. These are shared quotas, not guaranteed capacity for Atlas.
Sources: [DO pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/),
[DO limits](https://developers.cloudflare.com/durable-objects/platform/limits/),
[Worker pricing](https://developers.cloudflare.com/workers/platform/pricing/).

The cache, receipts and cooldowns justify minimal durable storage. No payment
ledger, general customer database or queue is introduced. Serialization can delay
requests/admin confirmation during slow supplier/Telegram I/O; monitor latency,
quota use and failed webhook delivery before increasing traffic.

To stop replies use Genie Bot off and confirm the returned state. For code rollback,
use the recorded previous Worker version in the Cloudflare dashboard or approved
`node scripts/wrangler.mjs rollback <VERSION_ID> --name atlas`; do not remove or
recreate the Durable Object namespace/migration. Code rollback does not restore
stored gate state, secrets or schema. Preserve bindings and verify off afterwards.
Revert Firebase to its previous Hosting release separately. Returning to local
polling requires an explicitly approved Telegram webhook removal (`deleteWebhook`
without dropping updates); only then start `npm run telegram:catalog`. No automatic
webhook removal/registration occurs on local bot startup. If the prior Worker code
does not handle this callback, arrange webhook rollback before reverting it.
