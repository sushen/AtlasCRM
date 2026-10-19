# Atlas Market Telegram catalog

## Reviewed layout and custom offer released to the real bot — 2026-10-19

The real Atlas Market bot now uses the reviewed Menu-only navigation and one Buy
action on product cards. Products lists all categories on one scrolling screen,
with “USD 1 · ChatGPT — 1 day” directly below them. Large individual family lists
retain their existing plan pagination. Existing messages are snapshots; /menu or
reopening Products obtains the current layout.

Product details now have spaced headings for duration, availability, description
and payment/delivery. Custom offers show price once in the heading; internal
product reference IDs are omitted. Supplier descriptions remain escaped/bounded
and required order details are retained. Unknown stock is stated explicitly.
The sandbox shares the same readable-card formatter after its next local restart.

Worker ShopProducts reads only explicitly allowlisted Firebase product IDs using
the existing server identity and a narrow field mask. Only the requested ChatGPT
offer is published. Inactive/removed/invalid offers are hidden, and purchase checks
reread the current offer before creating an order. Own prices receive no supplier
markup; availability remains unknown and delivery is manual. This release uses the
real existing payment/order flow, with saved quotes and review history preserved.
The sandbox remains separate and cannot create live orders. See DEPLOYMENT.md.

## Separate test bot — 2026-10-19

