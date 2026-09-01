"""NPC-NPC 자동 마주침(우연히 스쳐 지나가는) 로직.

프론트엔드가 두 NPC의 거리가 가까워졌음을 감지하면 /npc-encounter/resolve 하나만 호출한다.
과거에는 프론트엔드가 확률을 굴려 ambient(저비용)/dialogue(LLM 1회 호출) 중 무엇을 부를지 직접
결정했지만, 이제는 "마주쳤다고 반드시 뭔가 일어나야 하는 것"이 아니라 관계성(친밀도/호감도/긴장도)에
따라 아예 멈추지 않고 그냥 지나칠 수도 있어야 하므로, 이 판정 자체를 백엔드가 한 번에 처리한다.

- 멈추지 않기로 하면(stopped=false) 정말로 아무 효과도 없다 (관계 변화 없음, 대사 없음).
- 멈추기로 하면(stopped=true) 그 안에서 다시 encounter_dialogue_chance 확률로 저비용(이모지만) /
  고비용(GM LLM 대사 생성) 중 하나를 골라 처리한다.
"""

import random
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.npc import NPC
from app.models.relationship import Relationship
from app.schemas.chat import EavesdropLine
from app.schemas.encounter import EncounterRequest, EncounterResolveResult
from app.services import memory_service, relationship_service, rumor_service
from app.services.game_config_service import get_or_create_config
from app.services.llm_service import generate_text
from app.services.world_event_manager import get_or_create_world_state, trigger_wedding

router = APIRouter(prefix="/npc-encounter", tags=["encounter"])

AMBIENT_FAMILIARITY_DELTA = 0.5
DIALOGUE_FAMILIARITY_DELTA = 1.5
ROMANCE_CHANCE = 0.3  # 대화가 이루어질 때마다 호감도(연애 감정)도 같이 오를 확률
ROMANCE_AFFECTION_MIN, ROMANCE_AFFECTION_MAX = 2.0, 5.0

# 멈춰서 대화할 확률 계산용 상수 - 서로 잘 모르고 사이가 안 좋을수록 그냥 지나칠 확률이 높아진다.
STOP_CHANCE_BASE = 0.12
STOP_CHANCE_FAMILIARITY_WEIGHT = 0.6
STOP_CHANCE_AFFECTION_WEIGHT = 0.25
STOP_CHANCE_TENSION_PENALTY_WEIGHT = 0.3
STOP_CHANCE_MIN, STOP_CHANCE_MAX = 0.05, 0.9

AMBIENT_PAUSE_MS = 1500
DIALOGUE_LINE_PAUSE_MS = 1600
DIALOGUE_PAUSE_BASE_MS = 1500


def _get_pair(db: Session, npc_a_id: int, npc_b_id: int) -> tuple[NPC, NPC]:
    npc_a = db.get(NPC, npc_a_id)
    npc_b = db.get(NPC, npc_b_id)
    if npc_a is None or npc_b is None or npc_a.is_dead or npc_b.is_dead:
        raise HTTPException(status_code=404, detail="NPC를 찾을 수 없거나 이미 사망했습니다.")
    return npc_a, npc_b


def _decide_stop(relationship: Relationship) -> bool:
    chance = (
        STOP_CHANCE_BASE
        + (relationship.familiarity / 100) * STOP_CHANCE_FAMILIARITY_WEIGHT
        + (relationship.affection / 100) * STOP_CHANCE_AFFECTION_WEIGHT
        - (relationship.tension / 100) * STOP_CHANCE_TENSION_PENALTY_WEIGHT
    )
    chance = max(STOP_CHANCE_MIN, min(chance, STOP_CHANCE_MAX))
    return random.random() < chance


def _ambient(db: Session, relationship: Relationship) -> EncounterResolveResult:
    relationship_service.adjust_relationship(db, relationship, familiarity_delta=AMBIENT_FAMILIARITY_DELTA)
    return EncounterResolveResult(
        stopped=True, pause_ms=AMBIENT_PAUSE_MS, lines=[], familiarity_delta=AMBIENT_FAMILIARITY_DELTA
    )


