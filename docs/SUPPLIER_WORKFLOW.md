# Supplier-first procurement and customer assignment

Operator clarification, 2026-10-19. Implemented locally for review; no supplier
procurement API or production feature release was performed.

Validation: all 194 tests pass, plus Worker dry-run and both mocked inventory/
checkout runtime checks. After the final dashboard ordering adjustment, all 24
focused comparison/inventory tests passed again. The authenticated local dashboard
was visually verified showing 373 real Canboso offers and supplier acquisition
costs. NAM correctly reports missing API configuration. No real inventory,
product, customer purchase or credential was written during this verification.

## Normal business flow

Suppliers already have products. Atlas should not require an operator to define
each one before seeing its offers. The dashboard and inventory workspace now lead
with supplier offers, source status and an explicit side-by-side comparison.
Customer journey metrics remain available below the supplier/stock sections.

1. Browse the actual configured supplier feeds. Search product/plan and filter by
   source. Select up to four offers to inspect side by side. Confirm the exact
   plan, term, account type, requirements and warranty before comparing them.
2. Purchase from the supplier manually using the supplier's own process. Atlas
   does not place an order, pay or check the supplier balance.
3. Use **Record manual purchase** on the selected offer after receiving it. Enter
   actual per-unit cost, currency, purchase/expiry dates and delivery credentials,
   and explicitly confirm the purchase already happened.
4. Atlas records that genuinely acquired unit in private inventory. If needed,
   it makes a deterministic internal product reference behind the scenes, or uses
   an existing explicitly enabled source-to-product mapping. No manual product
   creation step is required for a verified supplier offer.
5. Record the customer's sale using that linked product, its paid amount and
   subscription start/expiry dates. Assign the purchased unit to that customer's
   paid purchase. The same customer can have many different product purchases.
6. Reveal the item's credentials to deliver it yourself, then explicitly record
   manual delivery. Assignment/reveal does not prove external delivery.

The internal reference is bookkeeping, not a new supplier listing. Only a special
custom product requires the optional custom-product definition form. Existing
custom-product receipt and assignment paths are retained for compatibility.

The custom-product form supports selling price, currency and duration in days as
well as name. These are the terms of an Atlas offer, separate from supplier cost
and acquired-unit count. The operator's first requested offer is one day one USD:
USD 1, one-day duration. Saving a custom offer alone does not publish it to Telegram,
buy inventory, create a customer purchase or start a subscription.

## Source availability and prices

The operator-only offers endpoint returns public offer information plus acquisition
cost when a configured private supplier feed actually supplies it. A fallback to
the existing public catalog retains product/retail/stock data, but does not pretend
that the retail price is acquisition cost. That cost is labeled unavailable.

NAM remains visibly not configured until its token is privately saved and its API
is healthy. A missing or disabled source produces no fabricated offers. Individual
source failures do not remove other successfully read sources from this comparison.
No automatic product equivalence or quality guarantee is inferred from names.
Price ranking is shown only for the selected offers when every acquisition cost
is known and all currencies match. It is not a claim that their terms are equal.

## Persistence and privacy

InventoryProgram verifies the selected source/offer on the server. Explicit
purchase confirmation, amount/currency, dates and credentials are validated before
recording. New internal products use a deterministic source/offer hash ID and
create-if-missing semantics; existing products are not overwritten. A pre-existing
enabled exact mapping takes priority. Inventory writes retain encrypted secrets,
idempotent receipts, assignment claims and audit behavior.

The supporting product-reference create and inventory transaction are separate
operations; a failed receipt can leave an unused product reference, never a false
owned unit. Retrying reuses that reference. Shared Firebase mode checks actual CRM
references server-side; browser payloads cannot invent those references.

No real acquisition, unit credential, customer purchase or product document was
created to verify this work. Tests use fictional offers and isolated storage.
Supplier catalog reads are GET-only. Credentials are never included in the offers
list, source code, GitHub artifacts, public catalog, URL or activity text.
