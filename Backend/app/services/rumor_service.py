"""소문 전파 시스템.

- 소문마다 고유 ID(UUID)를 부여하고, NPC별 RumorKnowledge에 "이미 앎" 태그를 남겨 중복 전파(무한 메아리)를 막는다.
- 원본(Fact)과 개인화된 왜곡본(Rumor)을 분리 저장하여, 특정 NPC(경찰 등)가 소문을 진압할 수 있게 한다.
- 왜곡 여부/강도는 성격 태그 기반 확률(주사위)로 결정하고, 왜곡 텍스트는 세계관 규칙 내에서만 생성한다.
- reputation_penalty가 있는 소문(범죄/무례한 행동)은 "공개적으로 알려질 때"만 유저 평판을 깎는다:
  목격자가 그 자리에서 알게 되거나(propagate_rumor), 피해자 본인이 나중에 다른 NPC에게 얘기했을 때
  (역시 propagate_rumor 경로). 피해자 혼자만 아는 상태(record_direct_knowledge)는 평판에 영향이 없다.
"""

import random
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.npc import NPC
from app.models.rumor import Rumor, RumorKnowledge
from app.models.user import User
from app.services import memory_service
from app.services.llm_service import generate_text

WORLD_BIBLE_CONSTRAINT = (
    "너는 들은 이야기를 다른 사람에게 전할 때, 너의 성격에 따라 정보를 조금씩 왜곡하거나 과장해서 말할 수 있다. "
    "단, 이 마을은 현실적인 세계관이다. 마법, 괴물, 외계인, 지구 멸망 같은 초자연적이거나 스케일이 너무 큰 "
    "판타지 요소는 절대 언급하지 마라. 과장이나 왜곡은 오직 '사람 간의 관계(누가 훔쳤다, 배신했다, 돈을 잃었다)'나 "
    "'현실적인 사고(방화, 실수)' 선에서만 이루어져야 한다. 한두 문장으로 짧게 답하라."
)

GOSSIPY_TRAITS = {"gossipy", "수다쟁이", "의심많음", "suspicious"}
HONEST_TRAITS = {"honest", "정직함", "과묵함", "reserved"}

# 첫 공개(propagate) 시 reputation_penalty 전액 적용, 그 이후 추가로 퍼질 때마다 이 비율만큼만 적용.
SUBSEQUENT_SPREAD_PENALTY_RATIO = 0.25
DEFAULT_USER_ID = 1  # 싱글플레이 전제


def get_distortion_chance(npc: NPC) -> float:
    traits = {t.strip() for t in (npc.core_traits or "").split(",") if t.strip()}
    if traits & GOSSIPY_TRAITS:
        return 0.4
    if traits & HONEST_TRAITS:
        return 0.05
    return 0.15


def create_rumor(
    db: Session,
    fact_text: str,
    origin_event_id: int | None = None,
    subject_npc_id: int | None = None,
    reputation_penalty: float = 0.0,
) -> Rumor:
    rumor = Rumor(
        fact_text=fact_text,
        origin_event_id=origin_event_id,
        subject_npc_id=subject_npc_id,
        reputation_penalty=reputation_penalty,
    )
    db.add(rumor)
    db.commit()
    db.refresh(rumor)
    return rumor


async def _distort_text(fact_text: str, npc: NPC) -> str:
    llm_result = await generate_text(
        system_prompt=f"너는 '{npc.name}'({npc.job}, 성격: {npc.personality})다. {WORLD_BIBLE_CONSTRAINT}",
        user_prompt=f"방금 들은 이야기: {fact_text}\n이 이야기를 너의 성격대로 다른 사람에게 전달할 문장을 만들어줘.",
    )
    if llm_result:
        return llm_result
    # 폴백: 간단한 알고리즘적 과장 (LLM 없이도 소문 시스템이 동작하도록)
    return f"{fact_text} (소문에 따르면 그렇다더라...)"


def already_knows(db: Session, npc_id: int, rumor_id: str) -> bool:
    stmt = select(RumorKnowledge).where(RumorKnowledge.npc_id == npc_id, RumorKnowledge.rumor_id == rumor_id)
    return db.execute(stmt).scalar_one_or_none() is not None


