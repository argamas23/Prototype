from __future__ import annotations

from firebase_admin import firestore


def plans_ref(db: firestore.Client):
    return db.collection("workoutPlans")


def get_plan_snapshot(db: firestore.Client, plan_id: str):
    return plans_ref(db).document(plan_id).get()
