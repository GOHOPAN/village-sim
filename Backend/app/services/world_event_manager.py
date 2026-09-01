"""World Event Manager.

정해진 순서로 세계를 업데이트한다:
1. 환경 이벤트 발생 (화재는 순수 랜덤, 결혼식/장례식은 상태 기반 결정론적 트리거)
2. 주변 NPC들의 기억 브로드캐스팅 (is_dead=True NPC는 완전 배제)
3. 비동기 루틴 갱신 (async LLM 다중 호출, 실패 시 폴백 루틴 강제 주입)
4. 관계 데이터 업데이트

또한 "유저 취침/기절" 트리거로 실행되는 글로벌 나이트 사이클(성찰 -> 루틴 갱신 -> 계절 갱신)도 여기서 관리한다.
"""

import asyncio
import random
from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.event import WorldEvent
from app.models.npc import NPC
from app.models.world import WorldState
from app.services import memory_service, relationship_service, rumor_service
from app.services.game_config_service import get_or_create_config
from app.services.reflection_service import reflect_npc
from app.services.routine_service import enforce_physical_norms, generate_daily_routine, save_routine
from app.world_layout import OPEN_MARKERS, tile_to_px

ILLNESS_NAME = "감기"
SEASONS = ["봄", "여름", "가을", "겨울"]
WORLD_START_DATE = date(2025, 3, 1)

HP_HOSPITAL_VISIT_THRESHOLD = 40
HP_NEEDS_HELP_THRESHOLD = 15

# 이벤트 풀: 결혼식(호감도 임계 도달), 장례식(시체 발견), 화재(순수 랜덤)
EVENT_DESCRIPTIONS = {
    "wedding": "마을에 결혼식이 열렸다. 축제 분위기로 다들 들떠 있다.",
    "funeral": "마을에 장례식이 열렸다. 마을 전체가 애도 분위기다.",
    "fire": "마을에 화재가 발생했다.",
}

EVENT_OVERRIDE_INSTRUCTIONS = {
    "wedding": (
        "오늘은 결혼식 날이다. 정오까지 마을 광장(결혼식장)으로 이동해 축하하는 일정으로 하루를 채워라. "
        "평소보다 밝고 들뜬 분위기로 행동하라."
    ),
    "funeral": (
        "오늘은 장례식 날이다. 오전 중 묘지로 이동해 조문하는 일정으로 하루를 채워라. "
        "평소보다 차분하고 슬픈 분위기로 행동하라."
    ),
    "fire": (
        "방금 마을에 화재가 발생했다. 너의 직업과 이 사건과의 관계를 고려하여 루틴을 완전히 재계획하라 "
        "(예: 목수라면 복구 작업, 피해자라면 잘 곳을 구하는 일정, 관련 없는 사람이라면 구경/걱정하는 정도)."
    ),
}


def get_or_create_world_state(db: Session) -> WorldState:
    world = db.get(WorldState, 1)
    if world is None:
        world = WorldState(id=1)
        db.add(world)
        db.commit()
        db.refresh(world)
    return world


def get_living_npcs(db: Session, npc_ids: list[int] | None = None) -> list[NPC]:
    stmt = select(NPC).where(NPC.is_dead.is_(False))
    if npc_ids is not None:
        stmt = stmt.where(NPC.id.in_(npc_ids))
    return list(db.execute(stmt).scalars().all())


def trigger_event(
    db: Session, event_type: str, affected_npc_ids: list[int], data: dict, now: datetime
) -> WorldEvent:
    """1. 환경 이벤트 발생."""
    event = WorldEvent(event_type=event_type, affected_npc_ids=affected_npc_ids, data=data, status="active")
    db.add(event)
    db.commit()
    db.refresh(event)

    fact_text = data.get("custom_fact") or EVENT_DESCRIPTIONS.get(event_type, f"{event_type} 이벤트 발생")
    subject_npc_id = data.get("subject_npc_id")
    rumor = rumor_service.create_rumor(db, fact_text=fact_text, origin_event_id=event.id, subject_npc_id=subject_npc_id)

    broadcast_memory(db, event, rumor_fact_text=fact_text, now=now)
    return event


def broadcast_memory(db: Session, event: WorldEvent, rumor_fact_text: str, now: datetime) -> None:
    """2. 주변 NPC들의 기억 브로드캐스팅. 사망 NPC는 완전 배제."""
    npc_ids = event.affected_npc_ids or [npc.id for npc in get_living_npcs(db)]
    for npc in get_living_npcs(db, npc_ids):
        memory_service.add_memory(
            npc_id=npc.id,
            text=f"[사건] {rumor_fact_text}",
            importance=8.0,
            memory_type="fact",
            game_timestamp=now,
        )


