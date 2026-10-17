# Atlas Market Telegram catalog

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
10%, rounded to the currency's decimal units. Markup is applied once before the
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
