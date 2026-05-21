from __future__ import annotations

import argparse
import random
from datetime import date, timedelta, time

from firebase_admin import firestore

from app.config.firebase import ensure_firebase_app
from app.repositories.meals_repo import meals_ref


def _meal_payload(d: date) -> dict:
    items = [
        {"id": f"seed-{i}", "name": name, "quantity": qty, "unit": unit, "calories": cal, "protein": p, "carbs": c, "fat": f}
        for i, (name, qty, unit, cal, p, c, f) in enumerate(
            [
                ("Rice", 200, "g", 260, 5, 55, 1),
                ("Chicken", 150, "g", 330, 45, 0, 7),
                ("Salad", 1, "bowl", 90, 3, 10, 4),
            ]
        )
    ]
    totals = {
        "calories": sum(float(i["calories"]) for i in items),
        "protein": sum(float(i["protein"]) for i in items),
        "carbs": sum(float(i["carbs"]) for i in items),
        "fat": sum(float(i["fat"]) for i in items),
    }
    hh = random.choice([7, 12, 18, 20])
    mm = random.choice([0, 15, 30, 45])
    return {
        "mealType": random.choice(["Breakfast", "Lunch", "Dinner", "Snacks"]),
        "date": d.isoformat(),
        "time": time(hour=hh, minute=mm).strftime("%H:%M"),
        "totals": totals,
        "itemCount": len(items),
        "items": items,
        "createdAt": firestore.SERVER_TIMESTAMP,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed Firestore with synthetic meals for load testing.")
    parser.add_argument("--uid", required=True, help="Target Firebase auth uid to seed under /users/{uid}/meals")
    parser.add_argument("--count", type=int, default=500, help="Meals to create (default: 500)")
    parser.add_argument("--days", type=int, default=30, help="Spread meals across N days back from today (default: 30)")
    args = parser.parse_args()

    ensure_firebase_app()
    db = firestore.client()
    coll = meals_ref(db, args.uid)

    # Firestore batch writes are limited to 500 ops per commit.
    batch_size = 450
    today = date.today()

    created = 0
    while created < args.count:
        batch = db.batch()
        remaining = args.count - created
        n = min(batch_size, remaining)
        for _ in range(n):
            d = today - timedelta(days=random.randint(0, max(0, args.days - 1)))
            doc_ref = coll.document()
            batch.set(doc_ref, _meal_payload(d))
        batch.commit()
        created += n
        print(f"Seeded {created}/{args.count} meals", flush=True)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

