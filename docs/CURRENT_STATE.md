# Atlas CRM - Current State

## CRM source and production release completed — 2026-10-19

Reviewed CRM workflow source was committed/pushed as 20a42c6 on the current feature
branch. Both GitHub CI runs passed; master remains unchanged. Worker
9366fb41-023c-4a30-8f34-dbb20304a30f now enables operator-only inventory against
the shared Firestore ledger with the existing keyring. All 34 prior bindings,
Telegram behavior/settings, order/payment/partner state and webhook were preserved.
Firebase Hosting 55d9112a6ca382dc released all 54 public assets, whose live hashes
match staging. Private file probes return 404, Worker health is 200 and anonymous
inventory is denied. Existing Telegram webhook remains connected, zero pending.
NAM and automatic WhatsApp capture/replies remain inactive. Signed-in production
UI verification still awaits the operator's live Firebase login in the browser.
See DEPLOYMENT.md for receipts and rollback; earlier local-only entries are history.

## CRM publication authorized — 2026-10-19

Operator explicitly requested source commit/push and release of the reviewed CRM
to Firebase Hosting, with its required operator-only shared-Firestore inventory
backend. Pre-release checks: all 227 tests, Worker build, inventory and checkout
runtime smoke tests and public secret scans passed. Existing bot behavior/settings
and live records must be preserved; NAM and WhatsApp automation remain off. Source
stays on the current feature branch, without merging master. Actual release
verification/receipts will be recorded at completion.

Latest dealer-intake clarification: supplier selection fills name/source/price,
while delivered email, username, password and 2FA are entered manually in separate
fields. Structured account entry is validated, masked for password/2FA and cleared
after save; other license formats remain separate. Customer-delivery projection
excludes 2FA and can include a separate username. All 28 affected supplier/inventory
tests pass, including form submission with fictional credentials. Local assets
rebuilt; no real additional inventory, customer message or production release made.

## Owned inventory receipt form shown — 2026-10-19

Owned inventory now appears above supplier offers with Add purchased inventory.
That action focuses supplier search; Record manual purchase opens the completed
dealer-purchase receipt. Reusable account adds account label, supplier years,
warranty hours and optional short-offer fulfillment links; the source product
is included automatically. No source purchase/payment is initiated. Both existing
accounts are visible at USD 3.28 cost each; no third account was saved while
demonstrating the form. The chat browser visibility control was explicitly enabled
after app screen context showed the panel closed; screen context then confirmed
the right browser panel open/focused with the receipt form retained. All 226 tests
pass. Latest local source changes remain uncommitted and not production deployed.

## Short access slices on reusable accounts — 2026-10-19

Latest operator clarification: the underlying K12 education account has a two-year
supplier plan and 24-hour warranty, but customers buy independent short access
terms and may renew onto the same owned account. Two real accounts are linked to
the identified catalog offer, with confirmed acquisition cost USD 3.28 each
(USD 6.56 total). Both customer purchases/account allocations are recorded.

An agent initially treated the second offer's USD 4.19 catalog selling price as
the paid amount and its supplier two-year term as the customer's expiry. Those
assumptions were corrected with an explicit audit event and private operation
receipt: the second paidAmount is null, paymentStatus is paid_amount_unknown,
and expiryDate is null with expiryUnknown:true. The catalog reference price remains
USD 4.19. The two purchases/assignments remain; confirmed paid totals are USD 1,
not USD 5.19. Exact second customer access length and amount actually paid still
need confirmation. Historical activities are preserved alongside the correction.

Assign product is now available on the focused customer page, selecting a saved
catalog product and matching owned account. Supplier durationYears never fills the
customer expiry; explicit access-days selection calculates it. Actual amount paid
must be entered deliberately. If purchase save succeeds but allocation fails, retry
completes the same allocation without resaving a purchase. Shared accounts remain
reusable; capacity is unspecified rather than assumed unlimited.

The default account-details UI uses an operator-only deliveryDetails projection
that returns only email/password. 2FA secrets stay in the existing private vault
and are absent from customer delivery payloads. No external login or credential
send was performed. Expiry is tracking only; no actual access revocation is built.
All 225 project tests, Worker dry-run and both mocked inventory/checkout runtime
checks pass. Local backend restarted with latest code. Actual browser verification
shows two customer purchases and two inventory accounts at USD 3.28 each. Assign
product successfully selected the K12 listing, either owned account, and an unsaved
three-day draft (expiry Oct 22); the draft was discarded, not saved as a third sale.
Browser now returns to the focused customer case. Private-value scans pass; source
contains no real account credentials or customer number. These source changes are
uncommitted and not released to production.

## First real customer journey and owned accounts — 2026-10-19

At explicit operator request, two supplied accounts were recorded in shared
Firebase owned inventory using existing storage protection and privately verified;
the restricted plaintext intake file was removed. These are reusable account assets
with per-purchase access allocations and unknown capacity, not two sellable seats.
At initial intake, acquisition costs/dates/account expiry were unrecorded. One account was
allocated to the confirmed ChatGPT USD 1 one-day purchase starting Oct 19 and
expiring Oct 20. One atomic CRM write recorded purchase/subscription/activities and
qualified the existing lead as customer while preserving prior history. No message,
external login or delivery was invented or performed. The second student purchase
awaits its paid amount/currency and access term.

Local views now show account labels/allocations and the actual recorded business
timeline. All 36 affected inventory/journey/sales tests pass. Static local assets
were rebuilt. Automatic approval review rejected the combined preview-process
restart command with only “blocked by policy”. A later narrow restart, after
verifying the exact local-preview process, succeeded; the backend now loads the
shared-account code. Subsequent browser inspection of the normal loaded page
succeeded: the actual customer, one recorded purchase, paid amount, start/expiry
and Account 1 assignment are visible together in a top overview card. The misleading
global Purchase-stage counter is hidden on a focused customer page; stage counts
are labeled explicitly in the all-journeys view. Six focused journey tests pass.
No production deployment, new source commit or master merge was performed.

## Automation focus: local customer journey workspace — 2026-10-19

Operator redirected development toward the connected customer journey rather than
number management. Inbox & journey / ?inbox=1 now brings actual Firebase people,
conversation activities, next actions, purchases, subscriptions and follow-ups into
one local screen. Business state is projected from evidence and never rewritten
by opening the view. No fabricated messages, customer writes or sends are used.
Generated local sending stays disconnected. Live automatic capture remains blocked
on approved WhatsApp number onboarding/public webhook; AI replies and reminder
execution are not enabled. See JOURNEY_WORKSPACE.md and WHATSAPP_LEAD_ALERTS.md.

## Feature-branch source synchronization — 2026-10-19

The operator requested GitHub synchronization after reviewing the functionality.
The source update includes shared Firebase/local inventory, supplier comparison,
private test bot, explicit live-offer publication and readable Telegram layout.
All 215 tests and preview isolation checks pass; staged files pass an actual
private-value scan. CI now checks both legacy and clean-menu checkout runtimes.
Source remains on the existing feature branch; master is not merged. The live bot
and shared Firebase product are current, while the newer dashboard has not been
released to Firebase Hosting. Earlier local-only notes below describe when those
changes were prepared and do not imply a Hosting release.

