from __future__ import annotations

from firebase_admin import firestore


def meals_ref(db: firestore.Client, uid: str):
    return db.collection("users").document(uid).collection("meals")


def meal_items_ref(db: firestore.Client, uid: str, meal_id: str):
    return meals_ref(db, uid).document(meal_id).collection("items")


def get_meal_snapshot(db: firestore.Client, uid: str, meal_id: str):
    return meals_ref(db, uid).document(meal_id).get()