async def regenerate_routines_for_event(db: Session, event: WorldEvent, now: datetime) -> list[str]:
    """3. 비동기 루틴 갱신 - 이벤트에 영향받은 NPC들만 대상으로 이벤트 전용 시간표를 강제 주입한다."""
    npc_ids = event.affected_npc_ids or [npc.id for npc in get_living_npcs(db)]
    npcs = get_living_npcs(db, npc_ids)
    override_instruction = EVENT_OVERRIDE_INSTRUCTIONS.get(event.event_type, "")

    async def _one(npc: NPC) -> str:
        state_summary = f"현재 상태: 기력 {npc.fatigue}, 기분 {npc.mood}. 성찰: {npc.latest_reflection or '없음'}"
        schedule, is_fallback, is_override = await generate_daily_routine(
            npc, state_summary, event_override_instruction=override_instruction
        )
        schedule = enforce_physical_norms(db, npc, schedule)
        save_routine(db, npc.id, now.date(), schedule, is_fallback, is_override)
        return npc.name

    results = await asyncio.gather(*(_one(npc) for npc in npcs), return_exceptions=False)
    return list(results)


def update_relationships_for_event(db: Session, event: WorldEvent) -> None:
    """4. 관계 데이터 업데이트 (이벤트 유형별 기본 훅). 세부 로직은 이벤트별로 확장 가능."""
    if event.event_type == "fire":
        helper_id = event.data.get("helper_npc_id")
        victim_id = event.data.get("victim_npc_id")
        if helper_id and victim_id:
            rel = relationship_service.get_or_create_relationship(db, "npc", victim_id, "npc", helper_id)
            relationship_service.adjust_relationship(db, rel, familiarity_delta=10.0, trust_delta=10.0)
    elif event.event_type == "wedding":
        a_id = event.data.get("npc_a_id")
        b_id = event.data.get("npc_b_id")
        if a_id and b_id:
            rel = relationship_service.get_or_create_relationship(db, "npc", a_id, "npc", b_id)
            relationship_service.adjust_relationship(db, rel, familiarity_delta=20.0, affection_delta=10.0, trust_delta=20.0)


async def run_full_event_cycle(db: Session, event_type: str, affected_npc_ids: list[int], data: dict) -> WorldEvent:
    """1~4단계를 순서대로 실행하는 진입점 (라우터에서 호출)."""
    world = get_or_create_world_state(db)
    now = world.game_datetime

    event = trigger_event(db, event_type, affected_npc_ids, data, now)
    await regenerate_routines_for_event(db, event, now)
    update_relationships_for_event(db, event)
    return event


def _has_active_event(db: Session, event_type: str) -> bool:
    stmt = select(WorldEvent).where(WorldEvent.event_type == event_type, WorldEvent.status == "active")
    return db.execute(stmt).scalar_one_or_none() is not None


async def trigger_wedding(db: Session, npc_a: NPC, npc_b: NPC, now: datetime) -> WorldEvent:
    """NPC-NPC 호감도가 임계치를 넘었을 때 호출되는 결정론적 결혼식 트리거 (랜덤 이벤트 아님)."""
    living_ids = [n.id for n in get_living_npcs(db)]
    event = trigger_event(
        db,
        "wedding",
        living_ids,
        {
            "npc_a_id": npc_a.id,
            "npc_b_id": npc_b.id,
            "custom_fact": f"{npc_a.name}와(과) {npc_b.name}의 결혼식이 열렸다.",
        },
        now,
    )
    await regenerate_routines_for_event(db, event, now)
    update_relationships_for_event(db, event)
    return event


async def trigger_funeral_from_death(db: Session, deceased: NPC, now: datetime) -> WorldEvent:
    """NPC 사망이 목격되었을 때(=발견되었을 때) 호출: 시체를 묘지로 옮기고 장례식을 시작한다.

    목격자가 없으면 이 함수는 호출되지 않는다 (아무도 모르게 지나가는 "완벽한 범죄"가 성립).
    """
    grave_col, grave_row, _grave_label = OPEN_MARKERS["graveyard"]
    deceased.pos_x, deceased.pos_y = tile_to_px(grave_col, grave_row)
    db.add(deceased)
    db.commit()

    living_ids = [n.id for n in get_living_npcs(db)]
    event = trigger_event(
        db,
        "funeral",
        living_ids,
        {"deceased_npc_id": deceased.id, "custom_fact": f"{deceased.name}이(가) 사망하여 장례식이 열렸다."},
        now,
    )
    await regenerate_routines_for_event(db, event, now)
    update_relationships_for_event(db, event)
    return event


