from __future__ import annotations

import logging
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

logger = logging.getLogger("vestintel.entitlements")


# ─── Core dependency ──────────────────────────────────────────────────────────

def get_user_and_plan(
    db: Session = Depends(get_db),
    user_email: str = Depends(require_user),
) -> Tuple[User, PlanType]:
    user = get_or_create_user_by_email(db, user_email)
    plan = normalize_plan(getattr(user, "plan", "free"))
    return user, plan


# ─── Feature gate ─────────────────────────────────────────────────────────────

def can_use_feature(plan: PlanType, feature: Feature) -> bool:
    """Pure check — no side effects. Safe to call anywhere."""
    return feature in PLAN_FEATURES.get(plan, set())


def require_feature(feature: Feature):
    """
    FastAPI dependency factory.

    Usage:
        @router.get("/endpoint")
        async def handler(ctx = Depends(require_feature(Feature.ai_copilot))):
            user, plan = ctx

    MVP behaviour: all features are in the free set, so this never raises.
    Future monetization: remove the feature from PlanType.free in plans.py — done.
    """
    def _dep(ctx: Tuple[User, PlanType] = Depends(get_user_and_plan)) -> Tuple[User, PlanType]:
        user, plan = ctx
        if not can_use_feature(plan, feature):
            logger.warning(
                "feature_denied plan=%s feature=%s user=%s",
                plan.value, feature.value, user.email,
            )
            raise HTTPException(
                status_code=403,
                detail={
                    "code": "feature_gated",
                    "feature": feature.value,
                    "message": "This feature is available in VestIntel Pro.",
                    "upgrade_url": "/dashboard/billing",
                },
            )
        _log_usage(user, plan, feature)
        return user, plan

    return _dep


# ─── Usage logging ────────────────────────────────────────────────────────────
# Structured logs feed into future analytics (feature demand, upgrade triggers).
# Format: USAGE user=<email> plan=<plan> feature=<feature>
# Extend this to write to DB / analytics sink when ready.

def _log_usage(user: User, plan: PlanType, feature: Feature) -> None:
    logger.info(
        "USAGE user=%s plan=%s feature=%s",
        user.email,
        plan.value,
        feature.value,
    )


def log_endpoint(user: User, plan: PlanType, endpoint: str) -> None:
    """
    Call this from any route handler to record endpoint-level usage.

    Usage:
        log_endpoint(user, plan, "portfolio.list")
    """
    logger.info(
        "ENDPOINT user=%s plan=%s endpoint=%s",
        user.email,
        plan.value,
        endpoint,
    )


# ─── AI quota guard ───────────────────────────────────────────────────────────

def _day_bucket() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


async def enforce_ai_quota(user_id: int, plan: PlanType) -> None:
    """
    Check + increment daily AI query counter.
    MVP: limit is 100 for free — generous enough to not block users.
    Future: lower free limit to drive upgrades.
    """
    limit = PLAN_LIMITS[plan].ai_queries_per_day
    if limit is None:
        return  # unlimited (Pro+)

    key = f"ai:quota:{user_id}:{_day_bucket()}"
    current = await CacheService.get(key)
    used = int(current or 0)

    if used >= limit:
        logger.warning("ai_quota_exceeded user_id=%s plan=%s used=%d limit=%d", user_id, plan.value, used, limit)
        raise HTTPException(
            status_code=429,
            detail={
                "code": "quota_exceeded",
                "message": f"Daily AI query limit reached ({limit}/day on {plan.value} plan).",
                "used": used,
                "limit": limit,
                "upgrade_url": "/dashboard/billing",
            },
        )

    await CacheService.set(key, used + 1, ttl=60 * 60 * 36)


# ─── Convenience helpers ──────────────────────────────────────────────────────

def market_data_delay_seconds(plan: PlanType) -> int:
    return PLAN_LIMITS[plan].market_data_delay_seconds

