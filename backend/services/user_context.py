from __future__ import annotations

from sqlalchemy.orm import Session

from models.models import User


def get_or_create_user_by_email(db: Session, email: str) -> User:
    normalized = (email or "").strip().lower()
    if not normalized:
        raise ValueError("email is required")

    user = db.query(User).filter(User.email == normalized).first()
    if user:
        return user

    user = User(
        email=normalized,
        hashed_password="mvp-no-password",
        full_name=normalized.split("@")[0],
        is_active=True,
        plan="free",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
