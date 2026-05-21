# ADR-0001: Meal Entry State, Validation, and Image-Based Autofill in LogMeal Page

## Status

Accepted

## Context

The Log Meal flow requires a user-friendly interface for recording meals, including:

Meal type, date, and time
Multiple food item rows
Nutritional information per item

The system must support:

Adding and removing food items dynamically
Validating required fields and preventing invalid inputs (e.g., negative nutrition values)
Displaying a live summary of total nutrition before submission

In addition to manual entry, the backend supports automatic meal identification via image upload, where:

Users upload a meal image
A fine-tuned ONNX model detects food items
Nutritional values are inferred and returned via API

The frontend must integrate this capability while allowing users to review and modify detected results.

## Decision

Implement meal entry state management, row handling, client-side validation, and live nutrition summaries within logmeal.tsx


## Consequences

Positive:

- Clear and centralized implementation of meal entry logic in a single page
- Immediate user feedback through client-side validation and live nutrition totals
- Faster meal logging via image-based autofill
- Reduced manual effort for common or recognizable meals
- Flexible hybrid approach (manual + AI-assisted entry)

Negative:

- As meal entry grows, the page may need extraction into smaller components.
- Client-side validation must remain consistent with backend validation.
- Increased complexity in the page due to dual input modes (manual + image-based)
- Model predictions may be inaccurate and require user correction

## Future Consideration
Extract reusable components for food rows and nutrition summary
Introduce confidence thresholds or warnings for low-confidence predictions
Support portion size estimation from images
Integrate external nutrition APIs for more accurate data
Add fallback mechanisms (e.g., alternate models) for improved prediction reliability

