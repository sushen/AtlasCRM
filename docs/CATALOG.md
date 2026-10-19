# Local supplier catalog

## Second-source aggregation (prepared 2026-10-19; disabled)

Operator supplied the NAM reseller API and confirmed USD. Each supplier has a
persisted operator on/off switch: disabled sources are not fetched and contribute
no products/prices/stock; switching invalidates cached listings. NAM defaults off
even when a token exists. All-off yields an empty catalog. Owned inventory is
unchanged by these switches. Public availability is
combined supplier stock, excluding private owned units. Explicit product/term and
stock-pool mappings choose the cheapest in-stock equivalent COST and apply the
current Atlas margin once to aggregate stock. Unknown/unlimited counts remain
unknown; cross-currency mappings fail without a conversion rule. New product/stock
GETs are fresh/no-store and checkout rechecks current selection. Current public
single-source behavior stays unchanged until multi-source activation. Provider
health/products currently return 502 and its full product wrapper/token are not
verified. No upstream balance/order call exists. See `INVENTORY.md`.

## Shop navigation — 2026-10-15

Atlas website general shop buttons resolve the configured Atlas channel URL to
Atlas Market Bot with the shop start link. Individual product buttons keep a
product-specific bot start link. Other configured Telegram destinations retain
their existing behavior. The public channel is no longer the website shop target.

Catalog resilience: if supplier refresh fails, Worker can provide the last
sanitized catalog for at most six hours with a visible saved-data notice. The
notice persists during filtering/navigation. Confirm stock/price with admin;
new bot order requests are blocked while data is stale. Fresh data restores
normal requests without affecting existing payment-review records.

## Shop presentation improvements — 2026-10-14

Featured cards show larger supplier images with original Atlas product-family
artwork as a reliable local fallback. Six hosted JPEG cards identify welcome,
ChatGPT, Claude, Gemini, Canva and Notion; they are branded category artwork,
not fabricated supplier product photos. Family/detail images use the same local
fallback before initials. Image surfaces/readability and mobile hero proportions
were improved. In-stock shortcuts, clear filters and name/currency-aware price
sorting improve browsing without login. Each listing now deep-links directly to
that exact product in @AtlasCrmMarketBot, preserving selection instead of making
buyers find it again in the channel. Unknown/unsafe IDs retain the channel route.
No checkout/payment authorization change is made.

## Prepared hosted transport

