"""기억 검색 점수 계산: (최근성 x 가중치) + (중요도 x 가중치) + (연관성 x 가중치).

Recency: 지수 감쇠(exponential decay) — 최근 사건일수록 1에 가까움.
Importance: 기억 생성 시 LLM(혹은 휴리스틱)이 매긴 1~10점을 0~1로 정규화.
Relevance: ChromaDB가 반환하는 distance(코사인 거리)를 1 - distance 로 변환한 유사도.
"""

import math
from datetime import datetime

# 가중치: 논문(Generative Agents)과 동일하게 기본은 균등 가중치를 사용하되,
# 상황(대화 vs 성찰)에 따라 호출부에서 override 가능하도록 인자로 노출한다.
DEFAULT_RECENCY_WEIGHT = 1.0
DEFAULT_IMPORTANCE_WEIGHT = 1.0
DEFAULT_RELEVANCE_WEIGHT = 1.0

# 감쇠 상수: 게임 시간 1시간마다 최근성 점수가 약 5% 감소
RECENCY_DECAY_PER_HOUR = 0.05


def recency_score(memory_timestamp: datetime, now: datetime) -> float:
    hours_elapsed = max((now - memory_timestamp).total_seconds() / 3600.0, 0.0)
    return math.pow(1.0 - RECENCY_DECAY_PER_HOUR, hours_elapsed)


def importance_score(raw_importance_1_to_10: float) -> float:
    return max(0.0, min(raw_importance_1_to_10, 10.0)) / 10.0


def relevance_score(distance: float) -> float:
    """ChromaDB 코사인 거리(0=완전 동일 ~ 2=완전 반대)를 0~1 유사도로 변환."""
    similarity = 1.0 - (distance / 2.0)
    return max(0.0, min(similarity, 1.0))


def combined_score(
    memory_timestamp: datetime,
    now: datetime,
    raw_importance_1_to_10: float,
    distance: float,
    recency_weight: float = DEFAULT_RECENCY_WEIGHT,
    importance_weight: float = DEFAULT_IMPORTANCE_WEIGHT,
    relevance_weight: float = DEFAULT_RELEVANCE_WEIGHT,
) -> float:
    return (
        recency_score(memory_timestamp, now) * recency_weight
        + importance_score(raw_importance_1_to_10) * importance_weight
        + relevance_score(distance) * relevance_weight
    )
