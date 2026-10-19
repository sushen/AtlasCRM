# Deployment

## Branch-first workflow (2026-10-19)

The operator requires local tests → online feature-branch preview → explicit
acceptance before merging to master. CI checks and an isolated fictional-data
GitHub Pages preview are prepared; no production deployment occurs on branch push.
See [CI_CD.md](CI_CD.md) for commands, preview limits and promotion procedure.

## Inventory / second-source activation pending — 2026-10-19

This task did not deploy or enable these features. A backed-up keyring was prepared locally with restricted permissions. Inventory
activation requires uploading it as the server-only `INVENTORY_KEYRING`, existing same-project Firestore reference
access and `INVENTORY_ENABLED=true`. Multi-source publication separately needs
`NAM_RESELLER_TOKEN`, `NAM_RESELLER_CURRENCY=USD`, a healthy API/product contract,
reviewed exact mappings and `MULTI_SUPPLIER_ENABLED=true`. Both flags default off.
Preserve all live bindings, current webhook/SQLite state and old encryption keys;
no rules/indexes migration is required. See `INVENTORY.md` for release/rollback.
All 186 tests, Worker dry-run, mocked inventory and existing checkout runtime
smokes pass. No supplier purchase, production data write or credential upload.

## Username leads and customer purchases released — 2026-10-19

Operator explicitly authorized deployment after choosing one field for phones or
WhatsApp usernames. Final Hosting version `032367feb64213c5` releases 46 public
assets; Worker `94bcda47-3190-484e-a7d6-d063eb579b67` updates private help text.
All 32 live bindings, partner tracking, SQLite state and webhook are preserved.
No Firestore rules/indexes or real customer/purchase/order/payment were changed.

All 166 tests, 14 final focused checks, Worker dry-run, private-value scan and
390px visual checks pass. Live browser assets match source and private files
remain 404. Health/public catalog/auth/CORS/shop-readiness checks pass. No real
Telegram message was sent. Hosting used the official API with existing login;
release/rollback receipts are private under `.worker-private/customer-workflow-*`
and `.worker-private/customer-workflow-final-*`. Previous Worker for rollback is
`8da1ef61-f972-45c9-b803-68a3513ec0f8`; previous Hosting `067ddecb266c56ec`.
No command-scope update was needed: `/addlead` and the same route already existed.
See `WHATSAPP_USERNAMES.md` and `CUSTOMER_PURCHASES.md` for operator use/limitations.

## Quick Add released — 2026-10-19

Operator approved Hosting and private Telegram menu deployment. Hosting version
`067ddecb266c56ec` released 43 public assets; all verified browser assets match
local source and private source remains 404. Existing `atlas` Worker version
`8da1ef61-f972-45c9-b803-68a3513ec0f8` preserves all 32 live bindings and state.
Private admin commands include `/addlead`; public scopes were not changed.
Existing webhook registration, Firestore rules and business records were untouched.

All 152 tests, Worker dry-run, mocked manual-payment smoke and private-value scan
passed. Live health, public catalog, webhook auth, CORS and enabled shop checks
passed. Firebase CLI stalled before upload and was stopped; the official Hosting
API completed release using the saved login and prior Hosting config. Cloudflare
login refreshed normally. Rollback source/settings and release receipts are saved
privately in `.worker-private/quick-add-*`; no private files enter Hosting.
Previous Worker: `6ee6cc99-ec56-49b0-9392-d1e76128760f`. No test Telegram message or
production lead/order/payment was created. Operator should request `/menu` and
confirm phone sign-in and their next deliberate real enquiry. See `QUICK_ADD.md`.

## Telegram labels released — 2026-10-19

Worker `6ee6cc99-ec56-49b0-9392-d1e76128760f` adds the operator-selected text and
standard emoji polish. All 32 production bindings were preserved; 43 affected
tests, Worker dry-run, private-value scan and live health/catalog/access/shop
checks passed. No Hosting or webhook release, real test message or order change.
Prior Worker: `49d038e3-5324-446d-8da2-31e1399043c0`; private rollback snapshots
and logs remain under ignored `.worker-private/`.

## Telegram brand cards and readable details released — 2026-10-19

