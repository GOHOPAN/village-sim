from datetime import datetime

from sqlalchemy import JSON, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class WorldEvent(Base):
    """정기/돌발 이벤트 로그. World Event Manager가 이 테이블을 기준으로 상태를 관리한다."""

    __tablename__ = "events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_type: Mapped[str] = mapped_column(String(32))  # wedding | funeral | fire | ...
    status: Mapped[str] = mapped_column(String(16), default="active")  # active | resolved
    affected_npc_ids: Mapped[list] = mapped_column(JSON, default=list)
    data: Mapped[dict] = mapped_column(JSON, default=dict)  # 이벤트별 부가 정보 (예: 화재 위치, 신랑/신부 id)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
