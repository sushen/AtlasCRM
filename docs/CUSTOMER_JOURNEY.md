# Customer Journey

## States

`not_contacted` is the import default. `contacted` means the operator manually marked a contact attempt. `replied` means a reply was manually recorded. `interested` means the operator qualified interest. `customer` means the operator considers the person a customer. `follow_up` means more work is planned. `not_interested`, `no_response`, `inactive`, and `do_not_contact` represent explicit outcomes or suppression states.

## Events versus states

`whatsapp_opened` is an event, not a state transition. `message_marked_sent` is a separate manual fact from opening WhatsApp. The current UI's Mark sent action transitions to `contacted`; opening WhatsApp only adds an activity. A reply must be manually recorded and transitions to `replied`.

## Expected transitions

The normal path is `not_contacted -> contacted -> replied -> interested -> customer`, with `follow_up` branching from any active stage. `no_response`, `not_interested`, `inactive`, and `do_not_contact` are terminal or paused outcomes unless a future explicit reactivation policy is added. Current code permits any requested status without a transition validation table; this is a known limitation.

## History

Every meaningful action should append an activity. Status and event semantics must remain distinct so the timeline can explain what actually happened.