Latest real-bot presentation release: d58fb2c9-f931-41ea-84e9-a73b1802f4e3.
Product cards use short formatted duration/availability/payment sections and omit
internal references and the duplicate custom price line. All 34 bindings survive;
46 affected tests, Worker build/runtime smoke and secret scan pass. No real order
or payment was created. See DEPLOYMENT.md for rollback details.

## Approved real-bot release — 2026-10-19

The operator requested deployment of the reviewed Telegram presentation and
ChatGPT offer. Worker 1db2e38c-4679-4a39-8831-6be723c68e58 is released with all
32 prior bindings preserved, plus explicit product publication and clean-menu vars.
The live bot now reads the one allowlisted Firebase offer, shows custom price
first, uses collapsible Menu and a single Buy action, and lists all categories.
Existing payment/order/partner state and webhook are preserved. Real-bot command
menus/Menu button were read-verified. Health/public supplier catalog checks pass;
all 215 tests, Worker build, mocked checkout/delivery and secret scans pass.
Inventory/NAM and Hosting remain unreleased; master is not merged. See DEPLOYMENT.md.
Actual Telegram Web verification on the real Atlas Market Bot confirmed the
published offer, price-first card, single Buy button and native Menu. No real order
or payment was created for verification.

## Separate Telegram test identity created — 2026-10-19

Official BotFather created Atlas Test (@AtlasCrmSandboxBot) as requested.
Read-only Telegram API checks verified its identity and absence of a webhook.
The token is saved in ignored, access-restricted `.worker-private/telegram-test.env`;
no token is in source control. The separate local sandbox reuses live shop handlers
for catalog, profile/history, isolated test orders, references/evidence, admin
review and delivery queues. Private operator access and outbound recipients are
guarded. Test checkout has no payable destination or QR; every reply is labeled.
Read-only checks verified 373 supplier products plus the USD 1 / one-day Firebase
offer. All 210 project tests pass, including full isolated test-order delivery.
Test order/polling state is separate. This computer must remain running for replies.
Telegram UI verification confirmed the 374-listing shop and the custom offer's
USD 1 / one-day details. The phone command-menu failure was traced to missing
setup methods in the shared Telegram API allowlist, corrected and read-back
verified on the test bot. Products now puts custom offers directly after all
category buttons with no main-category Next pages. General navigation has since
moved into Telegram's collapsible Menu; old permanent keyboards are removed by
replies and the inline grid contains product/category choices only. Product detail
now has one Buy action and no channel, refresh, comparison or contact buttons.
The separate Atlas offers keyboard button is removed. Large individual family
lists retain plan pagination. Worker dry-run and all 210 tests pass after the
correction. Telegram UI verified the direct custom offer and inline navigation
at the bottom of the complete category list, with no category Next button.
The subsequent Menu-only/one-Buy-button simplification passed all 55 affected
sandbox, payment, shop and catalog tests. This latest revision stays local.
Partner referrals/channel publishing are not connected. Production bot and webhook
were untouched. See TELEGRAM.md.

## First operator-defined custom offer — 2026-10-19

The operator subsequently identified this as a ChatGPT offer and requested price
first. The existing record was transactionally renamed and read-verified as
“ChatGPT — 1 day”, retaining its ID, USD 1 price and one-day term. Sandbox offer
buttons, overview and detail heading now read “USD 1 · ChatGPT — 1 day”. Existing
saved order quotes are unchanged. All 12 focused sandbox-shop checks pass.

The operator originally requested and named the custom offer “one day one USD”.
It was created and read-verified in the existing Firebase products collection with
price 1, currency USD, durationDays 1 and active true. Duplicate/conflicting-name
checks preceded the write; no existing product was overwritten. This is a real
operator-authorized product record, not test stock or a customer purchase. It has
not been published to the live Telegram shop, assigned, purchased from a supplier
or delivered. It is visible in the private sandbox bot for operator review.

The local custom-product form now accepts name, selling price, currency and term
in days. Currency is retained by createProduct. The local bundle was rebuilt and
all 24 focused inventory/comparison checks passed. Latest code remains local.

## Supplier-first local dashboard — 2026-10-19

All 194 tests, Worker build and mocked runtime checks pass. The signed-in local
dashboard is verified with real Canboso offers/costs. Supplier comparison is first;
the numeric per-product stock breakdown is collapsed by default. Sidebar entry is
Suppliers & inventory. No actual procurement, inventory/product write, customer
message or production deployment was performed by the agent. Latest changes remain
local for review; existing GitHub preview does not contain them yet.

Operator rejected a product-definition-first workflow. Local dashboard and inventory
now lead with real supplier offers, searchable per-plan availability and comparison
of up to four selected offers. Missing source keys and unavailable acquisition
prices are labeled; retail price is not substituted as supplier cost. Recording
an already-completed manual supplier purchase verifies the offer server-side and
links an internal product reference automatically. No supplier order/payment is
invoked. Custom product creation is an optional special case only. Purchased units
then link to customer paid purchases/subscription terms through the existing flow.
See SUPPLIER_WORKFLOW.md. These changes remain local and unreleased.

## Actual Firebase-connected local workspace — 2026-10-19

Local login correction: existing Firebase auth domains include localhost, not the
numeric 127.0.0.1 host. Entry/login redirects now use localhost and preserve query
parameters. No auth configuration or security settings were changed.

Latest validation: 191 tests pass; Worker build, mocked inventory and checkout
runtime checks pass. The local service is running as a hidden background process;
HTTP 200, real Firebase module and login redirect were verified. Anonymous inventory
access is denied, and tests cover rejection of buyer claims and forged browser
references. Searchable per-product stock breakdown is added. Changes remain local,
not committed/pushed or deployed after the latest local-first clarification.

Operator clarified shared Firebase from the start: APIs supply offers, owned units
record actual procurement, and customer purchases/subscriptions link to those units.
Local service now runs with actual Firebase browser auth and server-side operator
token/reference validation at http://localhost:3199/. A read-only probe of the real
inventory collection succeeded, the real Firebase module is served, and anonymous
inventory reads return 401. No customer/inventory record was written for verification.

Node and hosted Firestore adapters share server-only atlasInventoryState logical
keys, hashed IDs, JSON payload and server timestamp format. This supersedes routine
local-data promotion; records already in Firebase need no copying when releasing
code. Hosted inventory remains undeployed and must use INVENTORY_STORAGE=firestore
and the existing backed-up keyring to access the same data. Prior local test data
was not migrated. Changes remain local for operator review. See LOCAL_WORKSPACE.md.

## Inventory promotion direction — planned 2026-10-19

