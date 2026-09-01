from pydantic import BaseModel


class RumorSpreadRequest(BaseModel):
    """유저가 NPC에게 소문(사실이든 거짓말이든)을 전달하는 상호작용."""

    from_user_id: int
    to_npc_id: int
    rumor_text: str
    subject_npc_id: int | None = None  # 소문의 대상이 되는 NPC (모함 로직에 사용)


class RumorKnownOut(BaseModel):
    rumor_id: str
    fact_text: str
    distorted_text: str
    is_distorted: bool