Existing `atlas` Worker version `49d038e3-5324-446d-8da2-31e1399043c0` and
41-file Firebase Hosting site are released with formatted product details,
actual mapped brand-logo photos and in-place price/stock refresh. All 32 live
bindings are preserved. All 145 tests, Worker dry-run, mocked workerd/SQLite
manual-payment smoke and private-value scan pass. Live health/access/shop checks,
all 374 supplier price comparisons and Hosting source matching pass. Private
source routes remain 404. No real Telegram message or channel edit was used for
verification; provider-rendered appearance awaits the next incoming user request.
Prior Worker: `50649c23-93ee-43d4-b85d-7390962409c1`; private rollback snapshots
and release logs are retained under ignored `.worker-private/`.

## Scarcity pricing released — 2026-10-19

Operator approved live release of the stock-based 10–40% catalog markup. Existing
`atlas` Worker version `50649c23-93ee-43d4-b85d-7390962409c1` preserves all 32
production bindings and enabled partner tracking. Firebase Hosting released the
41-file staged site. All 142 tests and Worker dry-run passed; configured private
values were absent from the public assets and Worker bundle. Live read-only
checks matched all 374 prices to current supplier normalization across all tiers.
Health, catalog, CORS, webhook authentication and enabled bot/shop readiness
passed; live Hosting assets match source and private source paths return 404.
No order/payment, Firestore rule, webhook registration or channel-post mutation.
Prior Worker for rollback: `fe7e275e-0078-410e-bd3b-aebb018ea3b6`. Private settings
and source snapshots plus release logs are under ignored `.worker-private/`.
See `CATALOG.md` for tier boundaries, fallback and saved-quote behavior.

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


## Partner tracking released — 2026-10-16

Explicit operator approval supersedes the preparation hold below. Worker version
`23d7754c-43ef-4ad2-9022-aa0c79335374`, additive Firestore rules and Firebase Hosting
are deployed. The CRM sidebar now includes Partner tracking; `/?partners=1` is the
direct portal. Production tracking is enabled, with existing 29 bindings preserved
and two new encrypted partner secrets. `PARTNERS.md` documents operation; the checked-
in feature flag remains false and future releases must explicitly preserve the
approved live flag/settings. No webhook change or business transaction was made.

## Partner extension deployment hold — 2026-10-16

Partner attribution and dashboards are prepared but disabled/undeployed. Do not
deploy Worker, Hosting, rules, upload secrets, or modify the registered webhook
without operator approval. The same Worker/DO and Firebase project must be reused.
Required identity/IAM, feature-gate, secret, release/rollback and live-verification
details are in `PARTNERS.md`. Preserve the approved private manual-payment bindings
when preparing a release; checked-in defaults are not the live configuration.

## Readable payment instructions and copy controls — 2026-10-15

Released the payment presentation update to the existing Worker. New and reopened
payment instructions use escaped HTML headings, separated amount/recipient/ID
fields, short steps, a concise QR caption, and native Telegram copy buttons for
the receiving UID, name, numeric amount and order ID. Values come from the saved
order quote; copy amounts omit grouping/currency and retain payment precision.
Existing messages are unchanged until the buyer reopens payment details.
Manual approval, quote validation, amount calculation and orders are unchanged.
All 106 tests, mocked workerd payment smoke and dry-run passed. Telegram accepted
a clearly labeled non-payment preview with recipient copy buttons sent silently
to the single configured private admin; no order/payment was created.

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

## Direct bot navigation — 2026-10-15

Website general Telegram actions now resolve the Atlas channel destination to
the private shop bot, while valid product links retain their selected product.
Unknown configured destinations retain existing behavior. Labels say Open shop
and Shop in Telegram. Existing channel welcome photo was updated with the supplied
logo, its Browse catalog button opens the bot, and it was pinned and verified
without creating another post. Hosting-only release completed and live browser checks confirm all three general
shop links open the bot; product selection links are preserved. Live files match
local source and private source routes still return 404.
All 13 catalog tests pass; staged public assets contain no configured secrets.
Worker, payment activation, orders and CRM policies are unchanged.

## Supplied Atlas logo — 2026-10-15