The operator requires local inventory to remain usable during development and
approved real local data to be promoted into Firebase when going live. The target
is shared inventory business logic with local-file and server-only Firestore
adapters, plus explicit dry-run/import/reconciliation. Code push is not data push.
No automatic production upload, live import or storage migration has occurred.
See `INVENTORY_PROMOTION_PLAN.md` for reference mapping, encryption-key continuity,
trial-data exclusion, retry safety and rollback. This supersedes the earlier
Worker-SQLite-only hosted inventory direction; that prepared code remains unchanged.

## Local inventory review workspace — 2026-10-19

The operator clarified local browser review should precede GitHub and deployment.
A loopback workspace uses actual encrypted local inventory and real supplier reads,
with separate browser-local customer/purchase test references. It has no fictional
seed stock or production writes. See `LOCAL_WORKSPACE.md`. Latest changes remain
local for review; no merge or deployment is implied.

## Visual stock overview and real catalog preview — 2026-10-19

The feature branch compares owned availability, supplier breakdown and combined
potential counts with headline cards and horizontal bars. Supplier fetch failures
preserve owned totals; unknown/stale data are labeled partial. The user rejected
simulated data for online catalog review: the preview build now fetches the real
public catalog snapshot, shows its timestamp and contains no fictional seed stock
or customers. Private inventory remains Not connected; no fabricated combined
stock is shown. Supplier toggles and private mutations need isolated staging.
This is a branch/preview change only; production Firebase/Worker is unchanged.
See `CI_CD.md` and `INVENTORY.md`.

## Branch-first workflow (2026-10-19)

The operator requires local tests → online feature-branch preview → explicit
acceptance before merging to master. CI checks and the isolated GitHub Pages preview are live on the
`codex/quick-add-lead` branch. Initial commit `ca47fae` passed all checks and was
published at `https://sushen.github.io/AtlasCRM/`. Draft PR: `sushen/AtlasCRM#1`.
Master remains at `853a4dd`; no production deployment occurs on branch push.
See [CI_CD.md](CI_CD.md) for commands, preview limits and promotion procedure.

## Private inventory and second supplier — prepared 2026-10-19, not deployed

Implemented gated operator-only owned-stock receipt/assignment/reveal/delivery,
server encryption and reference validation, persistent per-supplier on/off controls,
and a visual stock comparison on the CRM dashboard: owned availability, per-source
counts, deduplicated enabled-supplier availability and combined potential stock.
Unknown or stale supplier counts are labeled; refresh failures retain owned data. Disabling a source excludes its data
and invalidates cache without altering owned units or saved order quotes.
Private inventory in CRM and
Stock and credentials on purchase cards. Public supplier availability remains
separate from owned units. New source is `https://api.nam.qzz.io`; operator confirmed
USD and cheapest available comparable cost plus current margin. Exact mappings
and shared stock pools avoid name guessing/double-counting. Fresh GET-only NAM
adapter and combined catalog are prepared behind `MULTI_SUPPLIER_ENABLED`.

All 186 tests, Worker dry-run, mocked inventory workerd/SQLite flow and existing
manual-payment runtime smoke pass. Provider health/products returned HTTP 502;
no NAM token was present in saved private config, so its product wrapper is not
verified live. A server keyring and separate private backup were generated locally with restricted
permissions. No key was uploaded, feature flag enabled, production
record written, supplier order/balance endpoint invoked or deployment performed.
See `INVENTORY.md` and ADR 0006 for setup and remaining activation steps.

## Username leads and customer purchases — released 2026-10-19

Operator authorized one shared phone-or-username field and production release.
Hosting version `032367feb64213c5` serves 46 public assets; existing Worker version
`94bcda47-3190-484e-a7d6-d063eb579b67` updates the private Add lead help wording
and preserves all 32 bindings, partner tracking, persistent state and webhook.

Quick Add now accepts username-only leads, keeps phone/handle namespaces separate,
searches either identity and links purchases by stable customer ID. The profile
supports attaching purchased products, totals paid/outstanding by currency and
purchase/start/expiry dates, with retry-safe atomic history. No Firestore rule
change, automatic username-to-phone resolution, customer message or production
customer/purchase write was performed. The example customer's products, amounts
and terms remain unentered because those facts have not been supplied.

All 166 tests pass; 14 focused identity/sales checks passed again after numeric
username search isolation. Worker dry-run, private-value scan and 390px visual QA
pass. Final live Hosting assets match source; Worker health/catalog/auth/CORS and
shop readiness pass. Hosting used the existing saved login via its official API.
The saved checkout remains untouched; this worktree carries its preserved recent
changes plus the new implementation. See `WHATSAPP_USERNAMES.md`,
`CUSTOMER_PURCHASES.md` and ADR 0005. Automatic WhatsApp capture is still not live.

## Mobile Quick Add — released 2026-10-19

The operator approved deployment in voice. The 43-file Hosting release and existing
`atlas` Worker `8da1ef61-f972-45c9-b803-68a3513ec0f8` are live. All 32 production
bindings, partner tracking and the existing webhook/state were preserved. The
private admin slash-command menu includes `/addlead`; buyers' scopes are unchanged.
Request `/menu` in the bot private chat for the **➕ Add lead** keyboard, or open
`https://atlascrm-c5722.web.app/?quick-add=1`. Sign in as the existing CRM operator.

All 152 tests, mocked Worker/manual-payment smoke, private-value scan, Hosting
source matching and live Worker health/catalog/auth/shop-readiness checks pass.
The Firebase CLI stalled before upload; it was stopped, then Hosting was released
through its API using the existing saved login and preserving the prior config.
Cloudflare OAuth refreshed through the existing login. No Telegram message,
production customer/order/payment write, rule change or webhook registration was
performed. Phone sign-in and a deliberate real enquiry save remain an operator
acceptance check. Automatic WhatsApp capture is still not live.
The saved project's recent changes were preserved in this isolated worktree;
the saved checkout itself was not edited. See [QUICK_ADD.md](QUICK_ADD.md).

## Telegram text and emoji polish — released 2026-10-19

Operator chose clearer text and standard emoji without Premium. All recognized
catalog families have relevant emoji, menus have escaped HTML headings and spaced
price/stock fields, and navigation/order labels are clearer. Products replaces Buy
on the shop keyboard, with legacy input still accepted. Existing pricing, order
quotes and image cards are preserved. Worker `6ee6cc99-ec56-49b0-9392-d1e76128760f`
is live with all 32 bindings preserved. The 43 affected tests, Worker dry-run,
private-value scan and live health/catalog/access/shop checks passed. This release
changed only Worker code; no Hosting, webhook, customer-message or order mutation.
See `TELEGRAM.md`.

## Telegram readability and brand cards — released 2026-10-19

