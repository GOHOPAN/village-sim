from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.event import WorldEvent
from app.schemas.world import EventTriggerRequest
from app.services.world_event_manager import run_full_event_cycle

router = APIRouter(prefix="/event", tags=["event"])


@router.post("/trigger")
async def trigger_event(payload: EventTriggerRequest, db: Session = Depends(get_db)) -> dict:
    """정기/돌발 이벤트(결혼식/장례식/화재)를 수동 트리거한다.

    1. 환경 이벤트 발생 -> 2. 기억 브로드캐스팅 -> 3. 비동기 루틴 갱신 -> 4. 관계 데이터 업데이트
    순서로 World Event Manager가 처리한다.
    """
    event = await run_full_event_cycle(db, payload.event_type, payload.affected_npc_ids, payload.data)
    return {
        "id": event.id,
        "event_type": event.event_type,
        "status": event.status,
        "affected_npc_ids": event.affected_npc_ids,
    }


@router.get("/active")
def list_active_events(db: Session = Depends(get_db)) -> list[dict]:
    events = db.execute(select(WorldEvent).where(WorldEvent.status == "active")).scalars().all()
    return [
        {
            "id": e.id,
            "event_type": e.event_type,
            "affected_npc_ids": e.affected_npc_ids,
            "data": e.data,
            "created_at": e.created_at.isoformat(),
        }
        for e in events
    ]


@router.post("/{event_id}/resolve")
def resolve_event(event_id: int, db: Session = Depends(get_db)) -> dict:
    event = db.get(WorldEvent, event_id)
    if event is None:
        return {"message": "이벤트를 찾을 수 없습니다."}

    event.status = "resolved"
    event.resolved_at = datetime.utcnow()
    db.add(event)
    db.commit()
    return {"message": "이벤트가 종료되었습니다.", "id": event.id}
