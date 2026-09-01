"""ChromaDB 기반 NPC 기억 관리 서비스.

- add_memory: 에피소드/성찰/사실(Fact)/소문(Rumor) 텍스트를 임베딩하여 저장.
- query_memories: 현재 상황과 유사한 기억을 Recency + Importance + Relevance 종합 점수로
  상위 N개(기본 10개) 선별하여 반환한다.
"""

import uuid
from dataclasses import dataclass
from datetime import datetime

import chromadb

from app.config import get_settings
from app.utils.scoring import combined_score

settings = get_settings()

_client: chromadb.ClientAPI | None = None
_collection = None

MEMORY_COLLECTION_NAME = "npc_memories"


def get_chroma_client() -> chromadb.ClientAPI:
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=settings.chroma_path)
    return _client


def get_memory_collection():
    global _collection
    if _collection is None:
        client = get_chroma_client()
        _collection = client.get_or_create_collection(name=MEMORY_COLLECTION_NAME)
    return _collection


@dataclass
class MemoryRecord:
    text: str
    memory_type: str
    importance: float
    game_timestamp: datetime
    score: float = 0.0


def add_memory(
    npc_id: int,
    text: str,
    importance: float,
    memory_type: str,
    game_timestamp: datetime,
) -> str:
    """기억 1건을 저장하고 memory id를 반환한다.

    memory_type: 'episodic' | 'reflection' | 'fact' | 'rumor'
    importance: 1~10 점 (LLM 혹은 휴리스틱이 매김)
    """
    collection = get_memory_collection()
    memory_id = str(uuid.uuid4())
    collection.add(
        ids=[memory_id],
        documents=[text],
        metadatas=[
            {
                "npc_id": npc_id,
                "memory_type": memory_type,
                "importance": float(importance),
                "game_timestamp": game_timestamp.isoformat(),
            }
        ],
    )
    return memory_id


def query_memories(
    npc_id: int,
    query_text: str,
    now: datetime,
    top_k: int = 10,
    memory_types: list[str] | None = None,
) -> list[MemoryRecord]:
    """상황(query_text)과 유사한 기억 상위 top_k개를 종합 점수 순으로 반환한다."""
    collection = get_memory_collection()

    where_filter: dict = {"npc_id": npc_id}
    if memory_types:
        where_filter = {"$and": [{"npc_id": npc_id}, {"memory_type": {"$in": memory_types}}]}

    # 스코어링을 위해 top_k보다 넉넉하게 후보군을 가져온다.
    fetch_k = max(top_k * 3, 20)

    count = collection.count()
    if count == 0:
        return []

    results = collection.query(
        query_texts=[query_text],
        n_results=min(fetch_k, count),
        where=where_filter,
    )

    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]

    candidates: list[MemoryRecord] = []
    for doc, meta, dist in zip(documents, metadatas, distances):
        ts = datetime.fromisoformat(meta["game_timestamp"])
        score = combined_score(
            memory_timestamp=ts,
            now=now,
            raw_importance_1_to_10=meta.get("importance", 5.0),
            distance=dist,
        )
        candidates.append(
            MemoryRecord(
                text=doc,
                memory_type=meta.get("memory_type", "episodic"),
                importance=meta.get("importance", 5.0),
                game_timestamp=ts,
                score=score,
            )
        )

    candidates.sort(key=lambda m: m.score, reverse=True)
    return candidates[:top_k]


def get_todays_memories(npc_id: int, since: datetime) -> list[MemoryRecord]:
    """성찰(Reflection) 생성을 위해 특정 시각 이후의 모든 에피소드 기억을 가져온다."""
    collection = get_memory_collection()
    if collection.count() == 0:
        return []

    results = collection.get(
        where={"$and": [{"npc_id": npc_id}, {"memory_type": {"$in": ["episodic", "fact", "rumor"]}}]},
    )
    records: list[MemoryRecord] = []
    for doc, meta in zip(results.get("documents", []), results.get("metadatas", [])):
        ts = datetime.fromisoformat(meta["game_timestamp"])
        if ts >= since:
            records.append(
                MemoryRecord(
                    text=doc,
                    memory_type=meta.get("memory_type", "episodic"),
                    importance=meta.get("importance", 5.0),
                    game_timestamp=ts,
                )
            )
    records.sort(key=lambda m: m.game_timestamp)
    return records