Original operator-supplied JPEG is preserved unchanged at
`images/brand/atlas-logo.jpg`. Market header/hero, private CRM sidebar/sign-in,
favicon and local Telegram preview use this identity. Telegram channel and bot
profile photos were updated and verified through the Bot API. Product artwork
is preserved. Future channel welcome publications use the logo; existing public
post text/buttons are untouched. Hosting-only release completed (37 public files); changed browser assets and the
original logo match live bytes, with private source routes still returning 404.
All 104 tests passed and the staged-secret scan was clean.
No Worker/payment activation, order migration or Firestore policy change.

## Manual checkout preparation — 2026-10-15

New manual Binance payment infrastructure is local/tested and disabled. No Worker
or Firebase deployment, secret upload, QR message, webhook/gate change or order
migration is authorized by this task. Existing production remains at the prior
release. Workers need a same-bot QR file ID or a verified actual payment link;
the private laptop image cannot be bundled. Preparation and explicitly gated
future commands are in `BINANCE_PAY_SETUP.md`. Resolve Telegram's Stars rules
for digital goods before approving activation; manual review does not waive them.

The visual refresh releases 36 browser/image assets. Hosting now returns
`Cache-Control: public, max-age=0, must-revalidate` so files are revalidated on
future visits. Catalog entry imports/CSS also carry the rollout version to bypass
previously cached hour-long assets. Six JPEGs and current HTML/CSS/JS were verified
byte-for-byte against local files; private sources remain 404. Channel posts
updated in place with photos, preserving message IDs.

## Shop image assets

Hosting staging now includes public `images/` alongside HTML/CSS/JS. Six original
JPEG product-family cards live in `images/shop/`; no customer photos/private media
belong there. Node static routes allow only these six named JPEGs and continue to
deny backend/private files. Publish Hosting before deploying bot image URLs and
updating channel media. Preserve channel publication receipts to edit the existing
posts in place; no deletion/rebroadcast is required.

## Channel shop activation — 2026-10-14

User-approved existing Worker shop release completed, with private admin/contact
secret bindings and one SQLite order store. No local polling process was found;
Telegram webhook registered without dropping pending updates, checked healthy,
and hosted bot gate enabled. Six silent channel posts published, welcome pinned
and buyer/admin command scopes configured/verified. No Firebase release was needed.
Do not restart local polling with the webhook present. All 82 tests and mocked
local workerd shop flow passed. No live payment/order/supplier purchase was tested.
Rollback Bot off preserves order data; see `TELEGRAM_SHOP.md` for operation/rollback.

## Public catalog release — 2026-10-14

User requested removal of Market sign-in. Existing Worker public-catalog setting
is released and an unauthenticated allowed-origin request returned 394 products.
Firebase Hosting release removes catalog authentication imports/prompts/controls.
CRM operator-only rules are unchanged; Google/email remains for the private
workspace. Telegram links remain the enquiry route, with hosted bot off and local
polling untouched. All 73 tests pass; no commerce/payment/purchase flow was added.

## Google login release — 2026-10-14

User-authorized public Google sign-in routes Market buyers separately from CRM.
The existing operator received `atlasOperator:true`, then tested operator-only
Firestore rules were compiled/released before the 28-file Hosting release.
Prepared and deployed rules passed 275 fictional simulations; 73 app tests passed.
Live website files match local source. No indexes or customer data changed.
Do not restore broad authenticated-user rules; see `AUTHENTICATION.md`.

## Existing Worker release — 2026-10-14

With user authorization and OAuth completed, the existing `atlas` Worker was
verified and deployed with private catalog access and persistent bot-off gate.
Supplier/bot credentials are encrypted secrets; separate admin/webhook secrets
are configured. Live health/auth/CORS/off-state checks passed. The frontend
endpoint is configured and the connected Hosting release completed, including
the signed-out login message. All 12 catalog tests passed after that adjustment.
Telegram webhook registration/activation remain pending; local polling is untouched.

## Latest website release — 2026-10-14

User-approved Hosting-only release completed for atlascrm-c5722 from 27 staged
browser files. Atlas Market shell is now published at `/?catalog=1`, while its
live catalog connection remains pending Cloudflare login/backend deployment.
Frontend Worker origin remains empty/local. Firestore rules/indexes, Cloudflare
secrets/Worker and Telegram webhook/gate were not changed. Local polling remains.

