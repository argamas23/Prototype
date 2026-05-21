from __future__ import annotations

from firebase_admin import firestore


def workout_preferences_ref(db: firestore.Client, uid: str):
    return db.collection("users").document(uid).collection("preferences").document("workout")


def activity_history_ref(db: firestore.Client, uid: str):
    return db.collection("users").document(uid).collection("activityHistory")
