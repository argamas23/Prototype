from __future__ import annotations

import firebase_admin
from firebase_admin import credentials, firestore, storage
from google.cloud.storage import Bucket

from app.config.config import get_settings


def ensure_firebase_app() -> None:
    settings = get_settings()
    if not firebase_admin._apps:
        cred = credentials.Certificate(str(settings.service_account_path))
        firebase_admin.initialize_app(
            cred,
            {
                "projectId": settings.firebase_project_id,
                "storageBucket": settings.firebase_storage_bucket,
            },
        )


async def get_firestore_client() -> firestore.Client:
    ensure_firebase_app()
    return firestore.client()


async def get_storage_bucket() -> Bucket:
    ensure_firebase_app()
    return storage.bucket()
