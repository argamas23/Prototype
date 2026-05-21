from __future__ import annotations

from firebase_admin import firestore


def goals_ref(db: firestore.Client, uid: str):
    return db.collection("users").document(uid).collection("goals")


def get_active_goal_ref(db: firestore.Client, uid: str):
    return db.collection("users").document(uid).collection("goals").document("active")
