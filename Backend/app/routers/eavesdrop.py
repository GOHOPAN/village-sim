"""엿듣기: 유저가 은신 상태로 두 NPC의 대화를 몰래 들었을 때, 게임 마스터 LLM을 1회만 호출해
대본 전체를 통째로 받아온다 (NPC별로 핑퐁 호출하지 않아 지연시간/비용을 최소화).
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.npc import NPC
from app.schemas.chat import EavesdropLine, EavesdropRequest, EavesdropResponse
from app.services.llm_service import generate_json
from app.services.world_event_manager import EVENT_DESCRIPTIONS, get_or_create_world_state

router = APIRouter(prefix="/eavesdrop", tags=["eavesdrop"])

GM_SYSTEM_PROMPT = (
    "너는 2D 마을 시뮬레이션 게임의 전지적 게임 마스터다. 두 NPC가 우연히 마주쳐 나누는 짧은 대화 대본을 "
    "3~4줄 분량으로 작성하라. 각 NPC의 성격과 현재 상태를 반영하되, 마법/괴물 같은 초자연적 요소는 넣지 마라."
)


def _fallback_lines(npc_a: NPC, npc_b: NPC) -> list[EavesdropLine]:
    return [
        EavesdropLine(speaker=npc_a.name, text="요즘 별일 없지?"),
        EavesdropLine(speaker=npc_b.name, text="그냥 그렇지 뭐. 너는 좀 어때?"),
        EavesdropLine(speaker=npc_a.name, text="나야 늘 똑같지."),
    ]


@router.post("", response_model=EavesdropResponse)
async def eavesdrop(payload: EavesdropRequest, db: Session = Depends(get_db)) -> EavesdropResponse:
    npc_a = db.get(NPC, payload.npc_a_id)
    npc_b = db.get(NPC, payload.npc_b_id)
    if npc_a is None or npc_b is None:
        raise HTTPException(status_code=404, detail="NPC를 찾을 수 없습니다.")

    world = get_or_create_world_state(db)

    user_prompt_parts = [
        f"NPC A: {npc_a.name} ({npc_a.job}, 성격: {npc_a.personality}, 기분: {npc_a.mood})",
        f"NPC B: {npc_b.name} ({npc_b.job}, 성격: {npc_b.personality}, 기분: {npc_b.mood})",
        f"현재 시각: {world.game_datetime:%H:%M}, 날씨: {world.weather}",
    ]
    if payload.topic_hint:
        user_prompt_parts.append(f"대화 소재 힌트: {payload.topic_hint}")
    user_prompt_parts.append(
        '반드시 다음 JSON 스키마로만 답하라: {"lines": [{"speaker": "이름", "text": "대사"}, ...], '
        '"used_fallback": false}'
    )

    result = await generate_json(GM_SYSTEM_PROMPT, "\n".join(user_prompt_parts), EavesdropResponse)
    if result is None:
        return EavesdropResponse(lines=_fallback_lines(npc_a, npc_b), used_fallback=True)
    return result
