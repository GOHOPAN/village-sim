import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Rumor(Base):
    """소문의 원본(Fact)과 메타데이터. 실제 왜곡된 개인별 버전은 RumorKnowledge에 저장.

    reputation_penalty > 0 인 소문은 "유저의 범죄/무례한 행동"을 담고 있다는 뜻이다. 평판은 이
    소문을 저지르는 즉시 깎이는 게 아니라, 목격자가 있어서 알려지거나(공격 시) 나중에 당사자가
    다른 NPC에게 이 소문을 옮겼을 때(=RumorKnowledge가 새로 생길 때) 비로소 깎인다.
    목격자도 없고 아무에게도 전해지지 않으면 평판에 영향이 전혀 없다 ("완벽한 범죄").
    """

    __tablename__ = "rumors"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    fact_text: Mapped[str] = mapped_column(Text)  # 절대 변하지 않는 원본 사실
    origin_event_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("events.id"), nullable=True)
    subject_npc_id: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 소문의 주인공(있다면)
    reputation_penalty: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class RumorKnowledge(Base):
    """NPC별로 '이미 아는 소문' 태그 + 개인화된(왜곡된) 버전 텍스트. 중복 전파 방지의 핵심."""

    __tablename__ = "rumor_knowledge"
    __table_args__ = (UniqueConstraint("npc_id", "rumor_id", name="uq_npc_rumor"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    npc_id: Mapped[int] = mapped_column(Integer, index=True)
    rumor_id: Mapped[str] = mapped_column(String(36), ForeignKey("rumors.id"), index=True)
    distorted_text: Mapped[str] = mapped_column(Text)  # 이 NPC 성격 기준으로 왜곡된 버전
    is_distorted: Mapped[bool] = mapped_column(Boolean, default=False)  # 왜곡 발생 여부 (확률 로직 결과)
    # False = 피해자 본인의 사적인 기억일 뿐 아직 아무에게도 안 알려짐 (평판 영향 없음).
    # True = 목격자로서 알게 됐거나, 누군가로부터 실제로 전해 들은 것 (평판에 영향을 줄 수 있음).
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)
    known_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
