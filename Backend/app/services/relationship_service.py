from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.relationship import Relationship


def get_or_create_relationship(
    db: Session, source_type: str, source_id: int, target_type: str, target_id: int
) -> Relationship:
    stmt = select(Relationship).where(
        Relationship.source_type == source_type,
        Relationship.source_id == source_id,
        Relationship.target_type == target_type,
        Relationship.target_id == target_id,
    )
    relationship = db.execute(stmt).scalar_one_or_none()
    if relationship is None:
        relationship = Relationship(
            source_type=source_type, source_id=source_id, target_type=target_type, target_id=target_id
        )
        db.add(relationship)
        db.commit()
        db.refresh(relationship)
    return relationship


def _clamp(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(value, hi))


def adjust_relationship(
    db: Session,
    relationship: Relationship,
    familiarity_delta: float = 0.0,
    affection_delta: float = 0.0,
    trust_delta: float = 0.0,
    respect_delta: float = 0.0,
    tension_delta: float = 0.0,
) -> Relationship:
    relationship.familiarity = _clamp(relationship.familiarity + familiarity_delta)
    relationship.affection = _clamp(relationship.affection + affection_delta)
    relationship.trust = _clamp(relationship.trust + trust_delta)
    relationship.respect = _clamp(relationship.respect + respect_delta)
    relationship.tension = _clamp(relationship.tension + tension_delta)
    db.add(relationship)
    db.commit()
    db.refresh(relationship)
    return relationship


def decay_tension(db: Session, relationship: Relationship, decay: float = 5.0) -> Relationship:
    """긴장도는 시간이 지나면 서서히 감소한다 (매일 밤 성찰 사이클에서 호출)."""
    relationship.tension = _clamp(relationship.tension - decay)
    db.add(relationship)
    db.commit()
    db.refresh(relationship)
    return relationship
