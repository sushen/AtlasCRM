# Genie business intelligence connection

## Live release — 2026-10-16

The operator approved deployment. Existing Worker atlas was released as version
`14042470-5b35-4885-b4ca-e76359267e4b`. A real authenticated Genie fetch validated
and saved the report; unauthenticated access returned 401. The bot remained
enabled. No Firebase release, webhook registration, order approval or delivery
mutation occurred. The initial report scanned seven order records with complete
coverage. Counts are a time-specific snapshot, not a claim that records represent
completed sales. The prepared-only rollout instructions below describe the
pre-release state and do not mean a further deployment is required now.

## Prepared integration (2026-10-16)

The protected GET `/api/admin/business-report?days=30` endpoint exposes aggregate
shop-order facts to Genie. It uses the existing separate Atlas admin bearer token,
denies browser-origin access and accepts a 1–365 day window. No public catalog,
customer, supplier-purchase, payment-verification or order-mutation route is added.
This endpoint must be deployed before Genie can read reports; live read-only checks
on 2026-10-16 returned 200 for health/bot-state and 404 for the new report route.

`server/business-report.mjs` projects existing/legacy order records without schema
migration. The coordinator serializes reporting with existing order operations.
Reports separate orders created, payments manually verified and deliveries recorded
within the selected time window from current all-date operating backlogs. Amounts
remain separate by currency, including USDT; no conversion or extra markup is
applied. Top products are ranked by number of new orders, not claimed profitability.
No buyer identity, Telegram username, payment reference, screenshots or credentials
are returned. The scan cap is 10,000 orders; truncation or invalid records produces
an explicit incomplete-coverage flag. Missing approval timestamps cannot prove
receipts in the requested period. Manual approval is not bank reconciliation.

Profit, actual procurement cost, fees, refunds, visitor attribution, Firebase leads
and conversion funnels remain outside the available data. Genie's report explicitly
labels these limitations. Add audited cost/refund and attribution records before
using those metrics for financial decisions.

## Genie operating rules

Genie uses its existing Atlas Market integration. Its private configuration stays
in AtlasCRM `.env`; it does not use the Telegram bot token for administration.
Report snapshots, policy and action outcomes are stored in Genie's local SQLite
business database and included in Genie's existing data backups.

The operator selected automatic reporting and 24-hour bot availability. While
Genie is running, the saved rule refreshes the 30-day report and checks the bot
every 15 minutes. A known disabled bot is enabled only if both automation and the
24-hour rule remain enabled. Unknown/unreachable state never triggers a mutation.
Manual **Bot off** pauses the 24-hour rule before disabling the bot. Disabling the
automatic reporting rule stops all automatic activity; the individual manual
report and bot controls remain available. Closing Genie does not switch the hosted
bot off; local monitoring resumes on the next unlocked Genie startup.

Payment approval, supplier purchases, customer messages, delivery confirmation,
refunds and pricing edits remain manual. No external message is sent by the new
monitor. Backlog alerts appear in Genie's Atlas integration/report; they are not
Telegram broadcast alerts. A desktop scheduler cannot guarantee monitoring while
the computer is off. The hosted bot's saved enabled flag remains the Cloudflare
source of truth.

## Tests and release

Run `node --test tests/business-report.test.mjs`, `npm test` and
`npm run worker:check`. Genie adds report persistence, validation, policy, stale
error and manual-override tests. No live order/payment was modified during checks.

Release requires explicit operator approval for `npm run worker:deploy` in this
project. No webhook or Firebase deployment is needed for this additive admin
endpoint; preserve the existing Worker, secrets, bindings and order state. After
release, reopen Genie and choose Project Integrations → Atlas Market → Refresh
business report. Verify figures against Atlas's admin queues before relying on
the new report. Rollback must preserve the production order schema and storage.
