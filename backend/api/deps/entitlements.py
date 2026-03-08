from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional, Tuple

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from api.deps.auth import require_user
from core.cache import CacheService
from core.database import get_db
from core.plans import Feature, PLAN_FEATURES, PLAN_LIMITS, PlanType, normalize_plan
from models.models import User
from services.user_context import get_or_create_user_by_email


def get_user_and_plan(
    db: Session = Depends(get_db),
    user_email: str = Depends(require_user),
) -> Tuple[User, PlanType]:
    user = get_or_create_user_by_email(db, user_email)
    plan = normalize_plan(getattr(user, "plan", "free"))
    return user, plan


def require_feature(feature: Feature):
    def _dep(ctx: Tuple[User, PlanType] = Depends(get_user_and_plan)) -> Tuple[User, PlanType]:
        user, plan = ctx
        allowed = PLAN_FEATURES.get(plan, set())
        if feature not in allowed:
            raise HTTPException(
                status_code=403,
                detail=f"This feature is available in VestIntel Pro.",
            )
        return user, plan

    return _dep


def _day_bucket() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


async def enforce_ai_quota(user_id: int, plan: PlanType) -> None:
    limit = PLAN_LIMITS[plan].ai_queries_per_day
    if limit is None:
        return

    key = f"ai:quota:{user_id}:{_day_bucket()}"
    current = await CacheService.get(key)
    used = int(current or 0)
    if used >= limit:
        raise HTTPException(
            status_code=429,
            detail=f"AI query limit reached for today. Upgrade to Pro for higher limits.",
        )

    # increment
    await CacheService.set(key, used + 1, ttl=60 * 60 * 36)


def market_data_delay_seconds(plan: PlanType) -> int:
    return PLAN_LIMITS[plan].market_data_delay_seconds
