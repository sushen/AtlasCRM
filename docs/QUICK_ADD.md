# Mobile Quick Add leads

Released with operator approval on 2026-10-19. Hosting and Worker are live.

## Where to find it

The dedicated form is `/?quick-add=1`, at
`https://atlascrm-c5722.web.app/?quick-add=1` on the live site. Atlas CRM has
an **Add lead** sidebar entry and topbar shortcut. Bookmark the form on the phone
for direct access. It presents a narrow layout without the full CRM navigation.

In the existing Telegram shop bot, configured numeric admins receive **➕ Add lead**
on their private menu after `/menu` or `/start`. That entry (or `/addlead`) replies
with an **Add lead** URL button. Public buyer keyboards, public catalog menus,
channel posts and group chats do not expose this entry. The link contains only a
fixed route, no phone, notes, identity token or CRM data. Telegram admin status
does not grant CRM access; the browser still requires `atlasOperator:true`.

## Workflow and data

Copy a phone number or username from WhatsApp into the same field and choose
**Save lead**. Names and notes remain optional. The shared text field supports
both identifiers with 16px text and 48px controls. Numeric-only handles need `@`.
See [WHATSAPP_USERNAMES.md](WHATSAPP_USERNAMES.md) for parsing and identity boundaries. New records use the existing customer schema,
`status:new`, `customerStatus:lead`, `source:WhatsApp Quick Add`,
`sourceGroup:Manual enquiry`, and tags `whatsapp-lead` / `quick-add`.

The shared phone normalizer handles Bangladesh and international forms. The
existing customer service queries `normalizedPhone` for a phone or
`normalizedWhatsAppUsername` for a handle before creating; a match
opens the existing profile without writing any customer or activity fields.
New lead and `lead_added` manual activity commit together in a Firestore batch
with server timestamps. Imports retain their existing default activity semantics.
No reply, send, sale or follow-up is inferred. Automatic WhatsApp capture is
still not live. Demo persistence remains local to the browser.

The form prevents repeated save taps, reports retryable failures without raw
backend details, and offers Open record / Add another lead after success. A
profile-load failure keeps the successful-save state so opening can be retried
without resaving. Existing duplicate lookup is not a global uniqueness lock:
simultaneous creations from separate browser sessions can still race, as before.

## Authentication and release

Signed-out entry goes to `login.html?next=quick-add`. Both Google and password
sign-in use the existing fixed destination helper: operators return to the form;
other identities go to Market. Arbitrary return URLs remain ignored. Firestore
rules and operator claims are unchanged.

Before release, run `npm test`, `npm run build:hosting` and `npm run worker:check`.
Release Hosting first so the form exists before releasing the Worker menu change;
preserve existing Worker bindings/state and the current webhook. Admins can then
request `/menu` to replace their old keyboard. Optionally refresh only the private
admin command scopes to include `/addlead`; do not run a channel publisher merely
to refresh command suggestions. The keyboard entry works without that optional
command-scope refresh. Verify sign-in and a deliberate real enquiry on the phone
after release. The operator approved release and Hosting plus Worker deployment completed.
Private admin command suggestions were updated and verified without changing
public scopes. No real Telegram messages or production customer writes were made.

## Validation

All 166 tests pass, including username-only leads and customer purchases. Hosting staging, Worker dry-run and `git diff --check` pass.
No production customer write or Telegram message was performed. Hosting assets
match live bytes; live Worker health/catalog/auth/shop checks passed, all 32
bindings were preserved, and the private command menu was verified.

`tests/quick-add.test.mjs` covers normalized duplicates/history preservation,
phone/username input, manual source/activity, Firebase batch timestamps, operator
startup and sign-in return routing, busy/error/retry behavior, and private Telegram
identity/menu boundaries. A local 390px frame was visually inspected with the real
view and CSS using a fictional persistence adapter; production auth/Firestore
writes were not exercised from that preview.

## Implementation files

- `js/views/quick-add.js`, `js/services/quick-add.js`: form and workflow.
- `js/app.js`, `js/utils/auth-access.js`, `css/components.css`: CRM entries,
  dedicated view, sign-in return route and phone layout.
- `js/services/store.js`: optional creation activity and atomic Firebase creation.
- `server/telegram-shop.mjs`: private admin keyboard/command/link.
- `tests/quick-add.test.mjs`, `package.json`: automated validation.
- `scripts/verify-hosting-release.mjs`: future live asset verification.
- Affected documentation: this guide, `PROJECT.md`, `CURRENT_STATE.md`,
  `ARCHITECTURE.md`, `CUSTOMER_JOURNEY.md`, `DATA_MODEL.md`, `AUTHENTICATION.md`,
  `TELEGRAM.md`, `TESTING.md` and `DEPLOYMENT.md`.

This branch also carries the saved checkout's existing uncommitted presentation,
pricing and release-documentation changes as its starting snapshot. They are not
new Quick Add changes. The saved checkout itself remains untouched.
