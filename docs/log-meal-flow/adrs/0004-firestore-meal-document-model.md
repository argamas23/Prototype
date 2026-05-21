# ADR-0004: Store Meals as Parent Documents with Item Subcollections

## Status

Accepted

## Context

A meal contains metadata and one or more food items. The system needs to list meals, show meal totals, and preserve item-level detail. Firestore supports nested maps/arrays as well as subcollections.

## Decision

Store each meal as a document under `users/{uid}/meals/{mealId}` with aggregate totals and metadata. Store food items under `users/{uid}/meals/{mealId}/items/{itemId}`. Write the meal and items in a Firestore batch.

## Consequences

Positive:

- Meal summaries can be listed without embedding all item data in the parent document.
- Item details remain structured and extensible.
- Batch writes keep meal metadata and items consistent at creation time.

Negative:

- Listing meals with item details requires additional subcollection reads.
- Very large meal histories may require read-model optimization or pagination improvements.

