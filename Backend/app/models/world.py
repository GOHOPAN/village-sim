from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class WorldState(Base):
    """세계 상태 싱글턴 로우 (항상 id=1 하나만 존재)."""

    __tablename__ = "world_state"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)

    game_datetime: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime(2025, 3, 1, 8, 0, 0))
    season: Mapped[str] = mapped_column(String(16), default="봄")
    weather: Mapped[str] = mapped_column(String(16), default="맑음")

    # 상권: 상점별 유저 누적 소비액에 따른 가격 배율은 Shop 테이블에서 관리하지만,
    # 전역 참고용 요약 텍스트를 캐시해 둔다.
    market_summary: Mapped[str] = mapped_column(String(256), default="물가 안정적")


class Shop(Base):
    """상권 경쟁 시스템: 유저의 누적 소비액에 따라 가격 배율이 변동."""

    __tablename__ = "shops"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(64))
    owner_npc_id: Mapped[int] = mapped_column(Integer)
    category: Mapped[str] = mapped_column(String(32))  # 식당/상점/대장간/술집 ...
    base_price_multiplier: Mapped[float] = mapped_column(Float, default=1.0)
    user_cumulative_spend: Mapped[int] = mapped_column(Integer, default=0)
    current_price_multiplier: Mapped[float] = mapped_column(Float, default=1.0)
