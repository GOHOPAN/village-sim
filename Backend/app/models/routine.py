from datetime import date, datetime

from sqlalchemy import JSON, Boolean, Date, DateTime, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Routine(Base):
    """NPC의 하루 일일 시간표. 루틴은 하드코딩하지 않고 매일 밤 LLM이 새로 짠 JSON으로 덮어쓴다."""

    __tablename__ = "routines"
    __table_args__ = (UniqueConstraint("npc_id", "routine_date", name="uq_npc_date"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    npc_id: Mapped[int] = mapped_column(Integer, index=True)
    routine_date: Mapped[date] = mapped_column(Date, default=date.today)

    # entries: [{"time": "08:00", "action": "이동", "x": 120, "y": 80, "state": "IDLE"}, ...]
    entries: Mapped[list] = mapped_column(JSON, default=list)

    is_fallback: Mapped[bool] = mapped_column(Boolean, default=False)  # 폴백 루틴으로 생성됐는지 여부
    is_event_override: Mapped[bool] = mapped_column(Boolean, default=False)  # 이벤트 전용 시간표로 덮어써졌는지

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
