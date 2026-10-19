# Collaborator tracking and the Genie feedback loop

Worker and Hosting released on 17 October 2026 after operator approval. The live
aggregate endpoint and empty Genie snapshot are verified. A real collaborator
journey and Meta costs remain unverified until setup and private credentials are supplied. Existing referral, order, commission and payment paths
are preserved. No collaborator, campaign, payment, payout or advertising spend is
created automatically by this change.

## Operator workflow

1. In Partner tracking, register the intended collaborator and their Firebase UID.
2. Generate a distinct tracking campaign for every creative/post/ad. Record its
   label, creative version and hypothesis. Keep the returned URL with the brief.
3. Give that URL and creative to the collaborator. Use it exclusively on that Meta
   ad if comparing its media spend with the attributed sales. Reposts/organic use
   of the same link contaminate paid-only attribution.
4. Once the specialist creates the ad, record its numeric Meta account ID and ad ID
   using **Link tracking campaign to a Meta ad**. This stores a reporting mapping;
   it does not change Meta. Each account/ad pair can map to only one tracking
   campaign, and a saved mapping cannot be redirected to another ad. Create a new
   tracking campaign for a new ad/creative. Incorrect mappings need a separately
   reviewed correction flow; do not overwrite historical attribution silently.
5. Atlas automatically records accepted first-touch visits, Telegram starts and
   order attribution. Authorized humans still verify actual payment and delivery.
   Completed, non-refunded sales feed Genie without extra manual sales entry.
6. Genie joins exact Meta ad IDs to the same reporting dates. It displays the
   retrieval dates, missing sources, cohort outcomes, media costs and next-test
   hypotheses. The operator approves creatives, budgets and collaborator actions.

## Reporting contract

`GET /api/admin/partner-performance?days=7` (also 30 or 90) reuses the existing
private admin Bearer token and rejects browser origins and writes. The coordinator
performs one bounded scan per entity type; errors fail the report rather than
present partial totals as complete. No buyer identity, visit token, payment
reference, screenshot, Firebase UID or private contact details are returned.

New order projections carry their existing attribution click ID and order amount/
currency. Existing orders are not retrospectively assigned to visits. The report
discloses legacy projections without click IDs. Cohort orders/sales refer to
visits first accepted in the selected Bangladesh-date window, as of retrieval.
Converted visits deduplicate repeat purchases by click ID; completed sales may
include repeat purchases. Period starts/orders/sales remain separate counts.
Reversal records exclude refunded credits from completed sales and revenue.

Attributed revenue is the order amount for manually verified and delivered sales,
not independently reconciled bank revenue. Missing amount coverage is disclosed.
Currency buckets remain separate. A revenue/media-spend ratio requires complete
cohort revenue coverage and identical currency; it is not net profit or a causal
estimate. Taxes, provider charges and collaborator fees are not included.

Recent cohorts remain open for the existing 30-day first-touch window. Accepted
visits are deduplicated browser referrals, not verified unique humans or every
Meta click. Bots, forwarded links, organic reposts, blocked browser storage,
cross-device journeys and non-Start Telegram opens can distort or lose attribution.
The implementation does not fingerprint users to work around these limitations.

## Release and tests

No Firestore rule or schema migration is required. The existing outbox mirrors the
additive campaign/order projection fields. Release the existing `atlas` Worker and
Hosting together after operator approval, preserving production variables/secrets,
the partner enabled flag, order storage and registered Telegram webhook. Genie
needs its existing private Atlas admin credential and a Windsor API key scoped by
the application to Chat-Ad account. Until the endpoint is released it reports
unavailable, not fabricated activity.

Run `npm test` and the Worker dry-run build. Focused tests cover unique immutable ad
mapping, delayed/refunded cohort sales, privacy, legacy records and endpoint auth.
Suggestions and spend limits do not automatically hire, message, fund or pay people.
