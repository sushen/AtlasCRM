# Deployment

## Architecture

Firebase Hosting serves the static repository root. Firebase Authentication and Firestore provide private data services. `firebase.json` points to the hosting directory, rules file, and indexes file.

## Checks before deployment

Configure the correct Firebase web config, enable Email/Password Authentication, create an authorized user, review rules for the intended ownership model, validate indexes, remove test data, and confirm no secrets or customer exports are staged.

## Commands

After installing the Firebase CLI and selecting a project, the expected commands are `firebase login`, `firebase use <project-id>`, and `firebase deploy`. These commands have not been executed or verified here.

## After deployment and rollback

Verify login redirect, customer reads, import behavior, activity timeline, follow-ups, and browser console errors in the deployed origin. Keep the previous Hosting release and rules configuration available for rollback; do not roll back rules without checking data exposure.
