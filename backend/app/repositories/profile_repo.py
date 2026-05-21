from __future__ import annotations

from firebase_admin import firestore


def profile_ref(db: firestore.Client, uid: str):
    return db.collection("users").document(uid).collection("profile").document("main")


def get_profile_snapshot(db: firestore.Client, uid: str):
    return profile_ref(db, uid).get()

