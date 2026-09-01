from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ChatLog(Base):
    """유저<->NPC 최근 대화 내역 (Short-term Context). Vector DB를 거치지 않고 마지막 N개를 그대로 프롬프트에 꽂는다."""

    __tablename__ = "chat_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True)
    npc_id: Mapped[int] = mapped_column(Integer, index=True)
    speaker: Mapped[str] = mapped_column(String(16))  # 'user' | 'npc'
    message: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
