from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.shop import InventoryItemOut
from app.schemas.user import UserOut, UserStateUpdate, UserTickRequest
from app.services import inventory_service
from app.services.game_config_service import get_or_create_config

router = APIRouter(prefix="/user", tags=["user"])


@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: int, db: Session = Depends(get_db)) -> UserOut:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없습니다.")
    return UserOut.model_validate(user)


@router.patch("/{user_id}/state", response_model=UserOut)
def update_user_state(user_id: int, payload: UserStateUpdate, db: Session = Depends(get_db)) -> UserOut:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없습니다.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


@router.get("/{user_id}/inventory", response_model=list[InventoryItemOut])
def get_user_inventory(user_id: int, db: Session = Depends(get_db)) -> list[InventoryItemOut]:
    items = inventory_service.get_inventory(db, "user", user_id)
    return [InventoryItemOut.model_validate(i) for i in items]


@router.post("/{user_id}/tick", response_model=UserOut)
def tick_user_stats(user_id: int, payload: UserTickRequest, db: Session = Depends(get_db)) -> UserOut:
    """게임 시간이 흐르는 동안 허기/피로도가 자연스럽게(100 -> 0) 줄어들게 하는 패시브 틱.
    프론트엔드가 주기적으로(예: 리싱크 타이머마다) 흐른 게임 분(分)을 실어서 호출한다.
    """
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없습니다.")

    config = get_or_create_config(db)
    hours = payload.game_minutes / 60.0
    # fatigue/hunger는 정수 컬럼이다 - 소수점 값을 그대로 대입하면 SQLite는 조용히 저장해버리지만
    # 이후 UserOut(Pydantic)이 int로 검증하다가 500 에러를 내며 /user/{id}가 완전히 깨진다.
    user.hunger = int(round(max(user.hunger - config.hunger_decay_per_hour * hours, 0)))
    user.fatigue = int(round(max(user.fatigue - config.fatigue_decay_per_hour * hours, 0)))
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)
