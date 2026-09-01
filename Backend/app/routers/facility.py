import random

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.npc import NPC
from app.models.user import User
from app.schemas.facility import FacilityAccessOut, FacilityRevealOut, GambleRequest, GambleResult
from app.services.game_config_service import get_or_create_config
from app.services.relationship_service import get_or_create_relationship
from app.services.world_event_manager import get_or_create_world_state
from app.world_layout import HIDDEN_FACILITY_HOSTS

router = APIRouter(prefix="/facility", tags=["facility"])

# 도박장/암시장은 밤에만 몰래 운영되며, 유저와 문지기 NPC와의 친밀도가 일정 이상이어야 들여보내준다.
# 별도의 건물이 아니라 기존 건물(술집/대장간)이 "변신"하는 형태다 - HIDDEN_FACILITY_HOSTS 참고.
GATEKEEPER_BY_FACILITY = {key: cfg["gatekeeper"] for key, cfg in HIDDEN_FACILITY_HOSTS.items()}
HOST_BUILDING_BY_HIDDEN = {key: cfg["host_building"] for key, cfg in HIDDEN_FACILITY_HOSTS.items()}
HIDDEN_BY_HOST_BUILDING = {cfg["host_building"]: key for key, cfg in HIDDEN_FACILITY_HOSTS.items()}


def _is_night(hour: int) -> bool:
    return hour >= 20 or hour < 6


def _check_access(db: Session, user_id: int, facility_key: str) -> FacilityAccessOut:
    gatekeeper_name = GATEKEEPER_BY_FACILITY.get(facility_key)
    if gatekeeper_name is None:
        raise HTTPException(status_code=400, detail="입장 제한이 없는 시설입니다.")

    gatekeeper = db.execute(select(NPC).where(NPC.name == gatekeeper_name)).scalar_one_or_none()
    if gatekeeper is None:
        raise HTTPException(status_code=500, detail="문지기 NPC를 찾을 수 없습니다.")

    config = get_or_create_config(db)
    world = get_or_create_world_state(db)
    relationship = get_or_create_relationship(db, "user", user_id, "npc", gatekeeper.id)

    is_night = _is_night(world.game_datetime.hour)
    required = config.speakeasy_familiarity_requirement
    familiar_enough = relationship.familiarity >= required

    if not is_night:
        return FacilityAccessOut(
            allowed=False,
            reason="밤에만 몰래 운영됩니다. 낮에는 문이 잠겨 있습니다.",
            required_familiarity=required,
            current_familiarity=relationship.familiarity,
            is_night=is_night,
        )
    if not familiar_enough:
        return FacilityAccessOut(
            allowed=False,
            reason=f"{gatekeeper_name}과(와) 아직 그 정도로 친하지 않습니다. (친밀도 {relationship.familiarity:.0f}/{required:.0f})",
            required_familiarity=required,
            current_familiarity=relationship.familiarity,
            is_night=is_night,
        )
    return FacilityAccessOut(
        allowed=True,
        reason="입장 가능합니다.",
        required_familiarity=required,
        current_familiarity=relationship.familiarity,
        is_night=is_night,
    )


@router.get("/{facility_key}/access", response_model=FacilityAccessOut)
def check_access(facility_key: str, user_id: int, db: Session = Depends(get_db)) -> FacilityAccessOut:
    return _check_access(db, user_id, facility_key)


@router.get("/host/{building_key}/reveal", response_model=FacilityRevealOut)
def check_hidden_reveal(building_key: str, user_id: int, db: Session = Depends(get_db)) -> FacilityRevealOut:
    """이 건물(술집/대장간 등)이 지금 이 유저에게 숨겨진 시설(도박장/암시장)로 "변신"해 있는지 확인한다.

    친밀도가 부족하면 그런 시설이 존재한다는 어떤 힌트도 주지 않는다 - 그냥 평범한 건물처럼 보인다.
    """
    hidden_key = HIDDEN_BY_HOST_BUILDING.get(building_key)
    if hidden_key is None:
        return FacilityRevealOut(revealed=False, hidden_key=None)

    access = _check_access(db, user_id, hidden_key)
    if access.allowed:
        return FacilityRevealOut(revealed=True, hidden_key=hidden_key)
    return FacilityRevealOut(revealed=False, hidden_key=None)


@router.post("/gamble", response_model=GambleResult)
def gamble(payload: GambleRequest, db: Session = Depends(get_db)) -> GambleResult:
    access = _check_access(db, payload.user_id, "gambling_den")
    if not access.allowed:
        return GambleResult(success=False, message=access.reason, gold=0)

    user = db.get(User, payload.user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없습니다.")
    if user.gold < payload.bet:
        return GambleResult(success=False, message="베팅할 골드가 부족합니다.", gold=user.gold)

    config = get_or_create_config(db)
    won = random.random() < config.gambling_win_chance
    user.gold += payload.bet if won else -payload.bet
    db.add(user)
    db.commit()

    message = f"{payload.bet} 골드를 걸어 {'이겼습니다! 두 배로 돌려받았습니다.' if won else '잃었습니다...'}"
    return GambleResult(success=True, won=won, message=message, gold=user.gold)
