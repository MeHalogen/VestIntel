from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from api.deps.auth import require_user
from api.deps.entitlements import get_user_and_plan
from core.config import settings
from core.database import get_db
from core.plans import PlanType, normalize_plan
from models.models import Subscription, User

router = APIRouter()


def _require_admin(x_admin_key: str | None = Header(default=None, alias="X-Admin-Key")) -> None:
    expected = (getattr(settings, "ADMIN_API_KEY", "") or "").strip()
    if not expected:
        raise HTTPException(status_code=500, detail="ADMIN_API_KEY not configured")
    if not x_admin_key or x_admin_key.strip() != expected:
        raise HTTPException(status_code=401, detail="Invalid admin key")


@router.get("/me")
async def get_my_plan(ctx=Depends(get_user_and_plan)):
    user, plan = ctx
    return {
        "email": user.email,
        "plan": plan.value,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


@router.post("/admin/set-plan")
async def admin_set_plan(
    plan: str,
    user_email: str = Depends(require_user),
    db: Session = Depends(get_db),
    _: None = Depends(_require_admin),
):
    """Manual plan assignment.

    For now, we allow a user to set their own plan when they have the admin key.
    Later you'll replace this with Razorpay/Stripe webhooks.
    """

    user: User = db.query(User).filter(User.email == user_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    next_plan = normalize_plan(plan)
    user.plan = next_plan.value

    # Best-effort subscription record
    sub = Subscription(
        user_id=user.id,
        plan_type=next_plan.value,
        start_date=datetime.now(timezone.utc).replace(tzinfo=None),
        expiry_date=(datetime.now(timezone.utc) + timedelta(days=30)).replace(tzinfo=None),
        status="active",
    )
    db.add(sub)
    db.commit()

    return {"email": user.email, "plan": next_plan.value, "status": "ok"}
