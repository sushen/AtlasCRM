# Google sign-in and private CRM access

Latest decision on 2026-10-14: the user removed the login requirement for Market.
Products are public information and enquiries go to the Telegram group. Market
no longer initializes Firebase or displays sign-in/sign-out controls. Google/email
login remains for the private CRM, whose operator-claim rules are unchanged.
Google signup never grants CRM access. Initial Market-login rollout below is historical.

On 2026-10-14 the user requested Google sign-in for everyone and confirmed that
new Google users should access Atlas Market while the existing operator retains
private CRM access. Inspection found Google already enabled with its OAuth client
configured, and exactly one pre-existing active Firebase account. No provider
credentials, real account details or passwords were printed or placed in frontend
source. Existing email/password sign-in remains available.

`login.html` offers Continue with Google using the official Firebase popup API
and an account selector. `js/login.js` handles disabled/busy controls, cancellation,
blocked popups, network/provider errors and safe fixed destinations. New users
land on `/?catalog=1`; an operator lands on `/index.html` unless `next=market` was
requested. Arbitrary return URLs are ignored. Market itself no longer has sign-in controls.
If an existing email account reports a credential conflict, use its existing
password sign-in first; no automatic account merge or operator promotion occurs.

The existing workspace account received Admin-only custom claim
`atlasOperator:true`, merged with any previous claims. No new customer account
receives that claim. `js/app.js` refreshes its ID token and redirects nonoperators
to Market before rendering CRM. This UI guard is convenience, not the security
boundary. Firestore rules require a strict boolean operator claim on every
previously signed-in collection path, preserving existing operator permissions
and the server-only WhatsApp event/attempt restrictions. Activities/follow-up
deletion remains denied. No customer records, schema or history were migrated.
Admin SDK server access bypasses client rules as before; existing WhatsApp
approved-UID enforcement remains in place. Cloudflare catalog is now public,
requiring an allowed Origin but no Firebase ID token.

Public Google signup creates Firebase Auth identities, not CRM customers or
workspace membership. Google provider scopes remain the Firebase default identity
scopes; no Gmail, Drive or contacts access is requested. Browser popup policy or
provider account settings may require operator/user interaction. End-to-end Google
account selection requires a real user test and is not automated here.

Validation: all 73 app tests passed, including Google flow, operator/customer
routing, cancellation and redirect restrictions. Firebase Rules API simulation
checks 275 combinations of anonymous, buyer, false/string/true claims across
private collections and methods. It uses fictional request/resource contexts,
without reading or mutating customer documents. Prior claims/provider metadata
and active rule source are saved privately in ignored `.firebase/google-login/`.
`scripts/test-crm-access-rules.mjs --live` tests the deployed ruleset itself.

Future operator access must be granted deliberately through Firebase Admin custom
claims for a selected known user; never infer operator status from Google login,
email domain, or the growing public user list. `scripts/google-login-setup.mjs
grant-existing-operator` targets only the privately saved original account, not
all newly registered users. It is an explicit mutation command. `inspect` is
read-only; `enable-existing-google` is unnecessary for this already-enabled
project and must not be run merely to inspect.

Deployment order: assign/verify the existing operator claim, test and deploy
Firestore rules, test live restrictions, then stage and publish Hosting. Never
restore broad authenticated-user rules as a login workaround. A revoked operator
claim may remain in existing tokens until refresh/expiry; coordinate session
revocation for urgent removal. This is a single trusted operator model, not
per-customer tenancy or a full role-management UI.

References: [Firebase Google sign-in](https://firebase.google.com/docs/auth/web/google-signin),
[custom claims](https://firebase.google.com/docs/auth/admin/custom-claims),
[Rules test API](https://firebase.google.com/docs/reference/rules/rest/v1/projects/test).