Readable escaped product headings, spaced descriptions, price/stock freshness and
in-place refresh are implemented with actual brand-logo photos on mapped family/
product selection. No Premium/custom emoji required; buttons remain text/emoji.
All 145 tests and Worker dry-run pass; see `TELEGRAM.md`. Live pricing was rechecked
against all 374 current supplier products; old messages retain earlier snapshots.
Existing Worker version `49d038e3-5324-446d-8da2-31e1399043c0` and the 41-file
Hosting release are live, preserving all 32 production bindings. Worker dry-run,
mocked workerd/SQLite manual-payment smoke, live health/access/shop checks and
Hosting source matching pass. No real Telegram test message, channel-post edit,
order/payment mutation or webhook change was made.

## Scarcity pricing — released 2026-10-19

Replaced the flat catalog markup with supplier-stock tiers: 1 unit +40%, 2–4
+30%, 5–10 +20%, 11+ +10%. Unknown/invalid/zero stock retains +10%; zero-stock
ordering remains blocked. Shared normalization supplies website, Telegram and
newly generated channel posts; existing quotes and published messages are preserved.
Catalog pricing metadata now describes the tiers. See `CATALOG.md`.
All 142 tests and the Worker deployment dry-run passed, including tier boundaries,
currency rounding, refreshed catalog display and saved payment quote preservation.
Operator approved live deployment. The existing `atlas` Worker is released as
`50649c23-93ee-43d4-b85d-7390962409c1`; all 32 production bindings were preserved.
Read-only checks matched all 374 live prices to supplier normalization, covering
all four tiers. Health, public catalog, CORS, webhook authentication and enabled
bot/shop readiness passed. Firebase Hosting released the 41-file staged site;
live assets including the pricing helper match local source, and private source
paths remain 404. No webhook registration, order/payment mutation or channel
publication was performed.

## WhatsApp enquiries and Genie alerts — prepared 2026-10-18

Added signed-message referral retention, transactional enquiry alerts, private
loopback feed and explicit manual capture with product interest/optional follow-up.
The local leads-only bridge passed existing Firebase read checks and Genie's
authenticated empty-feed read. No test customer was written to production. The full
140-test Atlas suite passes. The old saved Meta token currently returns HTTP 401;
the Business-app phone still requires supported Platform onboarding and public HTTPS
webhook setup. A fresh browser test token sent the authorized Hello World template
from Meta's test sender to the operator's real phone, and receipt was confirmed.
The operator approved linking that Business-app number to Meshstocks. Meta's
verification flow reported it already belongs to Cycle8, so the move was rejected.
Read-only inspection confirmed the real number under Cycle8's existing Sushen
Biswas WhatsApp Business App asset. No unlink or migration is needed merely to
inspect it. The documented Coexistence route requires a Solution Partner or Tech
Provider; the existing AtlasCRM app is not enrolled. Its irreversible Tech Provider
declaration was inspected but not submitted. The next decision is approved-provider
onboarding versus pursuing the business/access verification and app-review route.
No number was migrated, no webhook subscription changed, and no customer reply sent.
See `WHATSAPP_LEAD_ALERTS.md`. Automatic capture is not yet live.

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

## Admin partner UID directory — 2026-10-16

Partner tracking now shows an operator-only **Partner accounts** table with name,
partner ID, linked Firebase UID, status, selectable UID fields and Copy UID buttons.
It reuses the authorized list response. The 17 partner tests passed, including
escaping and strict admin-only directory rendering. Hosting-only release completed;
the Firebase CLI reported a connection error after its successful release response.
The partner account remains a partner; displaying its UID grants no CRM role.

## Partner tracking deployed — 2026-10-16

Operator explicitly approved deployment after noting the portal was absent from
the live CRM. Added **Partner tracking** below Supplier catalog in the CRM sidebar,
with the same portal also at `https://atlascrm-c5722.web.app/?partners=1`.
Released the existing `atlas` Worker version `23d7754c-43ef-4ad2-9022-aa0c79335374`,
enabled partner tracking and preserved all 29 prior bindings, including manual
payment settings. Two partner secrets are encrypted Cloudflare bindings; the
dedicated same-project Firestore identity has datastore.user access, with local
key backup restricted to the current Windows user/SYSTEM. OAuth/read and an empty
commit validated access without writing any Firestore documents.

Firebase partner rules and Hosting (41 public files) were released. Firebase CLI
reported a post-release error; a direct live rules read proved the exact policy
was released. Cloudflare's initial connection failure recovered on retry. All 128
tests passed before release. Live partner auth/origin/input boundaries returned
401/403/400 as expected; existing catalog, bot state and shop readiness passed.
The real partner sign-in page loaded in Edge without script or request failures.
Firebase Hosting version `7da34ebaf0b64872` was released at 13:48 Bangladesh time;
its six partner/sidebar asset hashes match the local release cache exactly.
No webhook registration/replacement, real referral/order/payment/payout, fake partner
or advertising spend was performed. Local Telegram webhook-info reads failed;
hosted shop readiness and preserved bindings were verified, but provider webhook
health was not independently re-confirmed from this computer. Authenticated portal
actions should be exercised by the existing operator with the intended partner data.

## Partner attribution and commission system — prepared 2026-10-16

Implemented behind `PARTNER_TRACKING_ENABLED=false`; no deployment, real partner/
customer/payment/payout mutation, ad spend or secret upload. Reuses existing SQLite
orders, manual Telegram payment/delivery, Firebase Auth and static Hosting. Adds
30-day first-touch referrals, 20-minute single-customer Telegram handoffs, immutable
order attribution/rate snapshots, BDT 10 default delivery-gated commission, idempotent
refund reversals, evidence-backed spend, explicit USD 100 maximum monthly approvals,
reserved/settled/cancelled payouts, partner-isolated reports/CSV and admin controls.
Durable retry outbox mirrors audit/accounting to Firestore REST; new profile/private
rules are additive and unreleased. See `PARTNERS.md` for required private bindings,
IAM, policy, limitations and approval-gated release sequence.

Verification: the final full suite passed all 128 tests, including 16 focused partner
tests and known-self-referral blocking. Prepared partner rules passed 64 fictional
Google Rules API checks; existing CRM boundaries passed all 275 simulated checks.
Worker dry-run succeeded (~136.59 KiB / 35.03 KiB gzip). Actual local workerd/SQLite
smoke passed signed-identity partner/admin isolation, referral-to-delivery BDT 10
credit and refund reversal, with all external calls intercepted. Headless Edge
desktop/mobile fixture checks had no script errors or horizontal overflow, and
partner accounts hid admin controls. Screenshots under ignored `.catalog-state/`
are clearly labeled fictional, not business results. Production Firestore credential/
IAM integration and an operator-controlled live journey still require release checks.
Hosting staging succeeded and a scan against eight configured private values found
no leaks in the staged browser assets or Worker bundle. The 46 affected partner,
payment and shop tests also passed after final order-state projection updates.

## Genie business reporting released — 2026-10-16

After explicit operator approval, the existing atlas Worker was deployed with
the additive admin business-report endpoint (version
`14042470-5b35-4885-b4ca-e76359267e4b`). The initial Cloudflare credential refresh
failed on connectivity; the IPv4-first retry succeeded. Six focused report tests
and the Worker dry-run passed before release. Genie's real service retrieved,
validated and saved a live report, while unauthenticated report access returned
401. Existing bot state remained enabled. No order/payment action, Firebase
deployment or webhook registration was performed. Reopen Genie to load the new
report/automatic-policy controls. Earlier prepared-only notes below are historical.

