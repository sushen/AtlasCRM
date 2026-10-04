# Atlas CRM

Atlas CRM is a private, framework-free CRM for managing WhatsApp leads and customers through a contact, conversation, follow-up, and customer journey. WhatsApp remains an external communication system; Atlas records workflow and history and does not claim that opening a link proves a message was sent or answered.

## Current status

The current MVP includes TXT/CSV import preview, phone normalization, customer statuses, activity timelines, follow-ups, search/filtering, Firebase Authentication/Firestore integration behind configuration, and a local browser demo. Firebase configuration, automated tests, and production deployment are not verified in this repository.

## Technology and quick start

HTML5, CSS3, browser ES modules, Firebase Authentication, and Firestore. No build step is required. Run `python -m http.server 8000` from the repository root and open `http://localhost:8000/index.html?demo=1` for demo mode.

For Firebase use, configure `js/firebase.js`, enable Email/Password Authentication and Firestore, create a user, select a Firebase CLI project, and deploy with `firebase deploy` after reviewing the rules.

## Documentation

- [Agent guide](AGENTS.md)
- [Project](docs/PROJECT.md)
- [Current state](docs/CURRENT_STATE.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Data model](docs/DATA_MODEL.md)
- [Customer journey](docs/CUSTOMER_JOURNEY.md)
- [Firebase](docs/FIREBASE.md)
- [Security](docs/SECURITY.md)
- [Development](docs/DEVELOPMENT.md)
- [Testing](docs/TESTING.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Roadmap](docs/ROADMAP.md)

## Privacy

Never commit WhatsApp HTML exports, TXT/CSV contact lists, customer exports, backups, Firebase credentials, service-account keys, or other secrets. Firestore access requires authentication, but current rules are designed for a single trusted workspace and need ownership controls before multi-user use.
