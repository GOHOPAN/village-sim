from datetime import date

from sqlalchemy.orm import Session

from app.models.npc import NPC
from app.models.user import User
from app.models.world import WorldState
from app.schemas.routine import RoutineSchedule
from app.services.routine_service import fallback_routine, save_routine
from app.world_layout import NPC_SEED, PLAYER_HOME_TILE, tile_to_px


def seed_initial_data(db: Session) -> None:
    """앱 최초 실행 시 기본 유저 1명, NPC 7명(촌장/상인/대장장이/의사/경찰/술집주인/목수), 세계 상태를 만든다."""

    if db.get(WorldState, 1) is None:
        db.add(WorldState(id=1))
        db.commit()

    if db.get(User, 1) is None:
        home_x, home_y = tile_to_px(*PLAYER_HOME_TILE)
        db.add(User(id=1, username="Player", pos_x=home_x, pos_y=home_y))
        db.commit()

    existing_names = {n.name for n in db.query(NPC).all()}
    for seed in NPC_SEED:
        if seed["name"] in existing_names:
            continue
        home_x, home_y = tile_to_px(*seed["home_tile"])
        work_x, work_y = tile_to_px(*seed["workplace_tile"])
        npc = NPC(
            name=seed["name"],
            job=seed["job"],
            personality=seed["personality"],
            secret=seed["secret"],
            core_traits=seed["core_traits"],
            pos_x=home_x,
            pos_y=home_y,
            home_x=home_x,
            home_y=home_y,
            workplace_x=work_x,
            workplace_y=work_y,
        )
        db.add(npc)
    db.commit()

    # 프론트엔드가 첫 실행부터 바로 이동 애니메이션을 그릴 수 있도록, 성찰/LLM 없이도
    # 결정론적 폴백 루틴(집->일터->집)을 오늘 날짜로 미리 저장해 둔다.
    today = date.today()
    for npc in db.query(NPC).all():
        schedule: RoutineSchedule = fallback_routine(npc)
        save_routine(db, npc.id, today, schedule, is_fallback=True, is_event_override=False)