## Prepared Genie business reporting — 2026-10-16

Added an admin-only aggregate business-report route and read projection over the
existing shop order store. It separates reporting-window flows from current queues,
keeps currencies separate, omits buyer/payment evidence and discloses incomplete
coverage and unavailable profit/attribution metrics. No production deployment or
order mutation occurred. Live read checks confirm existing health/bot-state are
available and the new report route is not deployed (404). Genie integration and
saved 15-minute report/24-hour bot rules are prepared in its separate repository.
See `GENIE_BUSINESS.md` for the contract, limits and release requirements.

## Clear transaction-reference prompt — 2026-10-15

I Have Paid now opens a formatted prompt asking the buyer to paste the Binance
Pay transaction ID/payment reference as their next message, with a ForceReply
input placeholder. Technical slash-command syntax is omitted from this prompt.
After submission the receipt shows the saved reference and actual review status,
explicitly distinguishing receipt of evidence from confirmation of funds. Human
review remains required. All 30 affected tests and mocked workerd payment smoke
passed. Worker release completed and the live hosted shop remains enabled/configured.

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

## Public profile catalog links — 2026-10-15

Bot description, bot short About text and channel description now include the
public website catalog URL `https://atlascrm-c5722.web.app/?catalog=1`. Each
was read back and verified through Telegram. Existing descriptions were empty.
This changes profile text only; no deployment, order or payment behavior changed.

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

## Prepared manual Binance payment infrastructure — 2026-10-15 (not deployed)

Read the operator's complete pasted implementation request and inspected existing
catalog, private orders, admin review, Worker SQLite and Node polling/file storage.
Reused that infrastructure; no new framework/dependency or Firestore change.
Added validated modular manual provider/config and private checkout conversation
with Pay/I Have Paid/Cancel, persistent prompts, transaction references, optional
screenshot file IDs, under-review/admin confirmation/request-info, and separate
manual-delivery queue. Admin authorization now also lives in the order model;
evidence versions invalidate stale confirmations. Approved-reference claims and
state/audit writes are atomic. Duplicate submissions/reviews/fulfillment do not
repeat event notifications; failed/uncertain notifications recover through queues.

Schema v2 retains existing IDs/product quotes and legacy status projection, with
independent payment/delivery states, payable quote, username, timestamps/actors,
evidence metadata and notes. Legacy reads are lazy projections, not bulk migration.
Late already-paid references are retained/flagged; expired quotes cannot show new
Pay instructions. Buyers retain owned history only; admins see paginated active
and delivery queues. Supplier purchasing/payment verification/delivery remain human.

User explicitly selected 1 USD = 1 USDT as a business rule. It is saved locally
and snapshotted on new enabled-checkout orders after the existing single 10%
retail markup. Original supplied receiving JPEG copied byte-for-byte to ignored
`.payment-private/`, protected with current-user/SYSTEM Windows ACL and checksum.
Receiving UID/name/rate/QR settings prepared privately in `.env`/`.dev.vars`.
`MANUAL_CHECKOUT_ENABLED=false`; Worker QR file ID/verified link remain missing.
Original image in the other project was preserved. No actual QR upload/message,
Binance API call, live order/payment, secret upload, gate/webhook change, local
bot restart, Worker/Firebase deployment, commit/reset/push occurred.

104 automated tests and both actual local workerd/SQLite smoke modes (legacy
contact ordering and enabled fictional manual checkout) passed. Dry-run bundle
~96.03 KiB / 24.89 KiB gzip. Private-value scan passed for source/staged browser
assets and Worker bundle; private paths/receiving image remain unserved/ignored.
Documentation: PAYMENT_ARCHITECTURE.md, BINANCE_PAY_SETUP.md, ORDER_WORKFLOW.md,
ADMIN_PAYMENT_VERIFICATION.md and PAYMENT_TESTING.md. Telegram's current Stars
requirement for digital goods remains a production-design constraint; manual
verification does not waive it. Fresh approval and policy/configuration resolution
are required before activation. Existing live shop is unchanged.

## Price-first Telegram product labels — 2026-10-14

User requested prices in selection titles instead of “View” and reaffirmed the
10% retail markup. Variant buttons now show formatted retail price plus product
name; featured channel heading and primary order button also show exact variant
price. Shared catalog adapter still applies supplier ×1.10 once; no client/bot
markup is added. All 31 affected catalog/Telegram/shop tests pass, including USD
10 -> 11 in the label, and Wrangler dry-run passed. Existing Worker release
`5f727c86-c7e3-4104-bd64-d9c3ee0f9cd6` deployed, channel photo captions/buttons
updated in place, and public-catalog/active-shop/healthy-webhook checks passed.
No Firebase release was needed. Orders/payment review/permissions are unchanged.

## Channel/shop visual and browsing refresh — 2026-10-14

User requested substantial beautification, proper images and better browsing,
preserving the working order flow. Six original hosted Atlas family JPEG cards
now accompany welcome/featured channel posts. Existing posts converted to media
in place using saved message IDs. Telegram verified welcome photo/caption/shop
link. Private bot product details send artwork then full details/order controls;
known image rejection falls back to text without retrying uncertain sends.
Artwork identifies families, not fabricated supplier photos; supplier images
remain preferred on web with reliable local fallbacks.

Website adds larger images, readability/mobile spacing, stock shortcuts, reset
and currency-aware sorting. Listing buttons open the exact bot product. Browser
desktop/mobile checks confirmed artwork, filtering and product-specific links;
screenshots are saved under ignored `.catalog-state/`. Public browsing and CRM
operator restrictions are unchanged. All 84 tests pass after final source checks.

Transient supplier failure was reproduced, then fresh reads recovered. Worker
can return a sanitized catalog up to six hours old with an explicit stale flag;
web notice persists across navigation, and new shop requests require fresh data.
Existing orders/review are unaffected. Worker release
`db1a4299-143a-4fbd-8850-adca303dcf9c` deployed; Hosting contains 36 browser/image
assets. Cache policy now revalidates; versioned catalog entry imports bypass the
old hour-long module cache. Live asset/JPEG equality and private source 404 checks
pass. Local workerd order-flow smoke and secret scan pass. No test payment,
supplier purchase, Firestore/index change, commit/reset/push.

## Channel shop activated with manual review — 2026-10-14

User approved the complete channel/shop bot with human payment-reference review,
confirmed public contact @GodofDistruction, and said “Go for it” after discussing
activation. Bot now has channel post/edit permissions; its single human owner is
the configured private numeric admin. Existing atlas Worker release
`480fdcb1-baed-479b-b68f-fb45a2d86853` deployed shop/order modules, admin/contact
secret bindings and explicit private-shop mode. Read-only process checks found no
local polling process. Webhook was registered to the existing Worker without
dropping pending updates, confirmed healthy/zero pending, then hosted gate enabled.