## Atlas Market Cloudflare preparation

The existing lowercase `atlas` Worker is the approved naming target; Firebase
Hosting remains the frontend. No Worker deployment, secret upload, hosted bot
enable, Telegram webhook registration or Firebase release was performed.
Cloudflare login is needed to verify the existing script before deployment.
See [CLOUDFLARE.md](CLOUDFLARE.md) for exact Cmder commands, approval gates,
Node 22+ tooling, configuration, polling cutover, quota limits and rollback.
Do not create/delete a replacement Worker or stop local polling automatically.

## Architecture

The operator has selected local outbound sending instead of Cloud Run. The local
Windows service (`npm run start:local`) now connects to the existing Firebase-hosted
CRM through restricted loopback CORS. It reuses existing credentials/CLI login and
does not require enabling cloud billing. The documented Cloud Run path below is
optional; incoming/status webhooks still need a public HTTPS endpoint and app secret.

The local-connection UI was released to Hosting on 2026-10-05 using 17 staged
browser files. Live application/client/endpoint modules were checked against local
source. The local service is running after successful read-only readiness probes.
Real sending remains an explicit operator action and browser connection permission
must be granted when requested. The localhost setting does not work from another
device unless that device also runs its own configured local service.

Firebase Hosting serves browser assets staged in `.firebase/hosting-public` by `npm run build:hosting`. Firebase Authentication and Firestore provide private data services. `firebase.json` points to the staging directory, rules file, and indexes file. The optional Node WhatsApp backend needs separate public HTTPS hosting; no backend rewrite/deployment exists yet.

## Checks before deployment

Configure the correct Firebase web config, enable Email/Password Authentication, create an authorized user, review rules for the intended ownership model, validate indexes, remove test data, and confirm no secrets or customer exports are staged.

## Commands

After installing the Firebase CLI and selecting a project, the expected setup commands are `firebase login` and `firebase use <project-id>`. A Hosting-only release was successfully deployed on 2026-10-05 using an existing CLI login; full deployment of Firestore rules/indexes was not performed.

For a Hosting-only release, run `npm run build:hosting` immediately before `firebase deploy --only hosting --project atlascrm-c5722 --non-interactive`. Only `index.html`, `login.html`, `404.html`, `css/`, and `js/` are staged. The staging script clears the verified fixed staging directory before rebuilding it. This avoids uploading backend code, private files, docs, tests, dependencies and diagnostic copies. It does not deploy Firestore rules or indexes. Earlier releases used a temporary public directory; root Hosting configuration now also uses safe staging.

The Cloud API backend has not been deployed and secrets were not uploaded.
Deploy it with Node 20.19+, HTTPS, environment settings, and least-privilege
Firebase Admin identity; configure its exact `/webhooks/whatsapp` callback only
after it is publicly reachable. Review/deploy the additive Firestore rules before
browser duplicate merging of messages. See `WHATSAPP_SETUP.md` for all settings.

The web dialog calls same-origin `/api/whatsapp/config` and
`/api/whatsapp/messages`; a static-only release cannot enable those routes.
The included Dockerfile starts Node directly for Linux hosting. Configure its
approved Firebase-user UID list alongside runtime secrets and Admin credentials.
After deploying a backend, add the documented Cloud Run rewrites for the API
and webhook; do not deploy a rewrite referencing a nonexistent service. Backend
and rewrite deployment remain pending and have not been initiated by this task.

## After deployment and rollback

On 2026-10-05, the direct-send UI was deployed using the Hosting-only command and
the new additive policies using `firebase deploy --only firestore:rules --project
atlascrm-c5722 --non-interactive`. The live browser modules match local source and
rules compiled/released successfully. Indexes were not deployed. Cloud Billing is
disabled, blocking the planned Cloud Run backend; missing Meta app secret, Graph
version and approved-user configuration also prevent activation. No backend
rewrite was added to Hosting. The known site continues serving the browser app
with direct sending disabled and manual WhatsApp links available.

Verify login redirect, customer reads, import behavior, activity timeline, follow-ups, and browser console errors in the deployed origin. Keep the previous Hosting release and rules configuration available for rollback; do not roll back rules without checking data exposure.
