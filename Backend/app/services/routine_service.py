"""일일 루틴(시간표) 생성 서비스.

- 루틴은 하드코딩하지 않고, 매일 밤 LLM에게 "내일의 JSON 시간표를 새로 짜라"고 지시한다.
- LLM 실패/JSON 파싱 실패 시 게임이 멈추지 않도록 반드시 폴백(기본 생존 시간표: 집->일터->집)을 적용한다.
- 마을 이벤트(결혼식/장례식/화재 등) 발생 시, 개인 루틴을 무시하고 이벤트 전용 시간표로 강제 오버라이드한다.
"""

from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.npc import NPC
from app.models.routine import Routine
from app.schemas.routine import RoutineEntry, RoutineSchedule
from app.services.llm_service import generate_json
from app.world_layout import OPEN_MARKERS, building_interior_tile, tile_to_px

ROUTINE_SYSTEM_PROMPT_TEMPLATE = (
    "너는 '{name}'({job}, 성격: {personality})의 하루 일정을 계획하는 역할이다. "
    "주어진 현재 상태와 성찰 내용을 반영하여, 오늘 08:00부터 24:00까지의 현실적인 시간표를 "
    "JSON으로 작성하라. 하드코딩된 루틴이 아니라 상황에 맞게 동적으로 변경해야 한다. "
    "다른 마을 사람들과 우연히 마주칠 수 있도록, 특별한 사정이 없다면 점심 무렵엔 마을 광장을, "
    "저녁 무렵엔 술집을 들르는 일정을 하루 중 한 번쯤 포함하는 것이 좋다. "
    "다른 사람의 집은 사유 공간이므로, 초대받았다는 특별한 사정이 없는 한 그 좌표로 일정을 잡지 마라 "
    "(너 자신의 집으로만 귀가/취침 일정을 잡을 수 있다)."
)

ROUTINE_JSON_INSTRUCTION = (
    '반드시 다음 JSON 스키마로만 답하라: {{"npc_id": {npc_id}, "entries": '
    '[{{"time": "HH:MM", "action": "행동 설명", "x": 0.0, "y": 0.0, "state": "IDLE|WALK|WORK|SLEEP"}}]}}'
)


def fallback_routine(npc: NPC) -> RoutineSchedule:
    """기본 생존 시간표: 집 -> 일터 -> (점심때 광장) -> 일터 -> (저녁에 술집) -> 집 -> 취침.

    LLM 없이도(폴백 상태에서도) 모든 NPC가 낮 12시엔 광장, 저녁 7시엔 술집에 몰리게 해서
    서로 마주칠 기회를 만든다 (NPC-NPC 자동 마주침 시스템이 실제로 발동할 수 있으려면
    동선이 하나로만 왕복해서는 안 되고, 공용 공간에서 겹치는 시간대가 있어야 한다).
    """
    square_col, square_row, _square_label = OPEN_MARKERS["square"]
    square_x, square_y = tile_to_px(square_col, square_row)
    tavern_x, tavern_y = tile_to_px(*building_interior_tile("tavern"))

    return RoutineSchedule(
        npc_id=npc.id,
        entries=[
            RoutineEntry(time="08:00", action="출근", x=npc.workplace_x, y=npc.workplace_y, state="WALK"),
            RoutineEntry(time="12:00", action="점심(광장)", x=square_x, y=square_y, state="WALK"),
            RoutineEntry(time="13:00", action="오후 근무", x=npc.workplace_x, y=npc.workplace_y, state="WORK"),
            RoutineEntry(time="19:00", action="저녁 겸 술 한 잔(술집)", x=tavern_x, y=tavern_y, state="WALK"),
            RoutineEntry(time="21:00", action="귀가", x=npc.home_x, y=npc.home_y, state="WALK"),
            RoutineEntry(time="23:00", action="취침", x=npc.home_x, y=npc.home_y, state="SLEEP"),
        ],
    )


async def generate_daily_routine(
    npc: NPC,
    state_summary: str,
    event_override_instruction: str | None = None,
) -> tuple[RoutineSchedule, bool, bool]:
    """반환값: (스케줄, is_fallback, is_event_override)"""
    system_prompt = ROUTINE_SYSTEM_PROMPT_TEMPLATE.format(name=npc.name, job=npc.job, personality=npc.personality)
    user_prompt_parts = [state_summary, ROUTINE_JSON_INSTRUCTION.format(npc_id=npc.id)]
    is_event_override = event_override_instruction is not None
    if event_override_instruction:
        user_prompt_parts.insert(0, f"[이벤트 강제 지침] {event_override_instruction}")
    user_prompt = "\n\n".join(user_prompt_parts)

    schedule = await generate_json(system_prompt, user_prompt, RoutineSchedule)
    if schedule is None:
        return fallback_routine(npc), True, is_event_override
    return schedule, False, is_event_override


HOME_PROXIMITY_THRESHOLD_PX = 24.0  # 반 타일 정도의 오차는 같은 집으로 취급한다


def enforce_physical_norms(db: Session, npc: NPC, schedule: RoutineSchedule) -> RoutineSchedule:
    """개인 집은 그 주인만 드나들 수 있는 사유 공간이라는 규범을 프로그램적으로 강제한다.

    스몰빌 논문에서 자연어 프롬프트만으로는 "1인용 화장실은 동시에 한 명만" 같은 물리적 규범이
    가끔 지켜지지 않았던 것(기숙사 화장실을 여럿이 동시에 쓰는 버그)과 같은 문제를 막기 위해,
    시스템 프롬프트로 안내하는 것에 더해 저장 직전에 한 번 더 검증한다: 만약 LLM이 다른 NPC의
    집 좌표로 일정을 잡았다면, 조용히 자신의 집 좌표로 대체한다.
    """
    other_homes = [
        (other.home_x, other.home_y)
        for other in db.execute(select(NPC).where(NPC.id != npc.id, NPC.is_dead.is_(False))).scalars().all()
    ]
    if not other_homes:
        return schedule

    sanitized_entries = []
    for entry in schedule.entries:
        violates_privacy = any(
            abs(entry.x - hx) < HOME_PROXIMITY_THRESHOLD_PX and abs(entry.y - hy) < HOME_PROXIMITY_THRESHOLD_PX
            for hx, hy in other_homes
        )
        if violates_privacy:
            entry = entry.model_copy(update={"x": npc.home_x, "y": npc.home_y})
        sanitized_entries.append(entry)

    return schedule.model_copy(update={"entries": sanitized_entries})


def save_routine(
    db: Session,
    npc_id: int,
    routine_date: date,
    schedule: RoutineSchedule,
    is_fallback: bool,
    is_event_override: bool,
) -> Routine:
    stmt = select(Routine).where(Routine.npc_id == npc_id, Routine.routine_date == routine_date)
    routine = db.execute(stmt).scalar_one_or_none()
    entries_payload = [entry.model_dump() for entry in schedule.entries]

    if routine is None:
        routine = Routine(npc_id=npc_id, routine_date=routine_date)

    routine.entries = entries_payload
    routine.is_fallback = is_fallback
    routine.is_event_override = is_event_override
    db.add(routine)
    db.commit()
    db.refresh(routine)
    return routine


def get_todays_routine(db: Session, npc_id: int, routine_date: date) -> Routine | None:
    stmt = select(Routine).where(Routine.npc_id == npc_id, Routine.routine_date == routine_date)
    return db.execute(stmt).scalar_one_or_none()