Six channel posts (welcome plus five featured listings) were published silently;
welcome pinned and private buyer/admin command scopes configured. Telegram getChat
verified pinned shop/deep link, buyer commands and admin `/orders` command. No
test payment, supplier purchase, real order or fulfillment was performed. Customer
and admin live interactive flows still need operator test requests; mocked Node
and actual local workerd/SQLite order-reference-approval-fulfillment flow passed.
All 82 tests pass, Wrangler bundle ~54.97 KiB/15.47 KiB gzip, configured browser/
bundle secret audit passes. Public website/CRM authorization are unchanged.

Buyer submits reference -> awaiting_review; admin checks real received funds,
explicitly approves/rejects, then records manual fulfillment. Admin gets private
new-order/reference notifications and queries active orders; buyers see only their
own history. No auto-wallet, payment-provider verification, automated checkout or
supplier delivery exists. Durable private order schema/audit storage now supplements
cache/cooldowns/receipts; `TELEGRAM_SHOP.md` documents commands, limits, privacy,
retention, uncertain notifications and rollback. Do not restart local polling while
the webhook is registered. No customer/Firestore data migration, commit/reset/push.

## Telegram channel destination — 2026-10-14

User supplied `https://t.me/atlascrmshop` after requesting a channel destination.
Existing atlas Worker release `b0d02197-c100-4dd8-8942-042d89d7e511` sets the legacy
`TELEGRAM_GROUP_URL` to that channel. The live public catalog returned 394 products
with the exact new URL; health/CORS/webhook/admin-off checks passed. Telegram web
preview returned 200 with the expected handle; channel DM/admin settings were not
inspected or changed. Shared bot replies now describe a channel/contact instructions.
All 73 tests passed. Website gets the destination dynamically from the Worker,
so no new Firebase release was needed. Local `.env`/`.dev.vars` destination was
updated, preserving secrets and numeric approved chat IDs. Local polling was not
restarted and uses its loaded settings until the operator's next restart. No
webhook, bot enable, message/broadcast, channel membership, Firestore or customer
data change occurred. Existing unrelated work remains uncommitted/preserved.

## Public catalog without login — 2026-10-14

User clarified that Market is simply a public catalog, with business discussions
and orders handled in the approved Telegram group. `CATALOG_PUBLIC_ENABLED=true`
was released to the existing atlas Worker (version
`9d1c4196-5d3e-4a4e-8e57-c5b7b4da7c8e`). An initial request during propagation
returned the old 401; deployed metadata confirmed true and a subsequent live
unauthenticated request returned 200 with 394 normalized retail products and the
configured group link. Health/CORS/webhook/admin gate checks passed; bot remains off.

Market no longer imports Firebase, restores user sessions, attaches identity
tokens, displays account controls or prompts for catalog sign-in. Firebase
Hosting release completed with 28 browser assets; private CRM operator-claim rules
and Google/email operator login remain in place. All 73 tests pass. No checkout,
payment or purchase integration was added; enquiries continue through Telegram
links. No webhook/message/toggle or local runtime restart occurred.

## Google login for Market, operator-only CRM — 2026-10-14

User requested Google login for everyone and confirmed customer routing to Market
while preserving the existing account's CRM access. Google provider was already
enabled/configured, with one existing active account. That account received the
Admin-set boolean `atlasOperator:true` claim, merging existing claims. No account
details/passwords were printed. New Google accounts have Market access only.
Login adds Google popup/account selection, safe errors/busy state and fixed
operator/customer destinations; Market adds sign-in/sign-out controls.

Firestore rules require the operator claim on all former signed-in CRM paths;
compiled rules were released before the website. Server-owned WhatsApp collections
and history/delete protections are preserved. Prepared and deployed rules passed
275 fictional simulations each, without customer reads/writes. Local WhatsApp
startup now selects only a unique claim-bearing operator when no explicit UID
list exists; public registrations cannot widen sender authorization. Running
services were not restarted; local Telegram is unchanged.

All 73 app tests pass. Hosting-only release completed with 28 browser files.
Live login/auth/routing/Market files match local source; private sources return
404. Real Google popup/consent still needs user interaction. No customer records,
schema or history were migrated, no webhook registered, no bot toggle/message
performed, no commit/reset/push. See `AUTHENTICATION.md`. Earlier entries are
historical snapshots.

## Existing Atlas Worker deployed — 2026-10-14

After the user approved publication and completed Wrangler OAuth, read-only
versions/deployments checks confirmed the existing lowercase `atlas` Worker.
It was a Hello World starter; its supplier/token bindings matched local setup.
Previous version metadata is saved privately in ignored `.worker-private/`.
Worker release `0ac195e3-b9c0-408d-b385-053e713b1d7a` is deployed to the existing
address, with the SQLite coordinator, private catalog and off bot gate. Supplier
key and bot token were converted from readable dashboard variables to encrypted
secret bindings; separate admin/webhook secrets were uploaded. Preview URLs are
disabled. Wrangler initially printed remote plaintext settings in its config diff;
the wrapper now redacts configured private values from stdout/stderr. Rotate the
previously shared/exposed supplier key and bot token and synchronize local/hosted
settings during an approved maintenance window; no rotation occurred here.

Live health, unsigned webhook 401, wrong-origin 403, unauthenticated approved-origin
catalog 401, and authenticated admin GET confirming bot off passed. No webhook was
registered, no remote toggle/message occurred and local polling remains running.
Frontend Worker origin is now the fixed Atlas address and connected Firebase
Hosting release completed, including a clear login link for signed-out visitors.
All 12 catalog tests passed after the login-message adjustment.
Signed-in browser product loading remains unverified;
the local workerd signed-token/supplier flow was tested with mocked providers.

## Firebase website release — 2026-10-14

Following explicit user approval, Firebase Hosting-only deployment completed for
atlascrm-c5722 using 27 staged browser assets. The Atlas Market shell is published
at `https://atlascrm-c5722.web.app/?catalog=1`. The frontend Worker origin remains
empty/local: live supplier catalog is still unavailable on Hosting until the
existing Cloudflare backend can be verified/configured/deployed. Two Wrangler
OAuth login attempts timed out without browser authorization. No Worker, secrets,
Telegram webhook or remote gate was changed; local polling was not interrupted.
All 68 tests and Wrangler dry-run passed before release, and the local secret scan
found no configured Market credentials in browser assets/bundle. Firestore rules
and indexes were not deployed. No commit, reset or push was performed.
Live index, catalog CSS/modules, endpoint config and app.js matched local source;
`.env`, backend catalog source and Worker source returned 404. Supplier catalog
availability and signed-in browser interaction remain pending backend deployment.

## Prepared Cloudflare Atlas Market integration — 2026-10-14

