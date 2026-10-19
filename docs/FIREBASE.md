# Firebase

## Local workspace with shared Firebase (2026-10-19)

`npm run preview:workspace` now builds real Firebase browser authentication and
starts a loopback server using the existing protected CLI/ADC login. An explicit
private supplier env path can be passed to `server/local-workspace.mjs` with
`--firebase`. Actual inventory data uses server-owned atlasInventoryState with
operator-token/revocation checks; browser direct access remains denied by default.
The existing customers/products/purchases/subscriptions stay in their current
collections. No local-to-live copy is needed for records saved to shared Firebase.
The hosted inventory adapter must be released with INVENTORY_STORAGE=firestore
and the same backed-up keyring. See LOCAL_WORKSPACE.md; that hosted rollout has
not occurred. Separate file-mode testing uses `npm run preview:workspace:isolated`.

## Partner projections (released 2026-10-16)

Partner tracking uses the existing Firebase Auth project and additive Firestore
collections `atlasPartnerProfiles`/`atlasPartnerPrivate`. Profiles are server-owned;
active owner reads are allowed without granting the CRM operator role. Private
events/accounting are operator-readable only; browser writes are denied. Worker
REST writes require a dedicated same-project server-only IAM credential; browser
web configuration and CLI login are not that production credential. Partner rules
and Hosting are released, and dedicated Worker credentials passed real read/empty-
commit checks without business-data changes. See `PARTNERS.md` for setup and rollback.

## Public Market and private CRM (2026-10-14)

Market browsing is public and does not use Firebase sign-in. Google provider was
already enabled/configured; the private workspace login offers Google popup
sign-in plus existing email/password. New users route to Market; only the
pre-existing operator has the Admin-set boolean `atlasOperator` claim. Firestore
rules now require that claim for private CRM access, and the app checks a freshly
refreshed token before rendering. Google signup alone never grants CRM membership.
See [AUTHENTICATION.md](AUTHENTICATION.md) for setup, tests and deployment order.

## Current configuration

`js/firebase.js` imports Firebase 10.12.2 from `gstatic.com` and contains the configured web app settings for project `atlascrm-c5722`. `configured` is true when the API key is not a `YOUR_` placeholder.

## Setup

Create a Firebase project, enable Email/Password Authentication and Firestore, put the Firebase web configuration in `js/firebase.js`, create an authorized user, and configure the Firebase CLI project. Web config values are intended for client use; service-account keys and private credentials must never be committed.

## Rules and indexes

`firebase.json` deploys `firestore.rules` and `firestore.indexes.json`. Rules require a signed-in user with `atlasOperator:true`; collection details are documented in `docs/SECURITY.md`. Indexes cover activity timeline queries and follow-up due-date ordering.

## Local and hosting use

Serve the root with a static server. Use `index.html?demo=1` for local browser-only mode. The deployed Hosting site is `https://atlascrm-c5722.web.app`.

The optional Node WhatsApp backend uses Firebase Admin Application Default
Credentials for the same Firestore project; browser configuration/CLI login are
not server credentials. New transport rules are additive and were compiled/released
on 2026-10-05 along with the updated Hosting UI (separate releases). Hosting stages
only browser assets (`npm run build:hosting`) into
`.firebase/hosting-public`. Static Hosting has no webhook backend rewrite yet.

Cloud Billing currently reports disabled for this project; enable an appropriate
billing plan before deploying the planned Cloud Run backend. Existing local
WhatsApp values were neither overwritten nor uploaded.

The selected local-send launcher can reuse the existing Firebase CLI login through
a protected per-process ADC file outside the repository. Read-only Firestore and
Firebase Auth checks succeeded without enabling billing. It selects only a single
existing active workspace account if no explicit UID list exists; zero/multiple
accounts require configuration. No credentials were generated or uploaded.
