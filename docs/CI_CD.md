# Branch review and release workflow

Operator decision, 2026-10-19: test locally, test the feature branch online, then
merge to master only after explicit acceptance. No direct production deployment
is part of pushing a branch. Earlier manual releases remain historical facts.

## Verified setup

The feature branch is pushed to GitHub and draft PR 1 targets master. The first
GitHub run passed all checks and Pages deployment; the published page's revision
matched the pushed commit. Browser checks confirmed dashboard, private inventory,
simulated supplier switching and combined catalog rendering. Repository master
was not merged or advanced. The repository and preview were already explicitly
identified as public; no private data or runtime keys were committed.

## Current pipeline

`.github/workflows/branch-review.yml` runs on master, v2-development and codex
branches, and PRs targeting master. It installs the lockfile with lifecycle scripts
disabled, runs the complete test suite, builds the Worker in dry-run mode, runs
mocked inventory/checkout workerd smoke checks, builds the isolated browser preview
and checks its data/network isolation. Actions are pinned to commit SHAs.

Every successful check run uploads a preview artifact. Pushes to the current
`codex/quick-add-lead` review branch additionally deploy that artifact to GitHub
Pages at https://sushen.github.io/AtlasCRM/. That is one preview slot; the page
shows its exact commit. Additional branches run CI but do not overwrite this slot
until the workflow and Pages environment branch policy deliberately select them.
There is no master-to-production deploy job and no production credential in CI.

## Preview boundaries

The repository and preview are public. The operator requested real supplier data,
so the generated preview now contains a read-only snapshot of the existing public
catalog: actual products, retail prices and availability, fetched during the build.
The dashboard shows its fetch time and labels it a snapshot. It is not a live
refresh, and a failed API read fails the build rather than inventing data. No
supplier API token is needed: the build reads the already-public catalog endpoint.
NAM remains unavailable until its token/API are verified.

Private customer and owned-inventory connections stay disabled. The preview has
no fictional seed records. Owned stock displays Not connected, and combined
potential availability cannot be calculated until real owned inventory is connected.
There is no simulated supplier toggle, credential reveal or stock assignment in
this build. It is an actual-source catalog review, not full integration staging.
Do not enter private customer data or credentials; local test inputs stay in a
separate browser key. Live Firebase/auth/messaging/partner/inventory adapters are
replaced only in generated output and network policy restricts browser requests
to the preview origin. Production adapters remain unchanged in source.

Local preview: `node scripts/build-preview.mjs`, then serve only
`.firebase/preview-public` at a local HTTP origin. GitHub CI uses
PREVIEW_BASE_PATH=/AtlasCRM/. Build artifacts, secrets and private runtime folders
are ignored. Real private-inventory acceptance requires a separately isolated
staging backend; public GitHub Pages never receives production credentials.

## Review and promotion

1. Implement on a feature branch; run tests and inspect local behavior.
2. Commit/push reviewed source, configuration and documentation; CI must pass.
3. Test the exact commit's online branch preview and review the draft PR.
4. Fix issues on the branch; pushes rerun CI and replace the preview.
5. Only after the operator accepts the tested commit, mark the PR ready and merge
   to master. Do not enable auto-merge or push directly to master.
6. Production deployment remains a separately approved release until an isolated
   staging environment and protected production deployment job are configured.
   Preserve all live bindings, webhook, data and encryption-key history.

The first PR necessarily includes the newer saved v2 history because master was
still the V1 baseline. Preserved uncommitted presentation work was included at the
operator's request to commit all project code. The original saved checkout remains
untouched. No real data, credentials, keyrings or local screenshots are included.

## References

[GitHub deployment environments](https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments)
can gate branch deployments. Firebase preview channels alone still share their
project's backend resources; see [Firebase preview integration](https://firebase.google.com/docs/hosting/github-integration).
This is why the online preview uses generated fictional adapters instead.
