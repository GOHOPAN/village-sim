from sqlalchemy import Float, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class GameConfig(Base):
    """런타임에 유저가 직접 조정 가능한 게임 밸런스 값들 (싱글턴, id=1).

    .env는 '초기 배포값'이고, 이 테이블은 '지금 서버를 안 끄고 바로 바꾸고 싶은 수치'를 담당한다.
    GET/PATCH /config 로 언제든 조회/수정 가능하다.
    """

    __tablename__ = "game_config"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)

    minutes_per_real_second: Mapped[int] = mapped_column(Integer, default=3)
    days_per_season: Mapped[int] = mapped_column(Integer, default=5)

    # 시간이 지나면서 자연스럽게 줄어드는 양 (게임 내 1시간당)
    hunger_decay_per_hour: Mapped[float] = mapped_column(Float, default=3.0)
    fatigue_decay_per_hour: Mapped[float] = mapped_column(Float, default=2.5)

    # 랜덤 이벤트 확률 (매일 밤 성찰 사이클마다 굴림). 화재만 순수 랜덤이고,
    # 결혼식/장례식은 각각 NPC간 호감도 임계치 도달 / 시체 발견으로 트리거되는 결정론적 이벤트다.
    event_fire_chance: Mapped[float] = mapped_column(Float, default=0.05)

    # NPC-NPC 호감도가 이 값 이상이면 결혼식이 트리거된다 (친밀도가 아니라 '호감도' 기준).
    wedding_affection_threshold: Mapped[float] = mapped_column(Float, default=85.0)

    # NPC 질병
    npc_illness_chance: Mapped[float] = mapped_column(Float, default=0.03)
    npc_illness_recovery_chance: Mapped[float] = mapped_column(Float, default=0.3)

    # NPC간 우연한 마주침에서 실제 LLM 대사(원샷 대본)가 생성될 확률 (그 외엔 이모지만 표시)
    encounter_dialogue_chance: Mapped[float] = mapped_column(Float, default=0.25)

    # 도박장
    gambling_win_chance: Mapped[float] = mapped_column(Float, default=0.5)

    # 평판에 따른 NPC 경계 단계 임계값 (reputation이 낮을수록 위험).
    # 유저 기본 평판은 50이므로, 아무 짓도 안 했을 때는 반드시 "평화" 단계여야 한다
    # (즉 두 임계값 모두 50보다 낮아야 함). 공격 1회(-15)면 경계, 살해(-30)면 바로 무장 경계로 넘어간다.
    reputation_danger_threshold: Mapped[int] = mapped_column(Integer, default=25)
    reputation_warning_threshold: Mapped[int] = mapped_column(Integer, default=45)

    # 도박장/암시장 입장에 필요한 최소 친밀도
    speakeasy_familiarity_requirement: Mapped[float] = mapped_column(Float, default=50.0)
