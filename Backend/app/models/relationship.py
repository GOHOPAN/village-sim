from sqlalchemy import Boolean, Float, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Relationship(Base):
    """유저-NPC 또는 NPC-NPC 간 관계 매트릭스.

    source/target_type: 'user' | 'npc'
    - 친밀도(familiarity): 친구로서 좋아하는 정도 (우정)
    - 호감도(affection): 이성으로서 좋아하는 정도 (연애 감정). NPC-NPC 쌍에서 이 값이
      GameConfig.wedding_affection_threshold를 넘으면 결혼식이 자동으로 트리거된다.
    신뢰도(trust), 존중도(respect), 긴장도(tension)는 각각 독립적인 축으로 관리한다
    (예: 호감도는 높지만 신뢰도는 낮은 관계가 가능해야 함).
    """

    __tablename__ = "relationships"
    __table_args__ = (
        UniqueConstraint("source_type", "source_id", "target_type", "target_id", name="uq_relationship_pair"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    source_type: Mapped[str] = mapped_column(String(8), index=True)
    source_id: Mapped[int] = mapped_column(Integer, index=True)
    target_type: Mapped[str] = mapped_column(String(8), index=True)
    target_id: Mapped[int] = mapped_column(Integer, index=True)

    familiarity: Mapped[float] = mapped_column(Float, default=0.0)  # 친밀도 0~100
    affection: Mapped[float] = mapped_column(Float, default=50.0)  # 호감도 0~100
    trust: Mapped[float] = mapped_column(Float, default=50.0)  # 신뢰도 0~100
    respect: Mapped[float] = mapped_column(Float, default=50.0)  # 존중도/위계 0~100
    tension: Mapped[float] = mapped_column(Float, default=0.0)  # 긴장도/원한 0~100 (일시적, 서서히 감소)
    married: Mapped[bool] = mapped_column(Boolean, default=False)  # NPC-NPC 쌍이 이미 결혼식을 올렸는지
