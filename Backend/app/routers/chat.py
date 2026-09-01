from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.item_catalog import ITEM_CATALOG
from app.models.chat_log import ChatLog
from app.models.event import WorldEvent
from app.models.npc import NPC
from app.models.relationship import Relationship
from app.models.user import User
from app.schemas.chat import ChatRequest, ChatResponse, GiftRequest, NPCAction
from app.services import inventory_service, memory_service, relationship_service, rumor_service
from app.services.game_config_service import get_or_create_config
from app.services.llm_service import generate_json
from app.services.prompt_builder import build_chat_prompts
from app.services.world_event_manager import EVENT_DESCRIPTIONS, get_or_create_world_state

router = APIRouter(prefix="/chat", tags=["chat"])

RECENT_CHAT_WINDOW = 10
VERBAL_ABUSE_REPUTATION_PENALTY = 8.0

# LLM이 꺼져 있을 때(폴백 상태)만 쓰는 아주 단순한 키워드 기반 언어폭력 감지.
# LLM이 켜져 있으면 NPCAction.felt_disrespected(모델 자체 판단)가 우선한다.
ABUSIVE_KEYWORDS = [
    "미친", "병신", "죽여", "죽일", "꺼져", "닥쳐", "새끼", "지랄", "개새", "죽고싶", "때릴", "패버", "미친놈", "또라이",
]


def _looks_abusive(message: str) -> bool:
    return any(keyword in message for keyword in ABUSIVE_KEYWORDS)


def _build_fallback_action(user_message: str) -> NPCAction:
    return NPCAction(
        dialog="(잠시 고민하는 표정을 짓더니 조용히 고개를 끄덕인다.)",
        animation_state="IDLE",
        emotion="NEUTRAL",
        felt_disrespected=_looks_abusive(user_message),
    )


def _active_event_descriptions(db: Session, npc_id: int) -> list[str]:
    events = db.execute(select(WorldEvent).where(WorldEvent.status == "active")).scalars().all()
    descriptions = []
    for event in events:
        if not event.affected_npc_ids or npc_id in event.affected_npc_ids:
            descriptions.append(EVENT_DESCRIPTIONS.get(event.event_type, event.event_type))
    return descriptions


def _memory_importance_heuristic(action: NPCAction) -> float:
    base = 3.0
    base += min(abs(action.affection_delta) + abs(action.trust_delta) + abs(action.tension_delta), 7.0)
    return min(base, 10.0)


async def _handle_verbal_abuse(
    db: Session, npc: NPC, witness_npc_ids: list[int], now: datetime
) -> None:
    """언어폭력이 감지됐을 때: 목격자가 있으면 즉시 평판이 깎이고, 없으면 당사자(npc)만 기억해 두었다가
    나중에 실제로 소문이 퍼졌을 때 깎인다 (전투의 목격자 로직과 동일한 패턴)."""
    fact_text = f"유저가 {npc.name}에게 무례하게 굴었다(언어폭력)."
    rumor = rumor_service.create_rumor(
        db, fact_text=fact_text, subject_npc_id=npc.id, reputation_penalty=VERBAL_ABUSE_REPUTATION_PENALTY
    )

    witnesses = [
        w for wid in witness_npc_ids if (w := db.get(NPC, wid)) and not w.is_dead and w.id != npc.id
    ]
    if witnesses:
        for witness in witnesses:
            await rumor_service.propagate_rumor(db, rumor, witness, now)
    else:
        rumor_service.record_direct_knowledge(db, rumor, npc, now)


