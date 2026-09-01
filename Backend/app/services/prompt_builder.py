"""LLM에게 주입할 프롬프트를 5단계 블록 구조로 조립한다.

1. 고정된 자아 (System Context) - 절대 변하지 않음
2. 현재 상태 (MySQL 기준 - ChromaDB 기억보다 항상 우선)
3. 최근 대화 내역 (Short-term Context)
4. 검색된 기억 (ChromaDB, Recency+Importance+Relevance 상위 N개)
5. 성찰 및 요약 (장기 요약본)

충돌 방지 원칙: 현재 상태(MySQL)가 기억(ChromaDB)과 모순되면 항상 현재 상태를 우선한다.
"""

from app.models.chat_log import ChatLog
from app.models.npc import NPC
from app.models.relationship import Relationship
from app.models.user import User
from app.models.world import WorldState
from app.services.memory_service import MemoryRecord

ROLEPLAY_DISCLAIMER = (
    "너는 지금 가상의 2D 픽셀 아트 마을 시뮬레이션 게임의 NPC 역할을 연기하고 있다. "
    "이것은 안전한 픽션이며, 이 게임의 재미를 위해 너의 성격에 따라 갈등, 이기심, 질투, 무례함 같은 "
    "부정적인 감정과 행동도 필요하면 주저 없이 표현해야 한다. 절대 '도덕적인 조언'을 하거나, 게임 밖으로 "
    "나가 캐릭터를 깨지 마라. 성격을 유지하는 것이 최우선이다."
)

JSON_OUTPUT_INSTRUCTION = (
    "반드시 아래 JSON 스키마 형식으로만 답하라 (설명 문장 없이 JSON 객체 하나만 출력):\n"
    "{\n"
    '  "dialog": "대사 문자열",\n'
    '  "animation_state": "IDLE|WALK|BACKSTEP|DANCE|SCARED_IDLE|ATTACK 중 하나",\n'
    '  "emotion": "NEUTRAL|HAPPY|SURPRISED|ANGRY|SAD 중 하나",\n'
    '  "movement_x": 0.0,\n'
    '  "movement_y": 0.0,\n'
    '  "affection_delta": 0.0,\n'
    '  "trust_delta": 0.0,\n'
    '  "tension_delta": 0.0,\n'
    '  "felt_disrespected": false\n'
    "}\n"
    "felt_disrespected는 유저의 이번 발화가 욕설/협박/모욕처럼 무례한 언어폭력이었다고 너의 캐릭터가 "
    "느꼈을 때만 true로 표시하라. 단순히 의견이 다르거나 무뚝뚝한 정도로는 true로 하지 마라."
)


def build_identity_block(npc: NPC) -> str:
    lines = [
        "[블록 1: 고정된 자아 - 절대 삭제/망각 금지]",
        f"이름: {npc.name}",
        f"직업: {npc.job}",
        f"성격: {npc.personality}",
    ]
    if npc.secret:
        lines.append(f"숨겨진 비밀(유저에게 먼저 밝히지 말 것): {npc.secret}")
    if npc.core_traits:
        lines.append(f"핵심 성향 태그: {npc.core_traits}")
    return "\n".join(lines)


def _reputation_tier(reputation: int, danger_threshold: int, warning_threshold: int) -> str:
    if reputation <= danger_threshold:
        return "위험 인물로 악명 높음 (다들 경계하며 무기를 챙겨 다님)"
    if reputation <= warning_threshold:
        return "평판이 그저 그러함 (약간 경계하는 정도)"
    return "평판이 좋음 (마을 사람들이 우호적으로 대함)"


