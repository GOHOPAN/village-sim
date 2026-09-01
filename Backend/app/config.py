from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Relational DB (MySQL in production, sqlite for local dev out-of-the-box)
    database_url: str = "sqlite:///./village.db"

    # Vector DB
    chroma_path: str = "./chroma_data"

    # LLM - 게임 마스터(GM) 두뇌: 성찰/루틴 생성/엿듣기 대본처럼 "이성적 판단"이 필요한 작업.
    # OpenAI 공식 API를 사용한다 (기본 gpt-4o-mini).
    openai_api_key: str = ""
    llm_model: str = "gpt-4o-mini"
    llm_temperature: float = 0.9

    # LLM - NPC 대사(연기) 전용 두뇌: /chat 응답(NPCAction)에만 사용된다.
    # dialogue_base_url을 비워두면 GM과 동일한 OpenAI 클라이언트/모델을 그대로 사용한다 (기존과 동일 동작).
    # 로컬 Ollama로 Llama-3-8B-Instruct-abliterated 등을 띄웠다면, 예를 들어
    #   DIALOGUE_BASE_URL=http://localhost:11434/v1
    #   DIALOGUE_MODEL=llama3-8b-instruct-abliterated  (ollama pull/create 로 만든 태그명)
    # 로 설정하면 대사 생성만 그 로컬 모델로 라우팅된다.
    dialogue_base_url: str = ""
    dialogue_model: str = "gpt-4o-mini"
    dialogue_api_key: str = "ollama"  # 로컬 서버는 보통 키를 검사하지 않지만 OpenAI SDK는 빈 문자열을 허용하지 않음
    dialogue_temperature: float = 1.0

    # Game / world clock
    game_minutes_per_real_second: int = 1
    passout_hour: int = 2
    wake_hour: int = 8

    # CORS
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def gm_enabled(self) -> bool:
        return bool(self.openai_api_key)

    @property
    def dialogue_enabled(self) -> bool:
        return bool(self.dialogue_base_url) or self.gm_enabled

    @property
    def llm_enabled(self) -> bool:
        """하위 호환용: 기존 코드/문서에서 참조하던 이름. GM 활성화 여부와 동일하다."""
        return self.gm_enabled


@lru_cache
def get_settings() -> Settings:
    return Settings()
