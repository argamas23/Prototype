# Diagram Steps

## 1) Interaction Flow (`docs/Diagrams/Interaction Flow.png`)

1. User opens the app and reaches **Login**.
2. User enters credentials; frontend verifies with Firebase (invalid → error + retry).
3. On success, a token is generated and the user lands on the **Dashboard**.
4. Dashboard fetches the daily summary (**FetchData**) and renders widgets (**RenderUI**).
5. User chooses an action: **Add Meal**, **Add Workout**, or **Settings/Profile**.
6. **Add Meal**: upload image → analyze → edit/confirm → submit (**SubmitData**).
7. **Add Workout**: enter sets/reps → confirm save → submit (**WorkoutSubmit**).
8. After any action (or Settings → Back), return to **Dashboard** and refresh summary.

## 2) Meal Logging (`docs/Diagrams/Meal Logging.png`)

1. User uploads a food image in the frontend.
2. Frontend sends `POST /api/v1/meals/analyze-image` to the API Gateway.
3. Gateway routes to **Meals Service**, which runs the **ONNX** inference.
4. Meals Service returns suggested items + macros (JSON) back to the frontend.
5. Frontend shows suggestions in an editable meal form.
6. User edits and confirms the meal details.
7. Frontend sends `POST /api/v1/meals` to create the meal.
8. Meals Service saves to Firestore and returns `201 Created` (with document ID); frontend shows success.

## 3) Workout Sequence (`docs/Diagrams/Workout Sequence.png`)

1. User requests a new workout plan in the frontend.
2. Frontend sends `GET /api/v1/workouts/plan` to the API Gateway.
3. Gateway routes to **Workouts Service**.
4. Workouts Service calls **Recommendation Engine**: `generate_week(context)`.
5. Generated week plan is returned as JSON and displayed in the UI.
6. User completes the workout session.
7. Frontend sends `POST /api/v1/workouts` to log the workout.
8. Workouts Service saves to Firestore and returns `201 Created` (with document ID); frontend shows success.
