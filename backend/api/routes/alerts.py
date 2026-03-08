from __future__ import annotations

from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.deps.auth import require_user
from core.database import get_db
from models.models import Alert
from schemas.schemas import AlertCreate
from services.market_data import MarketDataService
from services.user_context import get_or_create_user_by_email
from api.deps.entitlements import get_user_and_plan
from core.plans import Feature

router = APIRouter()
market_data_service = MarketDataService()


@router.get("/")
async def get_alerts(
    db: Session = Depends(get_db),
    user_email: str = Depends(require_user),
):
    user = get_or_create_user_by_email(db, user_email)
    alerts = db.query(Alert).filter(Alert.user_id == user.id).order_by(Alert.id.desc()).all()
    return [
        {
            "id": a.id,
            "symbol": a.symbol,
            "alert_type": a.alert_type,
            "condition": a.condition,
            "value": float(a.value),
            "is_active": bool(a.is_active),
            "triggered": False,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in alerts
    ]


@router.post("/")
async def create_alert(
    alert: AlertCreate,
    db: Session = Depends(get_db),
    ctx = Depends(get_user_and_plan),
):
    user, plan = ctx
    if plan.value == "free":
        raise HTTPException(
            status_code=403,
            detail="This feature is available in VestIntel Pro.",
        )
    db_item = Alert(
        user_id=user.id,
        symbol=alert.symbol.upper().strip(),
        alert_type=alert.alert_type.lower().strip(),
        condition=alert.condition.lower().strip(),
        value=float(alert.value),
        is_active=True,
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return {
        "id": db_item.id,
        "symbol": db_item.symbol,
        "alert_type": db_item.alert_type,
        "condition": db_item.condition,
        "value": float(db_item.value),
        "is_active": bool(db_item.is_active),
    }


@router.delete("/{alert_id}")
async def delete_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    user_email: str = Depends(require_user),
):
    user = get_or_create_user_by_email(db, user_email)
    alert = db.query(Alert).filter(Alert.id == alert_id, Alert.user_id == user.id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    db.delete(alert)
    db.commit()
    return {"message": "Alert deleted", "id": alert_id}


def _is_triggered(alert: Alert, latest_value: float) -> bool:
    cond = (alert.condition or "").lower().strip()
    if cond == "above":
        return latest_value > float(alert.value)
    if cond == "below":
        return latest_value < float(alert.value)
    if cond == "equals":
        return abs(latest_value - float(alert.value)) < 0.01
    return False


@router.get("/triggered")
async def get_triggered_alerts(
    db: Session = Depends(get_db),
    user_email: str = Depends(require_user),
):
    user = get_or_create_user_by_email(db, user_email)
    alerts: List[Alert] = (
        db.query(Alert).filter(Alert.user_id == user.id, Alert.is_active.is_(True)).all()
    )
    triggered = []
    for alert in alerts:
        quote = await market_data_service.get_quote(alert.symbol)
        if not quote:
            continue
        latest = float(quote.get("price", 0.0))
        if not _is_triggered(alert, latest):
            continue
        triggered.append(
            {
                "id": alert.id,
                "symbol": alert.symbol,
                "message": f"{alert.symbol} {alert.condition} {alert.value} (now {latest:.2f})",
                "triggered_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
                "source": quote.get("source") or "derived",
                "as_of": quote.get("as_of"),
            }
        )
    return triggered
