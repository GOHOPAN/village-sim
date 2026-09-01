from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models.user import User
from app.schemas.world import AdvanceTimeRequest, WorldStateOut
from app.services.world_event_manager import get_or_create_world_state, nightly_cycle

router = APIRouter(prefix="/world", tags=["world"])
settings = get_settings()


@router.get("/state", response_model=WorldStateOut)
def get_world_state(db: Session = Depends(get_db)) -> WorldStateOut:
    return WorldStateOut.model_validate(get_or_create_world_state(db))


@router.post("/advance", response_model=WorldStateOut)
def advance_time(payload: AdvanceTimeRequest, db: Session = Depends(get_db)) -> WorldStateOut:
    """시간 대기(Wait) 기능: 게임 시간을 수동으로 건너뛴다."""
    world = get_or_create_world_state(db)
    world.game_datetime = world.game_datetime + timedelta(minutes=payload.minutes)
    db.add(world)
    db.commit()
    db.refresh(world)
    return WorldStateOut.model_validate(world)


@router.post("/sleep")
async def sleep(user_id: int, db: Session = Depends(get_db)) -> dict:
    """유저가 침대에서 잠들 때 트리거: 전체 NPC 성찰 + 루틴 재계획을 1회 실행하고 아침으로 전환한다."""
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없습니다.")

    result = await nightly_cycle(db)

    user.fatigue = 100  # 100 = 쌩쌩함
    user.hunger = max(user.hunger - 15, 0)  # 자는 동안에도 배는 고파진다
    user.is_asleep = False
    db.add(user)
    db.commit()

    return {"message": "다음 날 아침이 밝았습니다.", **result}


@router.post("/passout")
async def passout(user_id: int, db: Session = Depends(get_db)) -> dict:
    """기절(Pass-out) 시스템: 유저가 잠을 안 자고 버티다 새벽에 강제 기절했을 때 호출.

    암전 + 병원/집 이동 + 페널티를 적용하고, 잠들었을 때와 동일하게 강제로 글로벌
    성찰/루틴 갱신을 실행하여 마을 전체가 고장(프리징)나는 것을 막는다.
    """
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없습니다.")

    penalty_gold = min(user.gold, 10)
    user.gold -= penalty_gold
    user.hp = max(user.hp - 10, 1)

    result = await nightly_cycle(db)

    user.fatigue = 50  # 강제 기절은 정상 수면(100)보다 회복이 덜 됨
    user.hunger = max(user.hunger - 25, 0)
    user.is_asleep = False
    db.add(user)
    db.commit()

    return {"message": "유저가 새벽에 쓰러져 병원으로 옮겨졌습니다.", "gold_penalty": penalty_gold, **result}
