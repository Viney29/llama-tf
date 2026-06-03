## Consolidated

## Recent
[chat] Store collection handles for the tabbed carousel are `kids`, `for-adults`, and `bundles` — NOT `adults` or `bundle-save` (those don't exist). When a collection-referencing setting renders empty, verify the handle against the live store (`/collections.json`) before assuming a code bug.
[chat] A `collection` setting that points to a non-existent handle fails silently in Liquid (`collection != blank` is false) — no error, just an empty render. Always confirm handles exist on the store, not just that the Liquid logic is correct.
