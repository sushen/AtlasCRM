# Atlas CRM Project

## Current identity

Atlas CRM is a private CRM for turning WhatsApp numbers into persistent lead and customer records and tracking the surrounding business workflow.

## Problem and user

The intended user needs to work through a large contact list without losing who was contacted, who replied, who needs follow-up, and who became a customer. The current UI supports one private workspace; multi-user operation is planned, not implemented.

## Product philosophy

Keep the workflow small, inspectable, and history-preserving. A CRM event is recorded explicitly. Atlas does not impersonate WhatsApp or infer delivery, read, or reply events from a browser link.

## Current scope

Implemented scope is contact import (TXT/CSV), normalized phone storage, customer statuses, activity timeline, follow-ups, search/filtering, WhatsApp click-to-chat links, Firebase authentication integration, and a local demo mode. Sales records, templates, and analytics are not implemented.

## Non-goals

Atlas is not WhatsApp, a WhatsApp Web automation tool, a message delivery tracker, an accounting system, or a public customer directory.

## Terminology and boundary

Atlas manages customer workflow. WhatsApp manages communication. Atlas may generate `https://wa.me/<number>` links and records `whatsapp_opened` when the user invokes the action. Opening a link does not prove a message was sent, delivered, read, or replied to; those facts require manual recording or a future official integration.

## Lifecycle

The implemented status vocabulary is `not_contacted`, `contacted`, `replied`, `interested`, `customer`, `follow_up`, `not_interested`, `no_response`, `inactive`, and `do_not_contact`. Purchases, subscriptions, and renewals are future direction.

## Future direction

Add reliable sales entities, safer multi-user authorization, richer tests, and official integrations only when the requirement and data contract are clear. See `docs/ROADMAP.md`.