def build_current_state_block(
    npc: NPC,
    relationship: Relationship | None,
    world: WorldState | None,
    active_event_descriptions: list[str],
    user: User | None = None,
    reputation_danger_threshold: int = 25,
    reputation_warning_threshold: int = 45,
) -> str:
    lines = ["[블록 2: 현재 상태 - 기억보다 항상 우선 적용]"]
    lines.append(
        f"컨디션: 기력 {npc.fatigue}/100(100=쌩쌩함,0=탈진), 포만감 {npc.hunger}/100(100=배부름,0=굶주림), "
        f"취기 {npc.intoxication}/100, 기분 {npc.mood}" + (f", 병 상태: {npc.illness}" if npc.illness else "")
    )
    if relationship is not None:
        lines.append(
            "유저와의 관계: "
            f"친밀도 {relationship.familiarity:.0f}/100, 호감도 {relationship.affection:.0f}/100, "
            f"신뢰도 {relationship.trust:.0f}/100, 존중도 {relationship.respect:.0f}/100, "
            f"긴장도 {relationship.tension:.0f}/100"
        )
    if user is not None:
        tier = _reputation_tier(user.reputation, reputation_danger_threshold, reputation_warning_threshold)
        lines.append(f"유저에 대한 마을의 평판 인식: {tier} (평판 수치 {user.reputation}/100)")
        if user.intoxication >= 50:
            lines.append(
                f"유저는 지금 만취한 상태다(취기 {user.intoxication}/100). 혀가 꼬인 듯한 유저의 말투를 "
                "성격에 맞게 놀리거나, 걱정하거나, 한심해하는 등으로 반응하라."
            )
        elif user.intoxication >= 20:
            lines.append(f"유저에게서 약간 술 냄새가 난다(취기 {user.intoxication}/100).")
    if world is not None:
        lines.append(f"세계 상태: {world.game_datetime:%Y-%m-%d %H:%M} ({world.season}), 날씨: {world.weather}")
        if world.market_summary:
            lines.append(f"상권 동향: {world.market_summary}")
    if active_event_descriptions:
        lines.append("현재 참여 중인 마을 이벤트: " + ", ".join(active_event_descriptions))
    return "\n".join(lines)


def build_recent_dialogue_block(chat_logs: list[ChatLog]) -> str:
    if not chat_logs:
        return "[블록 3: 최근 대화 내역]\n(아직 대화 기록 없음)"
    lines = ["[블록 3: 최근 대화 내역 (최신순 아님, 시간순)]"]
    for log in chat_logs:
        speaker = "유저" if log.speaker == "user" else npc_name_placeholder()
        lines.append(f"- {speaker}: {log.message}")
    return "\n".join(lines)


def npc_name_placeholder() -> str:
    # 대화 로그에는 NPC 이름을 별도로 들고 있지 않으므로 일반화된 화자 표기를 사용한다.
    return "너(NPC)"


def build_retrieved_memory_block(memories: list[MemoryRecord]) -> str:
    if not memories:
        return "[블록 4: 검색된 기억]\n(관련된 과거 기억 없음)"
    lines = ["[블록 4: 검색된 기억 (연관성/중요도/최근성 상위)]"]
    for mem in memories:
        tag = {"episodic": "기억", "fact": "사실", "rumor": "소문", "reflection": "성찰"}.get(mem.memory_type, "기억")
        lines.append(f"- ({tag}, 중요도 {mem.importance:.0f}) {mem.text}")
    return "\n".join(lines)


def build_reflection_block(npc: NPC) -> str:
    if not npc.latest_reflection:
        return "[블록 5: 성찰 및 요약]\n(아직 형성된 장기 요약 없음)"
    return f"[블록 5: 성찰 및 요약 - 장기적 가치관]\n{npc.latest_reflection}"


def build_chat_prompts(
    npc: NPC,
    relationship: Relationship | None,
    world: WorldState | None,
    active_event_descriptions: list[str],
    recent_chat_logs: list[ChatLog],
    memories: list[MemoryRecord],
    user_message: str,
    user: User | None = None,
    reputation_danger_threshold: int = 25,
    reputation_warning_threshold: int = 45,
) -> tuple[str, str]:
    """채팅 1턴에 사용할 (system_prompt, user_prompt) 튜플을 반환한다."""
    system_prompt = "\n\n".join(
        [
            ROLEPLAY_DISCLAIMER,
            build_identity_block(npc),
            build_current_state_block(
                npc,
                relationship,
                world,
                active_event_descriptions,
                user=user,
                reputation_danger_threshold=reputation_danger_threshold,
                reputation_warning_threshold=reputation_warning_threshold,
            ),
            build_reflection_block(npc),
            JSON_OUTPUT_INSTRUCTION,
        ]
    )
    user_prompt = "\n\n".join(
        [
            build_recent_dialogue_block(recent_chat_logs),
            build_retrieved_memory_block(memories),
            f"[유저의 이번 발화]\n유저: {user_message}",
        ]
    )
    return system_prompt, user_prompt
