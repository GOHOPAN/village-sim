from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    user_id: int
    npc_id: int
    message: str = Field(..., min_length=1, max_length=500)
    # 이 순간 유저를 볼 수 있었던(목격 가능한) 다른 NPC id 목록 - 언어폭력 등이 감지됐을 때
    # 목격자 기반 평판 하락 판정에 쓰인다 (전투의 witness_npc_ids와 동일한 개념).
    witness_npc_ids: list[int] = []


class NPCAction(BaseModel):
    """LLM이 반드시 이 형태의 JSON으로 답하도록 강제하는 정형 출력 스키마.

    animation_state는 프론트엔드 AnimationController가 그대로 소비한다 (예: IDLE, BACKSTEP, DANCE, SCARED_IDLE).
    """

    dialog: str = Field(..., description="NPC가 출력할 대사")
    animation_state: str = Field(default="IDLE", description="재생할 애니메이션 상태 코드")
    emotion: str = Field(default="NEUTRAL", description="이모지 말풍선용 감정 코드 (SURPRISED, ANGRY, HAPPY, SAD, NEUTRAL ...)")
    movement_x: float = Field(default=0.0, description="이동할 X좌표 변화량 (뒷걸음질 등)")
    movement_y: float = Field(default=0.0, description="이동할 Y좌표 변화량")
    affection_delta: float = Field(default=0.0, ge=-20.0, le=20.0, description="이번 대화로 인한 호감도 변화량")
    trust_delta: float = Field(default=0.0, ge=-20.0, le=20.0, description="이번 대화로 인한 신뢰도 변화량")
    tension_delta: float = Field(default=0.0, ge=-20.0, le=20.0, description="이번 대화로 인한 긴장도 변화량")
    felt_disrespected: bool = Field(
        default=False, description="유저의 이번 발화가 욕설/협박/모욕 등 무례한 언어폭력이었다고 판단되면 true"
    )


class ChatResponse(BaseModel):
    npc_id: int
    action: NPCAction
    used_fallback: bool = False


class GiftRequest(BaseModel):
    user_id: int
    npc_id: int
    item_name: str


class EavesdropLine(BaseModel):
    speaker: str
    text: str


class EavesdropRequest(BaseModel):
    npc_a_id: int
    npc_b_id: int
    topic_hint: str | None = None


class EavesdropResponse(BaseModel):
    lines: list[EavesdropLine]
    used_fallback: bool = False
