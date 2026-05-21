from __future__ import annotations

from firebase_admin import firestore


def workouts_ref(db: firestore.Client, uid: str):
    return db.collection("users").document(uid).collection("workouts")


def get_workout_snapshot(db: firestore.Client, uid: str, workout_id: str):
    return workouts_ref(db, uid).document(workout_id).get()