Worker code targets the existing canonical lowercase `atlas` script, retaining
Firebase Hosting as frontend. Local workerd smoke testing caught/fixed native
fetch receiver and unsupported redirect-mode incompatibilities in shared adapters.
A SQLite Durable Object persists the enable gate, cache, cooldowns, budgets and
48-hour update receipts. No CRM database/rule changes were made. Cleanup is
serialized/batched and is not postponed by new updates. Admin POST rejects null;
Firebase-token validation has signed positive/negative tests and cached key refresh.

Wrangler 4.151.0 builds under bundled Node 24 through a wrapper; local Node app
retains Node 20 support. Dry-run bundle: 36.38 KiB / 11.19 KiB gzip. All 68 tests
passed after the final redirect compatibility fix (68/68, zero failures).
Actual Workers runtime smoke passed with fictional secrets and mocked provider
calls (signed Firebase identity, SQLite, admin gate, webhook deduplication, CORS,
cache, single markup). Cleanup tested across 600 expired receipts in 128-key batches.
Dependency audit reports zero vulnerabilities; default npm test includes Worker.
Git confirms private `.env`/`.dev.vars` and bundle outputs are ignored. A local
value-only audit found no configured Market secrets in browser assets/bundle;
no credential values were printed. Hosting staging remains browser-only.

No deployment, secret upload, remote toggle, webhook registration or Firebase
release was performed. Frontend origin remains local; existing local polling was
not interrupted. Cloudflare versions list could not verify the existing Worker
because this session lacks Cloudflare login/API token. Deployment wrapper requires
that check before a real deploy. Existing uncommitted CRM/WhatsApp work is preserved;
no commit/reset/push. See `CLOUDFLARE.md` for configuration, Cmder commands, approval
gates, access policy, quotas and rollback.

## Atlas Market storefront and Telegram catalog — 2026-10-14

Added a branded storefront with the requested featured-product order, horizontal
featured browsing, family/detail views, exact retail prices at supplier +10%, and
links to the operator's configured sales group. Shared retail pricing also feeds
the new Telegram catalog bot. Its reference-style three-column product menus and
persistent bottom keyboard are reviewable in the local Telegram layout preview.
At that milestone no bot token or numeric chat allowlist was present; the operator
later configured them and reports local polling running. No Telegram messages,
supplier purchases or public deployment were performed by the agent. All 52
catalog/bot/CRM tests passed. Desktop/mobile layout, featured
order, retail prices and Telegram links were verified in the browser. The local
Telegram preview's group/product navigation and Wallet explanation were checked.

## Local catalog preview — 2026-10-14

Family and variant cards now display supplier images, falling back to mapped
product-brand favicons when supplier images are missing or fail. Canva's logo
was verified in the live browser, and all eight affected catalog tests passed.

The catalog now opens on a product-family overview. Family detail pages organize
variants with price/availability filters and expandable descriptions; the full
catalog remains accessible. Local name-based grouping retains unknown names under
Other products and keeps currencies separate for price ranges.
All 38 catalog/CRM regression tests passed. Group navigation was also checked
against live browser data, including opening Canva's five catalog variants.

Added a read-only supplier catalog section to the index/CRM navigation with product
cards, prices, images, search and type/stock filtering. The local preview command
uses the ignored `.env`; the supplier key stays on the backend. Live catalog data
is available through the dedicated loopback preview, not the hosted CRM. No
purchases, Telegram integration or deployment were performed. See `CATALOG.md`.
The live browser preview returned 389 products. Search and in-stock filtering
were verified in the browser; all 6 catalog tests and 30 existing regression tests
passed. Supplier prices/stock are time-dependent; these counts are a snapshot.

Last Updated: 2026-10-06
Current Milestone: Local API acceptance verified; webhook runtime/public connectivity pending
Current Branch: v2-development
Latest Verified Commit: 853a4dd (`Atlas CRM V1 working baseline`)

## Working

- Static dashboard, contacts/customers views, profile timeline, follow-ups, imports, subscriptions, templates, settings, and login page exist.
- Demo mode stores customers, activities, and follow-ups in localStorage.
- Firebase service path is implemented with the configured `atlascrm-c5722` web app settings.
- TXT/CSV parsing, Bangladesh/international phone normalization, duplicate preview, private browser backup before import, status updates, follow-up creation, subscription expiry derivation, template previews, and WhatsApp Web chat link generation are implemented in code.

## Partially Working

- Firebase Authentication and Firestore behavior depends on external configuration and has not been verified here.
- The UI uses prompts/alerts for some actions and has limited error/loading handling.
- Status transitions are not validated against an explicit state machine.

## Not Implemented

- Payment workflows, pagination, and multi-user ownership.
- Browser verification of production authentication, Firestore workflows, and a signed-in WhatsApp Web session.

## Known Problems

- CRM rules require the operator claim. Operators retain broad workspace permissions; per-record ownership remains unimplemented.
- Startup now reports module, authentication, and initial view failures visibly and in the console.
- Several working-tree edits predate the Cloud API task and remain uncommitted; the existing baseline commit is 853a4dd.

## Technical Debt

Add tests, improve CSV quoting/validation, centralize authorization/ownership, improve error states, and review encoding of existing UI strings.

## Testing Status

Repository inspection, dependency/path checks, config parsing, and local HTTP smoke checks completed. On 2026-10-05, four helper tests and app syntax checking passed; Firebase CLI login, Hosting deployment, and live HTTP checks of the WhatsApp changes were verified. Browser authentication, Firestore workflows, and actual WhatsApp Web navigation remain unverified.

## What Changed Recently

Latest follow-up: the operator refreshed the Meta token and restarted their service,
then initiated a new CRM send. Reconciliation confirms the new intended-recipient
attempt/message/activity is accepted and internally consistent, while the operator
reports no received message. No status events or inbound messages exist for this
recipient. Read-only Meta checks confirm refreshed access and phone-to-WABA match;
two apps are subscribed and approved hello_world is available. The webhook now
rejects unsigned POST with 401 (enabled signature verification), but no ngrok
process/inspector was found. No resend was performed. Delivery/failure remains
unverified; next prompt is `prompts/active/04-accepted-message-delivery-trace.md`.

After the read-only review, the operator authorized one real Hi test. A single
new tracked API request using current inherited/saved local credentials was
rejected by Meta with HTTP 401/code 190; no message was accepted and no retry or
fallback was attempted. The current test's access token is invalid or expired.
The running service's in-memory token was not read and may differ. Historical
accepted sends remain consistent but delivery is unverified. The next prompt is
`prompts/active/03-access-token-and-runtime-validation.md`, prioritizing authentication
and saved-versus-runtime configuration before webhook work. No credential values
were exposed, changed or generated.

Independent validation on 2026-10-06 confirmed the intended test recipient's latest
attempt is accepted, with external ID, message, customer/recipient association and
acceptance timeline activity consistent. There is no inbound recipient message or
delivery-status webhook evidence. Delivery remains unverified, rather than known
failed. All 30 current tests and affected syntax checks passed; live served browser
modules match local source. Local API preflight/auth/privacy checks passed.

