from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class NPC(Base):
    """NPC 엔티티: 고정된 자아(이름/직업/성격) + 동적 상태 변수."""

    __tablename__ = "npcs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # 고정된 자아 (Block 1 of prompt) - 절대 변하지 않음
    name: Mapped[str] = mapped_column(String(64), index=True)
    job: Mapped[str] = mapped_column(String(64))  # 촌장/상인/대장장이/의사/경찰/술집주인 ...
    personality: Mapped[str] = mapped_column(Text)  # 자유 서술형 성격 프롬프트 조각
    secret: Mapped[str] = mapped_column(Text, default="")  # 숨겨진 정체/비밀 (예: 사실 오크다)
    core_traits: Mapped[str] = mapped_column(String(256), default="")  # 콤마구분 태그: gossipy,honest,greedy ...

    # 위치 / 이동
    pos_x: Mapped[float] = mapped_column(Float, default=0.0)
    pos_y: Mapped[float] = mapped_column(Float, default=0.0)
    home_x: Mapped[float] = mapped_column(Float, default=0.0)
    home_y: Mapped[float] = mapped_column(Float, default=0.0)
    workplace_x: Mapped[float] = mapped_column(Float, default=0.0)
    workplace_y: Mapped[float] = mapped_column(Float, default=0.0)

    # 현재 상태 (Block 2 of prompt) - MySQL 값이 항상 최우선. 100=쌩쌩함/배부름, 0=탈진/굶주림.
    fatigue: Mapped[int] = mapped_column(Integer, default=100)
    hunger: Mapped[int] = mapped_column(Integer, default=100)
    hp: Mapped[int] = mapped_column(Integer, default=100)  # 숨겨진 체력
    intoxication: Mapped[int] = mapped_column(Integer, default=0)
    mood: Mapped[str] = mapped_column(String(32), default="평온함")
    illness: Mapped[str] = mapped_column(String(64), default="")  # 가벼운 병 상태, 빈 문자열=건강

    gold: Mapped[int] = mapped_column(Integer, default=50)

    is_dead: Mapped[bool] = mapped_column(Boolean, default=False)
    is_asleep: Mapped[bool] = mapped_column(Boolean, default=False)

    # 성찰 요약 (Block 5) - 가장 최신 성찰 결과 캐시 (원본은 ChromaDB에도 저장)
    latest_reflection: Mapped[str] = mapped_column(Text, default="")

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