async def _dialogue(
    db: Session, npc_a: NPC, npc_b: NPC, relationship: Relationship, now: datetime
) -> EncounterResolveResult:
    world = get_or_create_world_state(db)

    system_prompt = (
        "너는 2D 마을 시뮬레이션 게임의 전지적 게임 마스터다. 두 NPC가 길에서 우연히 마주쳐 나누는 아주 짧은 "
        "잡담(2~3줄)을 만들어라. 각 NPC의 성격과 관계를 반영하되, 마법/괴물 같은 초자연적 요소는 절대 넣지 마라. "
        '반드시 다음 형식으로만 답하라 (각 줄은 "이름: 대사" 형태, 그 외 설명 금지):\n'
        f"{npc_a.name}: (대사)\n{npc_b.name}: (대사)"
    )
    user_prompt = (
        f"NPC A: {npc_a.name} ({npc_a.job}, 성격: {npc_a.personality}, 기분: {npc_a.mood})\n"
        f"NPC B: {npc_b.name} ({npc_b.job}, 성격: {npc_b.personality}, 기분: {npc_b.mood})\n"
        f"둘의 친밀도: {relationship.familiarity:.0f}/100\n"
        f"현재 시각: {world.game_datetime:%H:%M}, 날씨: {world.weather}"
    )

    raw = await generate_text(system_prompt, user_prompt)
    used_fallback = raw is None
    lines: list[EavesdropLine] = []
    if raw:
        for line in raw.strip().splitlines():
            if ":" in line:
                speaker, _, text = line.partition(":")
                lines.append(EavesdropLine(speaker=speaker.strip(), text=text.strip()))
    if not lines:
        used_fallback = True
        lines = [
            EavesdropLine(speaker=npc_a.name, text="요즘 별일 없지?"),
            EavesdropLine(speaker=npc_b.name, text="그냥 그렇지 뭐."),
        ]

    affection_delta = (
        random.uniform(ROMANCE_AFFECTION_MIN, ROMANCE_AFFECTION_MAX) if random.random() < ROMANCE_CHANCE else 0.0
    )
    relationship_service.adjust_relationship(
        db, relationship, familiarity_delta=DIALOGUE_FAMILIARITY_DELTA, affection_delta=affection_delta
    )

    # 호감도(연애 감정)가 임계치를 넘고 아직 결혼하지 않았다면 결혼식이 자동으로 열린다.
    config = get_or_create_config(db)
    if not relationship.married and relationship.affection >= config.wedding_affection_threshold:
        relationship.married = True
        db.add(relationship)
        db.commit()
        await trigger_wedding(db, npc_a, npc_b, now)

    # 대화가 짧은 소문 하나쯤 낳을 수도 있게, 낮은 확률로 서로에게 최근 사실을 흘린다.
    if random.random() < 0.2:
        known = rumor_service.get_known_rumors(db, npc_a.id)
        if known:
            chosen = random.choice(known)
            from app.models.rumor import Rumor

            rumor = db.get(Rumor, chosen.rumor_id)
            if rumor:
                await rumor_service.propagate_rumor(db, rumor, npc_b, now)

    memory_service.add_memory(
        npc_id=npc_a.id, text=f"{npc_b.name}과(와) 길에서 마주쳐 잡담을 나눴다.", importance=2.0,
        memory_type="episodic", game_timestamp=now,
    )
    memory_service.add_memory(
        npc_id=npc_b.id, text=f"{npc_a.name}과(와) 길에서 마주쳐 잡담을 나눴다.", importance=2.0,
        memory_type="episodic", game_timestamp=now,
    )

    pause_ms = DIALOGUE_PAUSE_BASE_MS + len(lines) * DIALOGUE_LINE_PAUSE_MS
    return EncounterResolveResult(
        stopped=True,
        pause_ms=pause_ms,
        lines=lines,
        used_fallback=used_fallback,
        familiarity_delta=DIALOGUE_FAMILIARITY_DELTA,
    )


@router.post("/resolve", response_model=EncounterResolveResult)
async def resolve_encounter(payload: EncounterRequest, db: Session = Depends(get_db)) -> EncounterResolveResult:
    """두 NPC가 마주쳤을 때 멈춰서 대화할지 그냥 지나칠지를 관계성에 따라 판정하고, 멈추기로 했다면
    그 자리에서 실제 상호작용(이모지 또는 GM 대사)까지 함께 처리해서 반환한다."""
    npc_a, npc_b = _get_pair(db, payload.npc_a_id, payload.npc_b_id)
    relationship = relationship_service.get_or_create_relationship(db, "npc", npc_a.id, "npc", npc_b.id)

    if not _decide_stop(relationship):
        return EncounterResolveResult(stopped=False)

    config = get_or_create_config(db)
    now = get_or_create_world_state(db).game_datetime
    if random.random() < (config.encounter_dialogue_chance or 0.0):
        return await _dialogue(db, npc_a, npc_b, relationship, now)
    return _ambient(db, relationship)