def _public_spread_count(db: Session, rumor_id: str) -> int:
    stmt = select(RumorKnowledge).where(RumorKnowledge.rumor_id == rumor_id, RumorKnowledge.is_public.is_(True))
    return len(list(db.execute(stmt).scalars().all()))


def _apply_reputation_penalty(db: Session, rumor: Rumor, is_first_spread: bool) -> None:
    if rumor.reputation_penalty <= 0:
        return
    user = db.get(User, DEFAULT_USER_ID)
    if user is None:
        return
    penalty = rumor.reputation_penalty if is_first_spread else rumor.reputation_penalty * SUBSEQUENT_SPREAD_PENALTY_RATIO
    user.reputation = max(user.reputation - penalty, 0)
    db.add(user)
    db.commit()


def record_direct_knowledge(db: Session, rumor: Rumor, npc: NPC, now: datetime) -> RumorKnowledge:
    """피해자/당사자 본인이 사건을 직접 겪어서 아는 것 (목격자가 없어도 당사자는 항상 안다).

    아직 아무에게도 알려지지 않은 사적인 기억이므로 평판에는 영향을 주지 않는다. 다만 이 NPC가
    나중에(예: 다른 NPC와 우연히 마주쳤을 때) 이 소문을 실제로 옮기면, 그 시점에는 propagate_rumor가
    호출되어 그때 비로소 평판이 깎인다.
    """
    if already_knows(db, npc.id, rumor.id):
        existing = db.execute(
            select(RumorKnowledge).where(RumorKnowledge.npc_id == npc.id, RumorKnowledge.rumor_id == rumor.id)
        ).scalar_one()
        return existing

    knowledge = RumorKnowledge(
        npc_id=npc.id,
        rumor_id=rumor.id,
        distorted_text=rumor.fact_text,
        is_distorted=False,
        is_public=False,
    )
    db.add(knowledge)
    db.commit()
    db.refresh(knowledge)

    memory_service.add_memory(
        npc_id=npc.id,
        text=f"[직접 경험] {rumor.fact_text}",
        importance=9.0,
        memory_type="episodic",
        game_timestamp=now,
    )
    return knowledge


async def propagate_rumor(db: Session, rumor: Rumor, npc: NPC, now: datetime) -> RumorKnowledge | None:
    """NPC가 소문을 (공개적으로) 처음 접했을 때 처리한다. 이미 아는 소문이면 None(중복 전파 방지).

    목격자가 그 자리에서 알게 되는 경우, 혹은 소문을 아는 NPC가 다른 NPC에게 옮기는 경우 모두 이 함수를
    통해야 한다. reputation_penalty가 있는 소문이면 이 호출 시점에 유저 평판이 깎인다 (첫 공개는 전액,
    이후 추가로 퍼질 때마다 일부만).
    """
    if already_knows(db, npc.id, rumor.id):
        return None

    is_first_spread = _public_spread_count(db, rumor.id) == 0

    roll = random.random()
    distortion_chance = get_distortion_chance(npc)
    is_distorted = roll < distortion_chance

    distorted_text = await _distort_text(rumor.fact_text, npc) if is_distorted else rumor.fact_text

    knowledge = RumorKnowledge(
        npc_id=npc.id,
        rumor_id=rumor.id,
        distorted_text=distorted_text,
        is_distorted=is_distorted,
        is_public=True,
    )
    db.add(knowledge)
    db.commit()
    db.refresh(knowledge)

    memory_service.add_memory(
        npc_id=npc.id,
        text=f"[소문] {distorted_text}",
        importance=6.0,
        memory_type="rumor",
        game_timestamp=now,
    )

    _apply_reputation_penalty(db, rumor, is_first_spread)

    return knowledge


def get_known_rumors(db: Session, npc_id: int) -> list[RumorKnowledge]:
    stmt = select(RumorKnowledge).where(RumorKnowledge.npc_id == npc_id)
    return list(db.execute(stmt).scalars().all())
