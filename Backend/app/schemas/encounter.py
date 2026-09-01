from pydantic import BaseModel

from app.schemas.chat import EavesdropLine


class EncounterRequest(BaseModel):
    npc_a_id: int
    npc_b_id: int


class AmbientEncounterResult(BaseModel):
    familiarity_delta: float


class DialogueEncounterResult(BaseModel):
    lines: list[EavesdropLine]
    used_fallback: bool = False


class EncounterResolveResult(BaseModel):
    """두 NPC가 마주쳤을 때, 실제로 멈춰서 대화할지 그냥 지나칠지를 관계성 기반으로 판정한 결과.

    stopped가 false면 아무 효과도 없다 (진짜 "그냥 스쳐 지나감" - 친밀도 등 변화 없음).
    stopped가 true면 두 NPC 모두 pause_ms(실시간 ms) 동안 멈춰서 실제로 대화하는 것처럼 보여야 하고,
    그 결과로 관계 수치가 변한다.
    """

    stopped: bool
    pause_ms: int = 0
    lines: list[EavesdropLine] = []
    used_fallback: bool = False
    familiarity_delta: float = 0.0