The active local webhook returns 503 despite app-secret and verify-token presence
in saved Windows User settings. Stale process inheritance is a hypothesis to verify
with a controlled restart. Ngrok is installed, but no running ngrok process/usual
inspector was found. No real message was sent/retried or data changed during this
validation. See `WHATSAPP_VALIDATION.md` and the next active prompt
`prompts/active/02-webhook-runtime-and-delivery-verification.md`. Earlier milestones
below are historical snapshots and may describe superseded configuration states.

Local sending follow-up: the operator chose a computer-hosted service instead of
Cloud Run/billing. `npm run start:local` successfully started the loopback backend;
read-only Firestore, Firebase Auth and Meta phone checks passed. It reused the four
saved WhatsApp settings and existing Firebase CLI login via a user/SYSTEM-only
per-process ADC file outside the repo. No replacement credential was generated.
The sole existing active Firebase workspace account was selected for web sending.
Local startup uses validated Graph `v25.0` only when no version is already set.

The hosted UI now has Settings → WhatsApp sending → This computer. Known Hosting
origins default to this local mode when no explicit preference exists. Browser
tokens can go only to the fixed loopback address; restricted CORS/PNA preflights
and Host/Origin validation retain UID/token checks. All 26 tests passed. Live local
HTTP checks verified preflight 200, unauthenticated 401, private-source 404 and
unconfigured webhook 503. Browser local-network permission and actual message
sending still require operator verification. Incoming/status webhooks remain
unconfigured without app secret/public HTTPS. Billing was not enabled.

This local-connection UI was deployed as a Hosting-only release with 17 staged
browser assets on 2026-10-05. Live `app.js`, `whatsapp-api.js` and
`messaging-backend.js` returned 200 and matched local source. The local service was
left running on port 3000 for the operator to check the signed-in browser connection
and initiate their own message test. No real message was sent automatically.

Deployment follow-up on 2026-10-05: at the operator's request, the updated web UI
was deployed to Firebase Hosting at `https://atlascrm-c5722.web.app`, using the
16 browser-only staged assets. Live HTTP checks returned 200 for the home page
and confirmed served `app.js` and `whatsapp-api.js` match local source; backend
source returns 404. All 24 tests passed before deployment. Firestore rules were
compared against the active rules (existing collection permissions unchanged),
compiled successfully and released with the additive transport policies. Indexes
were not deployed. The previous live rules are saved privately under `.firebase/`.

Google Cloud Billing reports `billingEnabled: false` for this project. Cloud Run
backend deployment is blocked until billing is enabled. The app secret, Graph
version and approved-user UID list are still absent from the local environment.
No backend/rewrite or Meta configuration was deployed; `/api/whatsapp/config`
currently returns 404 on Hosting, so direct sending remains disabled. Existing
manual WhatsApp links remain available. No real messages were sent, secrets
uploaded, commits created or pushes made.

The official Cloud API transport now has a small Node backend, local send CLI,
signed GET/POST webhook route, Firestore customer/message/activity persistence,
transactional deduplication and status tracking. New server-owned collections are
`messages`, `whatsappEvents`, and `whatsappSendAttempts`; no existing data was migrated.
The browser/manual WhatsApp architecture remains intact. Duplicate merging also
moves message associations. Hosting configuration now targets a browser-only
staging directory prepared by `npm run build:hosting`.

All 24 automated tests passed, syntax checks passed, and dependency audit reports
zero vulnerabilities. The four original WhatsApp variables exist in the Windows
User environment but were absent in the inherited process; the launcher fills only
missing process values. `WHATSAPP_APP_SECRET` and `WHATSAPP_GRAPH_API_VERSION`
are not configured here. No `GOOGLE_APPLICATION_CREDENTIALS` or default gcloud ADC
file was found; server Firestore access remains unverified. Backend startup fails
closed without the app secret, while static preview works. Public HTTPS backend,
Meta subscription/callback and new rules deployment remain pending. No real message
was sent, no deployment performed, and nothing committed/pushed. See `WHATSAPP_SETUP.md`.

The direct web-send follow-up adds **Send via WhatsApp API** to the existing
message dialog, same-origin send/readiness routes, Firebase ID-token revocation
checks and an explicit `WHATSAPP_ALLOWED_USER_UIDS` allowlist. An empty list keeps
web sending disabled. Per-user/request send intents prevent duplicate HTTP sends,
and the UI distinguishes acceptance from delivery and blocks uncertain retries.
The same-origin Hosting rewrite remains undeployed; the production webpage cannot
use the new route until backend/runtime configuration and Hosting deployment are
completed. A Dockerfile with an allowlisted build context and rewrite instructions
are provided; the image has not been built. No live message was sent during tests.

On 2026-10-05, the **Free tokens invitation** snippet was revised to explicitly offer Codex tokens, retain the reply “JOIN” call to action, and use single-asterisk WhatsApp bold formatting. This copy update was deployed to `atlascrm-c5722` as a Hosting-only release from a temporary directory containing only website files. All five tests and app syntax checking passed; live HTTP verification confirmed the served `app.js` matches the local source and the home page returns HTTP 200. Firestore rules and indexes were not deployed.

A desktop icon now sits beside the WhatsApp Web link, giving operators both destinations with the same prepared text. The Windows WhatsApp protocol handler is registered on this machine; actual app navigation remains unverified. Five tests, syntax checking, and a simulated interaction check passed for both links, snippet insertion, edits, and opening-request logging. This change was deployed as a Hosting-only release on 2026-10-05.

The **Free tokens invitation** snippet button fills the WhatsApp dialog's message field with the operator-provided invitation. The text remains editable; snippet selection does not open or send a message. All five tests, syntax checking, and a simulated snippet insertion/edit/link check passed. This addition was deployed as a Hosting-only release on 2026-10-05; a browser check by the operator remains pending.

The WhatsApp Web dialog now has **Mark sent and close**, with saving feedback and errors that keep the dialog open. Repeated sent confirmations now count another contact attempt. Five automated tests and app/store syntax checks passed. This follow-up was deployed as a Hosting-only release on 2026-10-05. The operator confirmed the preceding WhatsApp Web message handoff works in their browser; the new sent-and-close button still needs a browser workflow check.

On 2026-10-05, WhatsApp opening was changed to target WhatsApp Web, with an in-app optional message editor and native link instead of a browser prompt. All four helper tests passed, including empty messages and encoded text checks, and `app.js` passed syntax checking. A Hosting-only release was deployed to `atlascrm-c5722` from a temporary directory containing only website files. Live HTTP checks confirmed the new helper and message editor were served successfully. Firestore rules/indexes were not deployed. A signed-in WhatsApp Web check remains unverified.

The repository was inspected and the durable agent/project documentation system was added. Existing application code was not changed.

## Immediate Next Tasks

Configure a Firebase test project, add meaningful automated tests for pure helpers and workflow behavior, then tighten Firestore ownership rules before production use.
