---
name: Placement question-type variety
description: How placement samples multiple item formats and the cache-key constraint that keeps them distinct
---

# Placement item-type variety

Placement now rotates item formats across questions instead of plain multiple choice: `comprehension` (passage-based), `vocabulary` (word-in-context), and `fill_blank`. The rotation is index-based in the placement route; the generator branches its prompt on a `placementItemType` param.

## Cache-key rule (the non-obvious part)
**The question cache key for placement MUST include the placement item type**, not a single flat `"placement"` bucket.

**Why:** the question cache is keyed by (skillCode, thetaBand, culturalContextHash, activityType). If all placement items share one `activityType` value, a cached comprehension item can be served for a vocabulary/fill_blank request, silently collapsing the rotation back to one format. Caught in review after the first build used a flat `"placement"` key.

**How to apply:** keep placement cache `activityType` as `placement_<itemType>`. If you add a new placement item type, it gets its own cache bucket automatically. The same principle applies to any future per-variant generation: the dimension that changes the prompt must be part of the cache key.

## Other notes
- All placement item types still render in the existing multiple-choice options UI (4 options), so no new interaction component was needed — variety is in passage/question framing, not new input modes.
- Vocabulary items wrap the target word in `**asterisks**` in the passage; the client bolds it.
- Fallback generation (when OpenAI fails) does not currently branch on item type — it returns a valid passage MC item, which is acceptable since it only triggers on failure.