async def run_npc_turn(
    db: Session,
    user: User,
    npc: NPC,
    user_message: str,
    memory_text_override: str | None = None,
    extra_familiarity: float = 1.0,
    extra_affection: float = 0.0,
    witness_npc_ids: list[int] | None = None,
) -> tuple[NPCAction, bool, Relationship]:
    """대화 1턴(혹은 선물처럼 대화에 준하는 상호작용)을 공통 처리한다.

    /chat 과 /chat/gift 가 이 로직을 공유해서, 5블록 프롬프트 조립 -> LLM 호출 -> 기억 저장 ->
    관계 갱신 흐름이 두 곳에서 어긋나지 않게 한다.
    """
    world = get_or_create_world_state(db)
    config = get_or_create_config(db)
    relationship = relationship_service.get_or_create_relationship(db, "user", user.id, "npc", npc.id)

    recent_logs = list(
        db.execute(
            select(ChatLog)
            .where(ChatLog.user_id == user.id, ChatLog.npc_id == npc.id)
            .order_by(ChatLog.created_at.desc())
            .limit(RECENT_CHAT_WINDOW)
        )
        .scalars()
        .all()
    )
    recent_logs.reverse()

    memories = memory_service.query_memories(
        npc_id=npc.id, query_text=user_message, now=world.game_datetime, top_k=10
    )

    system_prompt, user_prompt = build_chat_prompts(
        npc=npc,
        relationship=relationship,
        world=world,
        active_event_descriptions=_active_event_descriptions(db, npc.id),
        recent_chat_logs=recent_logs,
        memories=memories,
        user_message=user_message,
        user=user,
        reputation_danger_threshold=config.reputation_danger_threshold,
        reputation_warning_threshold=config.reputation_warning_threshold,
    )

    action = await generate_json(system_prompt, user_prompt, NPCAction, use_dialogue_model=True)
    used_fallback = action is None
    if action is None:
        action = _build_fallback_action(user_message)

    now: datetime = world.game_datetime

    db.add(ChatLog(user_id=user.id, npc_id=npc.id, speaker="user", message=user_message, created_at=now))
    db.add(ChatLog(user_id=user.id, npc_id=npc.id, speaker="npc", message=action.dialog, created_at=now))
    db.commit()

    memory_service.add_memory(
        npc_id=npc.id,
        text=memory_text_override or f"유저가 '{user_message}'라고 말했고, 나는 '{action.dialog}'라고 답했다.",
        importance=_memory_importance_heuristic(action),
        memory_type="episodic",
        game_timestamp=now,
    )

    relationship_service.adjust_relationship(
        db,
        relationship,
        familiarity_delta=extra_familiarity,
        affection_delta=action.affection_delta + extra_affection,
        trust_delta=action.trust_delta,
        tension_delta=action.tension_delta,
    )

    if action.felt_disrespected:
        await _handle_verbal_abuse(db, npc, witness_npc_ids or [], now)

    return action, used_fallback, relationship


@router.post("", response_model=ChatResponse)
async def chat_with_npc(payload: ChatRequest, db: Session = Depends(get_db)) -> ChatResponse:
    npc = db.get(NPC, payload.npc_id)
    if npc is None or npc.is_dead:
        raise HTTPException(status_code=404, detail="NPC를 찾을 수 없거나 이미 사망했습니다.")

    user = db.get(User, payload.user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없습니다.")

    action, used_fallback, _ = await run_npc_turn(
        db, user, npc, payload.message, witness_npc_ids=payload.witness_npc_ids
    )
    return ChatResponse(npc_id=npc.id, action=action, used_fallback=used_fallback)


@router.post("/gift", response_model=ChatResponse)
async def gift_item(payload: GiftRequest, db: Session = Depends(get_db)) -> ChatResponse:
    """유저 인벤토리의 아이템을 NPC에게 선물한다. 아이템의 gift_value가 호감도 보너스로 반영되고,
    치료 효과(cures_illness)가 있는 아이템이면 NPC의 병도 함께 낫는다.
    """
    npc = db.get(NPC, payload.npc_id)
    if npc is None or npc.is_dead:
        raise HTTPException(status_code=404, detail="NPC를 찾을 수 없거나 이미 사망했습니다.")

    user = db.get(User, payload.user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없습니다.")

    catalog_entry = ITEM_CATALOG.get(payload.item_name)
    if catalog_entry is None:
        raise HTTPException(status_code=400, detail="존재하지 않는 아이템입니다.")

    removed = inventory_service.remove_item(db, "user", user.id, payload.item_name, 1)
    if not removed:
        raise HTTPException(status_code=400, detail="해당 아이템을 보유하고 있지 않습니다.")

    gift_value = float(catalog_entry.get("gift_value", 0))
    cured = bool(catalog_entry.get("cures_illness")) and bool(npc.illness)
    memory_text = f"유저가 나에게 '{payload.item_name}'을(를) 선물로 주었다."
    if cured:
        memory_text += f" 마침 아프던 참이라({npc.illness}) 이 선물 덕분에 다 나았다."
        npc.illness = ""
        db.add(npc)
        db.commit()
        gift_value += 5.0

    action, used_fallback, _ = await run_npc_turn(
        db,
        user,
        npc,
        user_message=f"(말없이 '{payload.item_name}'을(를) 선물로 건넨다)",
        memory_text_override=memory_text,
        extra_familiarity=2.0,
        extra_affection=gift_value,
    )
    return ChatResponse(npc_id=npc.id, action=action, used_fallback=used_fallback)