async def _maybe_trigger_random_events(db: Session, now: datetime) -> list[str]:
    """매일 밤 화재를 확률적으로 자동 발생시킨다 (확률은 GameConfig에서 실시간 조정 가능).
    결혼식/장례식은 더 이상 랜덤이 아니라 각각 호감도 임계치/사망 발견이라는 상태 변화로 트리거된다.
    """
    config = get_or_create_config(db)
    living = get_living_npcs(db)
    triggered: list[str] = []
    if len(living) < 1:
        return triggered

    if random.random() < config.event_fire_chance and not _has_active_event(db, "fire"):
        victim = random.choice(living)
        others = [n for n in living if n.id != victim.id]
        affected = [victim.id] + [n.id for n in random.sample(others, min(2, len(others)))]
        event = trigger_event(
            db,
            "fire",
            affected,
            {"subject_npc_id": victim.id, "custom_fact": f"{victim.name}의 집에 화재가 발생했다."},
            now,
        )
        await regenerate_routines_for_event(db, event, now)
        update_relationships_for_event(db, event)
        triggered.append("fire")

    return triggered


def _process_illness(db: Session, npc: NPC, config) -> None:
    """낮은 확률로 감기에 걸리거나(건강할 때), 회복한다(아플 때). HP와 달리 유저에게 보여도 되는 정보."""
    if npc.illness:
        if random.random() < config.npc_illness_recovery_chance:
            npc.illness = ""
    else:
        if random.random() < config.npc_illness_chance:
            npc.illness = ILLNESS_NAME
    db.add(npc)


def _update_season(db: Session, world: WorldState, config) -> None:
    """게임 시작일 기준 경과 일수로 계절을 계산한다 (config.days_per_season 마다 순환)."""
    days_elapsed = (world.game_datetime.date() - WORLD_START_DATE).days
    season_index = (days_elapsed // max(config.days_per_season, 1)) % len(SEASONS)
    world.season = SEASONS[season_index]
    db.add(world)


def _npc_health_hint(npc: NPC) -> str:
    """체력이 낮으면 스스로 병원에 가야 한다는 힌트를, 매우 낮으면 다른 NPC의 도움이 필요하다는
    힌트를 루틴/성찰 프롬프트에 심어준다. HP 수치 자체는 유저에게 노출되지 않는 숨겨진 값이지만,
    NPC 자신의 행동 판단에는 당연히 반영되어야 한다."""
    if npc.hp <= HP_NEEDS_HELP_THRESHOLD:
        return " 몸 상태가 매우 위독하여 혼자 움직이기 힘들다. 다른 NPC가 부축해서 병원에 데려가야 한다."
    if npc.hp <= HP_HOSPITAL_VISIT_THRESHOLD:
        return " 몸 상태가 좋지 않아 오늘 중으로 병원에 들러야 할 것 같다."
    return ""


async def nightly_cycle(db: Session) -> dict:
    """유저가 잠들거나 기절했을 때 실행되는 글로벌 사이클: 전체 NPC 성찰 -> 루틴 갱신 -> 날짜/계절 증가."""
    world = get_or_create_world_state(db)
    now = world.game_datetime
    npcs = get_living_npcs(db)
    config = get_or_create_config(db)

    async def _reflect_and_route(npc: NPC) -> dict:
        relationship = relationship_service.get_or_create_relationship(db, "npc", npc.id, "user", 1)
        await reflect_npc(db, npc, relationship, now)
        relationship_service.decay_tension(db, relationship)
        _process_illness(db, npc, config)
        db.commit()

        health_hint = _npc_health_hint(npc)
        state_summary = (
            f"성찰: {npc.latest_reflection}. 현재 기분: {npc.mood}."
            + (f" 지금 {npc.illness}에 걸려 있다." if npc.illness else "")
            + health_hint
        )
        schedule, is_fallback, _ = await generate_daily_routine(npc, state_summary)
        schedule = enforce_physical_norms(db, npc, schedule)
        save_routine(db, npc.id, (now.date()), schedule, is_fallback, False)
        return {"npc_id": npc.id, "name": npc.name, "fallback": is_fallback}

    results = await asyncio.gather(*(_reflect_and_route(npc) for npc in npcs))

    triggered_events = await _maybe_trigger_random_events(db, now)

    world.game_datetime = world.game_datetime.replace(hour=8, minute=0, second=0, microsecond=0)
    _update_season(db, world, config)
    db.add(world)
    db.commit()

    return {"processed": results, "new_datetime": world.game_datetime.isoformat(), "random_events": triggered_events}