At the operator's request, official BotFather created **Atlas Test**,
[@AtlasCrmSandboxBot](https://t.me/AtlasCrmSandboxBot). Telegram getMe verified
that identity; getWebhookInfo confirmed no webhook is configured. Its token is
stored only in ignored `.worker-private/telegram-test.env`, with restricted local
file permissions. Never commit the token or substitute the live bot's token.

The local runner reuses TelegramShop and ManualCheckoutConversation behind a
private operator boundary. Products combines the actual supplier catalog with
fresh active Firebase offers. Products lists custom offer buttons directly below
all category buttons, including “ChatGPT — 1 day” (originally “one day one USD”).
Its existing Firebase ID, USD 1 price and one-day term are retained. Offer buttons,
overview and detail heading use “USD 1 · ChatGPT — 1 day”. Main category
pagination is removed; individual large plan lists retain their existing paging.
General navigation lives in Telegram's collapsible Menu, including Products,
Profile, History, Support, Warranty and operator actions. Replies remove the old
persistent keyboard so it cannot obscure the conversation; general navigation is
also removed from the product grid. Old inline navigation messages remain handled.
Product detail cards contain one **Buy** action, with no channel, refresh, compare
or contact buttons; stock/price refresh when the product is reopened. Out-of-stock
or invalid-price products do not receive Buy. This still opens isolated test checkout.
The separate Atlas offers keyboard button is removed; old messages using it still
reopen Products. Custom selling prices get no supplier markup
and have unknown availability until fulfillment is arranged. Read-only verification
found 373 supplier listings plus the custom offer. No stock counts are invented.

Profile/history, test order requests, reference/evidence submission, admin review,
request-information and delivery queues use separate ignored
`.worker-private/telegram-test-orders.json`; no live orders are imported or changed.
Test checkout has no payable destination, payment QR or transfer link and asks for
made-up references. Every reply carries a test banner. Support/channel links stay
in the test bot; Add lead opens localhost and warns that deliberate CRM saves use
real Firebase. Partner referrals and channel publishing are not connected. Optional
checkout presentation overrides preserve production defaults.

Only configured numeric operators in matching private chats may access it; groups
and other accounts receive nothing. An outbound guard restricts recipients too.
Firebase reads project product fields only; customer records, inventory credentials
and supplier costs do not enter bot messages. This is an operator preview, not
publication to the live shop.

Run `npm run telegram:sandbox` with the existing private `.env` and separate
test-token file; `--check` on the runner verifies identity/Firebase without sending
messages. The runner refuses any other bot identity, a production-token match or
an existing webhook. It uses separate ignored polling state and preserves offsets
before replies. Run only one sandbox poller. It must stay running on this computer
for replies; no hosted test deployment exists. The production webhook is unchanged.
Run `npm run test:sandbox` for private catalog/full-shop isolation tests. All 210
project tests pass, including an isolated order → reference → review → approval →
manual delivery workflow and existing production checkout regressions. Optional
private command-menu setup failures do not prevent typed-command handling.
The Telegram API helper now permits the four command/menu setup/readback methods;
the runner verified both the operator command list and native Menu button by
reading them back. Earlier missing-menu reports were caused by those methods
being rejected locally before Telegram received them. No live bot settings changed.

## Private operator Add lead entry (released 2026-10-19)

Only configured shop admins in matching private chats receive **➕ Add lead** in
their menu. The entry or `/addlead` returns the fixed operator-gated CRM form link
`https://atlascrm-c5722.web.app/?quick-add=1`. Buyer/catalog/channel/group menus
receive no CRM control. Request `/menu` to refresh an old keyboard.
No phone, username or notes pass through Telegram. The private form accepts
either a phone or a WhatsApp username in one field; its help text mentions both. See [QUICK_ADD.md](QUICK_ADD.md).

## Text and emoji catalog labels — 2026-10-19

Operator selected standard emoji and readable text for catalog buttons without
Premium. Every recognized product family now has a purpose-related emoji. Catalog
and family menus use escaped HTML headings, spaced plan/price/stock lines, and
clear category/plan navigation. Product detail sections use price, stock, details,
requirements and reference symbols. The primary shop keyboard says Products;
existing Buy buttons remain accepted. Request and refresh callbacks retain their
existing data contracts and pricing/order behavior. Existing brand-image cards
remain available separately; no custom-emoji purchase or pack is needed.
Verification: 43 affected tests, Worker dry-run and private-value scan passed.

## Telegram product presentation — released 2026-10-19

Product details use escaped Telegram HTML headings, separate price/stock fields,
spaced supplier paragraphs and bullets, order requirements and product references.
The description cleaner strips supplier HTML/script/style content, preserves wording
and bounds long descriptions with an explicit support prompt. Freshness timestamps
use Bangladesh time; stale catalog warnings remain visible. Refresh price & stock
updates the existing detail message using current catalog data (normal 60-second
cache), without creating an order or resending the logo. Repeated unchanged edits
are successful. Existing orders keep their saved quotes; old Telegram messages and
published channel posts are snapshots until reopened/refreshed or explicitly edited.

Selecting a mapped family or product shows its actual brand favicon as a photo
from the same allowlisted brand-domain map used by the website. Five featured
logo URLs were checked for successful image responses. Logo images are separate
from text buttons and require no Telegram Premium. Unmapped products keep existing
image/text fallbacks; confirmed photo failures still permit readable text details.
No custom-emoji pack, Premium purchase or channel broadcast is introduced.
Released to the existing Worker and Firebase Hosting. All 145 tests, Worker
dry-run and mocked workerd/SQLite manual-payment smoke pass. No real Telegram
message was sent for verification; the next incoming user request exercises
Telegram rendering.

## Live shop transport — 2026-10-14

After explicit user approval, the hosted shop was deployed/activated and Telegram
webhook registered to the existing atlas Worker. No local polling process was
found during cutover. Six shop posts are published and welcome pinned; admin
review uses the verified owner identity. Do not start Node polling unless the
webhook is explicitly removed in a coordinated rollback. Earlier off/polling
entries below are historical. Payment/fulfillment are human actions, not automatic
supplier purchases. See `TELEGRAM_SHOP.md` for buyer/admin commands and limitations.

## Channel shop with manual order review

User authorized the channel storefront/private order bot on 2026-10-14. Public
contact is @GodofDistruction; the verified channel owner is the configured numeric
review admin. Shop supports product deep links, one-unit order requests, private
history/profile, submitted transaction references, admin review and manual
fulfillment recording. Actual payment and supplier delivery remain human actions;
no wallet balance, automatic checkout or Binance integration exists. See
[TELEGRAM_SHOP.md](TELEGRAM_SHOP.md) for commands, state, privacy and activation.

## Channel destination — 2026-10-14

Website and saved bot enquiry destination is now `https://t.me/atlascrmshop`,
supplied by the operator as their new channel. `TELEGRAM_GROUP_URL` is retained
as a legacy configuration name and accepts a channel URL; numeric approved chat
IDs are independent and unchanged. Website links open the channel without sending
messages. Configure channel Direct Messages or publish contact instructions so
buyers can enquire. Channel messaging settings have not been inspected/changed.
The running local polling process was not interrupted and keeps its loaded
configuration until the operator's next restart. Shared bot wording now describes
a channel; no bot was added to the channel and no broadcast occurred.

## Prepared Worker webhook option

The dedicated bot is @AtlasCrmMarketBot; the approved group ID is -5513909100.
The operator reports local polling running; it was not interrupted. Cloudflare
webhook transport and Genie Check status/Bot on/Bot off protocol are deployed,
with the hosted gate confirmed off. No webhook registration or remote toggle
was performed. Never run polling and webhook delivery
together. See [CLOUDFLARE.md](CLOUDFLARE.md) for persistent state, secrets,
receipt limitations and approval-gated cutover/rollback.

The catalog bot follows the supplied shop reference: product families appear as
three-column inline buttons, with persistent Products/Support, Wallet/API and
Warranty reply-keyboard rows. Featured families begin with ChatGPT, Claude,
Gemini (Google AI & Veo), Canva and Notion. Family menus paginate variants and
product details include their retail price, stock, requirements and reference.

## Review locally

Start `npm run preview:catalog`, then open
`http://127.0.0.1:3100/?catalog=telegram` to interact with the shop layout preview.
This is a local HTML preview, not an active Telegram chat. It uses the same menu
formatters and normalized product prices as the real bot. Website preview is
`http://127.0.0.1:3100/?catalog=1`.

## Activate the real bot

1. Create a dedicated bot using Telegram's official BotFather and keep its token
   private in AtlasCRM's ignored `.env` as `TELEGRAM_BOT_TOKEN`.
2. Add that bot to the Atlas sales group. The group invite URL alone cannot add
   a bot or identify its numeric chat ID.
3. Set `TELEGRAM_GROUP_URL` to the enquiry channel URL (currently `https://t.me/atlascrmshop`). This setting is separate from the numeric chats where the bot replies.
4. Set `TELEGRAM_CATALOG_CHAT_IDS` to approved numeric group/DM IDs, separated by
   commas. An empty allowlist refuses startup unless public private-chat catalog
   replies are explicitly enabled with `TELEGRAM_PUBLIC_CATALOG_DMS=true`.
5. Run `npm run telegram:catalog`. Use `/start` or `/catalog` in an approved chat.
   `/catalog Canva` filters a family; `/catalog Gemini` opens Google AI & Veo.

To find your numeric group ID, add the bot to the group and send
`/catalog@YourBotUsername`, then run `npm run telegram:check` before starting the
polling bot. The read-only check prints the bot username and IDs/types of chats
with pending updates. It does not print message text, token or an existing webhook
URL, send replies, or acknowledge the updates. Copy only your intended group ID
into the private allowlist. If a different bot process consumes those updates,
stop that process and issue a new group command before checking again.

In group privacy mode, use slash commands or reply directly to the bot. Telegram
may not deliver ordinary reply-keyboard text to a privacy-enabled group bot.
Private bot chats show the bottom keyboard normally, subject to the allowlist or
explicit public-DM setting. The bot answers incoming requests; it does not broadcast
an entire catalog or add members. Polling refuses bots with an existing webhook
instead of deleting or replacing another integration.

## Commerce boundary

The website's Continue on Telegram links and the bot's sales links open the
configured channel. Buyers use its contact instructions to enquire; the bot does not debit a wallet,
purchase from the supplier, collect customer payment, refund or fulfill orders.
The Wallet button explains this boundary and never displays the operator's shared
supplier wallet. API explains the catalog connection without disclosing any API
key. Warranty directs the buyer to the selected listing and support; it does not
invent a universal warranty. Product descriptions come from the supplier and may
contain claims that the operator must verify.

Prices use the same server adapter as the storefront: supplier unit price plus
a stock-based 10–40% markup (see `CATALOG.md`), rounded to the currency's decimal units. Markup is applied once before the
data reaches either interface. Promotional conditions are informational, not
an implemented checkout/discount engine. Inventory can change between requests;
confirm price/stock before arranging a purchase.

## Operation and verification

The framework-free Node bot uses official Telegram Bot API long polling. It sends
welcome/menu messages and edits inline catalog messages; it uses plain text,
bounded callbacks, approved chats, a per-user cooldown and Telegram's retry-after
cooldowns. All errors are fixed safe messages; tokens, request URLs, raw API
responses and chat histories are not logged.

Only the next update offset is saved in ignored `.catalog-state/telegram-offset.json`.
It is written before answering, so a crash/uncertain send is not blindly retried.
A response may therefore be lost during interruption; the buyer can request the
catalog again. SIGINT/SIGTERM stop polling. Use one bot process at a time.

Tests mock Telegram calls while exercising real catalog formatting, keyboard
layout, pagination, authorization, callbacks, shared pricing and rate-limit/error
handling. No real Telegram messages have been sent during implementation. Live
verification requires the bot token, approved numeric chat IDs and the operator's
test request in Telegram.

Official reference: https://core.telegram.org/bots/api
