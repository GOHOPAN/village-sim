from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class User(Base):
    """유저 엔티티 상태 변수 (피로도/허기/체력/평판/위생/취기/은신도/자산)."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)

    # 위치
    pos_x: Mapped[float] = mapped_column(Float, default=0.0)
    pos_y: Mapped[float] = mapped_column(Float, default=0.0)

    # 생존/상태 스탯 - 피로도/허기는 100(쌩쌩/배부름)에서 시작해 0(탈진/굶주림)까지 줄어드는 방식.
    fatigue: Mapped[int] = mapped_column(Integer, default=100)
    hunger: Mapped[int] = mapped_column(Integer, default=100)
    hp: Mapped[int] = mapped_column(Integer, default=100)  # 숨겨진 체력(피로도와 별개)
    reputation: Mapped[int] = mapped_column(Integer, default=50)  # 0~100, 평판/카르마
    hygiene: Mapped[int] = mapped_column(Integer, default=100)
    intoxication: Mapped[int] = mapped_column(Integer, default=0)
    stealth: Mapped[int] = mapped_column(Integer, default=0)  # 은신도(현재 은신 성공 여부와 별개인 스탯 보정치)

    # 자산
    gold: Mapped[int] = mapped_column(Integer, default=100)

    # 장비 (소지품 중 "장착"된 것 - 장착 여부에 따라 채집/전투 가능 여부와 위력이 달라진다)
    equipped_tool: Mapped[str] = mapped_column(String(32), default="")  # 예: "곡괭이", "도끼"
    equipped_weapon: Mapped[str] = mapped_column(String(32), default="")  # 예: "낡은 검" (빈 문자열 = 맨손)

    is_asleep: Mapped[bool] = mapped_column(Boolean, default=False)
    is_hidden: Mapped[bool] = mapped_column(Boolean, default=False)  # 현재 수풀 등에 은신 중인지

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
