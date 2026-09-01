"""LLM 호출 래퍼.

두 개의 "두뇌"를 분리해서 관리한다 (Gemini와의 기획 논의에서 나온 하이브리드 구조):
- GM(게임 마스터) 클라이언트: 성찰 요약, 루틴(JSON 시간표) 생성, 엿듣기 대본처럼 이성적 판단이
  필요한 작업. OpenAI 공식 API(GPT-4o-mini 등)를 사용한다.
- 대사(Dialogue) 클라이언트: NPC가 유저에게 직접 내뱉는 대사(/chat)만 전담한다. 로컬에 띄운
  검열 완화 모델(Llama-3-8B-Instruct-abliterated 등)을 OpenAI 호환 엔드포인트(Ollama 등)로
  연결할 수 있다. DIALOGUE_BASE_URL이 비어 있으면 GM 클라이언트를 그대로 재사용한다(기존 동작과 동일).

API 키/서버가 없거나 호출/파싱이 실패하면 None을 반환한다 (예외를 던지지 않음).
호출부(챗봇 라우터, 성찰/루틴 서비스)가 각자의 도메인에 맞는 폴백 값을 채운다.
"""

import json
import logging
from typing import TypeVar

from openai import AsyncOpenAI
from pydantic import BaseModel, ValidationError

from app.config import get_settings

logger = logging.getLogger("llm_service")
settings = get_settings()

T = TypeVar("T", bound=BaseModel)

_gm_client: AsyncOpenAI | None = None
_dialogue_client: AsyncOpenAI | None = None


def get_gm_client() -> AsyncOpenAI | None:
    global _gm_client
    if not settings.gm_enabled:
        return None
    if _gm_client is None:
        _gm_client = AsyncOpenAI(api_key=settings.openai_api_key)
    return _gm_client


def get_dialogue_client() -> AsyncOpenAI | None:
    global _dialogue_client
    if not settings.dialogue_enabled:
        return None
    if _dialogue_client is None:
        if settings.dialogue_base_url:
            _dialogue_client = AsyncOpenAI(
                api_key=settings.dialogue_api_key or "ollama", base_url=settings.dialogue_base_url
            )
        else:
            # 로컬 모델이 설정되지 않았다면 GM 클라이언트를 그대로 재사용한다 (기존 단일모델 동작과 동일).
            _dialogue_client = get_gm_client()
    return _dialogue_client


def _resolve(use_dialogue_model: bool) -> tuple[AsyncOpenAI | None, str, float]:
    if use_dialogue_model:
        return get_dialogue_client(), settings.dialogue_model, settings.dialogue_temperature
    return get_gm_client(), settings.llm_model, settings.llm_temperature


async def generate_json(
    system_prompt: str, user_prompt: str, schema: type[T], use_dialogue_model: bool = False
) -> T | None:
    """LLM에게 JSON 응답을 요청하고 주어진 Pydantic 스키마로 검증한다. 실패 시 None."""
    client, model, temperature = _resolve(use_dialogue_model)
    if client is None:
        return None

    try:
        response = await client.chat.completions.create(
            model=model,
            temperature=temperature,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        raw = response.choices[0].message.content or "{}"
        data = json.loads(raw)
        return schema.model_validate(data)
    except (json.JSONDecodeError, ValidationError) as exc:
        logger.warning("LLM JSON 파싱/검증 실패, 폴백으로 전환: %s", exc)
        return None
    except Exception as exc:  # noqa: BLE001 - LLM 호출 실패는 전부 폴백으로 흡수
        logger.warning("LLM 호출 실패, 폴백으로 전환: %s", exc)
        return None


async def generate_text(system_prompt: str, user_prompt: str, use_dialogue_model: bool = False) -> str | None:
    """자유 서술형 텍스트(성찰 요약, 소문 왜곡 등)를 요청한다. 실패 시 None."""
    client, model, temperature = _resolve(use_dialogue_model)
    if client is None:
        return None

    try:
        response = await client.chat.completions.create(
            model=model,
            temperature=temperature,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        return (response.choices[0].message.content or "").strip()
    except Exception as exc:  # noqa: BLE001
        logger.warning("LLM 텍스트 생성 실패, 폴백으로 전환: %s", exc)
        return None
