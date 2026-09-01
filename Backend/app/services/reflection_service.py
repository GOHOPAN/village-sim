"""성찰(Reflection) 서비스.

- 유저가 침대에서 잠들 때(하루 1회) 트리거된다.
- 오늘 하루의 기억들을 모아 LLM에게 "장기 요약"을 만들어달라고 요청한다.
- 팩트 크로스체크: 성찰 결과를 그대로 신뢰하지 않고, MySQL의 관계 데이터(Relationship)와 모순되지
  않도록 프롬프트 단계에서 강하게 제약을 걸고, 결과 텍스트에도 관계 수치 요약을 덧붙여 저장한다.
"""

from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models.npc import NPC
from app.models.relationship import Relationship
from app.services import memory_service
from app.services.llm_service import generate_text

REFLECTION_CONSTRAINT = (
    "너는 NPC의 하루를 돌아보고 장기적인 생각/가치관을 1~2문장으로 요약하는 역할이다. "
    "절대로 주어진 기억에 없는 새로운 사실을 추론하거나 지어내지 마라 (할루시네이션 금지). "
    "아래에 주어지는 '반드시 지켜야 할 현재 관계 수치'와 모순되는 감정 표현을 하지 마라. "
    "있는 사실만 건조하게 압축하여 한국어 1~2문장으로 답하라."
)


def _relationship_fact_line(relationship: Relationship | None) -> str:
    if relationship is None:
        return "유저와 아직 특별한 관계가 형성되지 않았다."
    return (
        f"[반드시 지켜야 할 현재 관계 수치] 친밀도 {relationship.familiarity:.0f}, "
        f"호감도 {relationship.affection:.0f}, 신뢰도 {relationship.trust:.0f}, "
        f"존중도 {relationship.respect:.0f}, 긴장도 {relationship.tension:.0f} (모두 0~100 스케일)"
    )


def _fallback_summary(memory_texts: list[str]) -> str:
    """LLM 없이도 동작하는 결정론적 폴백: 최근 기억을 건조하게 이어붙인다 (할루시네이션 위험 없음)."""
    if not memory_texts:
        return "특별히 기억할 만한 사건이 없었다."
    joined = " / ".join(memory_texts[-5:])
    return f"오늘 있었던 일: {joined}"


async def reflect_npc(db: Session, npc: NPC, relationship: Relationship | None, now: datetime) -> str:
    since = now - timedelta(hours=24)
    todays_memories = memory_service.get_todays_memories(npc.id, since=since)
    memory_texts = [m.text for m in todays_memories]

    if not memory_texts:
        summary = npc.latest_reflection or "아직 특별한 성찰 내용이 없다."
    else:
        system_prompt = (
            f"너는 '{npc.name}'({npc.job}, 성격: {npc.personality})다. {REFLECTION_CONSTRAINT}"
        )
        user_prompt = (
            f"{_relationship_fact_line(relationship)}\n\n"
            "[오늘의 기억들]\n" + "\n".join(f"- {t}" for t in memory_texts)
        )
        llm_summary = await generate_text(system_prompt=system_prompt, user_prompt=user_prompt)
        summary = llm_summary if llm_summary else _fallback_summary(memory_texts)

    memory_service.add_memory(
        npc_id=npc.id,
        text=summary,
        importance=9.0,
        memory_type="reflection",
        game_timestamp=now,
    )

    npc.latest_reflection = summary
    db.add(npc)
    db.commit()
    db.refresh(npc)
    return summary
