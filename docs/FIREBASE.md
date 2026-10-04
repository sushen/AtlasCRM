# Firebase

## Current configuration

`js/firebase.js` imports Firebase 10.12.2 from `gstatic.com` and contains the configured web app settings for project `atlascrm-c5722`. `configured` is true when the API key is not a `YOUR_` placeholder.

## Setup

Create a Firebase project, enable Email/Password Authentication and Firestore, put the Firebase web configuration in `js/firebase.js`, create an authorized user, and configure the Firebase CLI project. Web config values are intended for client use; service-account keys and private credentials must never be committed.

## Rules and indexes

`firebase.json` deploys `firestore.rules` and `firestore.indexes.json`. Rules require `request.auth != null`; collection details and the current broad authorization are documented in `docs/SECURITY.md`. Indexes cover activity timeline queries and follow-up due-date ordering.

## Local and hosting use

Serve the root with a static server. Use `index.html?demo=1` for local browser-only mode. The deployed Hosting site is `https://atlascrm-c5722.web.app`.