The existing Atlas Cloudflare Worker transport is prepared, with Firebase Hosting
as frontend. Firebase shell was released with user approval on 2026-10-14.
Frontend now uses the fixed existing Atlas Worker, deployed after successful
OAuth on 2026-10-14. The user subsequently explicitly selected public browsing:
hosted `?catalog=1` loads products without Google/email sign-in. Market no longer
initializes Firebase, forwards identity tokens or shows sign-in controls.
Enquiry links open the [Atlas Market channel](https://t.me/atlascrmshop); no checkout, payment or supplier-purchase
flow is introduced. CRM remains operator-only. See [CLOUDFLARE.md](CLOUDFLARE.md).

## Atlas Market storefront

The local index preview now opens a branded Atlas Market storefront with a hero,
five featured products (ChatGPT, Claude, Gemini, Canva, Notion), a horizontally
scrolling featured rail, product-family cards and detailed variant pages. The
featured rail advances every six seconds only when it overflows; it pauses on
hover/focus and respects reduced-motion preferences. Arrow buttons and manual
scrolling remain available. Existing CRM authentication and customer workflows
are unaffected by the separate local storefront shell.

Retail prices use a scarcity markup on supplier unit price, based on the latest
available stock count:

| Units available | Markup on supplier base price |
| --- | --- |
| 1 | 40% |
| 2–4 | 30% |
| 5–10 | 20% |
| 11 or more | 10% |

Unknown, invalid/non-integer and zero counts retain a 10% fallback; zero-stock
listings remain unavailable to order. Round once to the currency's minor units,
including zero-decimal currencies such as VND. The adapter applies markup once;
the browser, Telegram and channel post formatter only format the result. For a
USD 10 base price the tiers produce USD 14, 13, 12 and 11 respectively. Catalog
refreshes update prices as supplier stock changes (normal cache: 60 seconds).
Existing saved order/payment quotes retain their original price. Existing published
channel posts are static until explicitly republished. The catalog response's
`pricing` metadata reports `mode: stock_tiers`, `defaultMarkupPercent` and `tiers`
instead of a single global `markupPercent`.

Displayed ranges cover eligible variants; they are not a single plan's price.
Featured cards name their actual representative variant and show its exact price.

Continue on Telegram links use the validated `TELEGRAM_GROUP_URL` from the private
environment and open the Atlas Market channel without automatically sending a
message. `TELEGRAM_GROUP_URL` is a legacy setting name that also accepts channels.
Unavailable stock prompts a restocking enquiry. Missing Telegram configuration
leaves a disabled coming-soon control instead of an invented destination. There
is no website purchase/checkout route. See `TELEGRAM.md` for the bot and local
shop-layout preview at `?catalog=telegram`.

Product-family cards use the first supplier image available among their variants.
Individual listings use their own supplier image. Missing or failed supplier
images fall back to the product family's brand favicon, served by Google's public
favicon service for explicitly mapped brand domains. If both images fail or the
family has no mapped brand, initials remain. Logos identify product brands rather
than representing supplier product photos. Image requests have no referrer and
never include the buyer key.

The default catalog page is organized into product-family cards (for example
ChatGPT, Canva and Notion). Choose **Explore** to open a family's variants and
expand **Product details** for its full supplier description and duration options.
**Product groups** returns to the overview; **Full catalog** retains the flat view.
Search/type/stock filters work within the selected view; switching views resets
those filters. Group overview counts/ranges describe currently matching variants.
Grouping uses local product-name rules, not a supplier category field. Unrecognized
names remain under **Other products** and no listing is discarded. Price ranges
are calculated separately per currency and may include out-of-stock listings.

Run `npm run preview:catalog` from AtlasCRM (Node 20.19+), then open
`http://127.0.0.1:3100/?catalog=1`. The index page renders a catalog-only preview
without Firebase authentication or customer records. The normal CRM navigation
also includes **Supplier catalog**; the API is available only on the catalog
preview server for now. Ordinary preview/production servers show an unavailable
message until a separately authorized deployment integration is configured.

The private root `.env` supplies `CANBOSS_BUYER_API_KEY` (legacy
`CANBOSO_BUYER_API_KEY` also works; conflicting aliases are rejected); it is ignored by Git.
`node --env-file=.env` loads it for this preview process; inherited environment
values take precedence. `.env` is never served or staged for Hosting. No key
appears in browser modules or API responses. `CATALOG_PREVIEW_PORT` can override
3100. The endpoint is loopback-only, checks Host/Origin and grants no cross-origin
access. It is not a public catalog deployment.

The read-only backend calls the fixed Canboso product endpoint, sanitizes its
response into product data, caches for 60 seconds, coalesces concurrent requests,
and honors 429 Retry-After cooldowns. Raw upstream error text/URLs are never
returned. Price currency is preserved; zero stock means out of stock and null
stock means unknown. Relative supplier images resolve against its HTTPS origin;
external/non-HTTPS images are excluded. Supplier content is escaped in the UI.
Images load without a referrer and fall back when unavailable. Search, type/stock
filters and incremental 30-card loading keep the larger catalog manageable.

No wallet balances, buyer identity, customer data, order history, delivery details
or supplier purchases are fetched. Retail prices are not guaranteed purchase
quotes. An API key issued to the buyer must not become a
public browser credential. Rotate any key previously shared in a conversation.

`npm run test:catalog` tests normalization, caching, cooldown, local access limits,
secret-file protection, filtering and escaping. `npm test` retains existing CRM
and WhatsApp regression checks. No Firebase/Hosting deployment is performed.
