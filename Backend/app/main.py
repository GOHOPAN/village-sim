import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import Base, SessionLocal, engine
from app.routers import chat, combat, config, eavesdrop, encounter, event, facility, npc, rumor, shop, user, world
from app.seed import seed_initial_data

logging.basicConfig(level=logging.INFO)
settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    # models 패키지를 import해야 Base.metadata에 테이블이 등록된다.
    import app.models  # noqa: F401

    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        seed_initial_data(db)
    finally:
        db.close()

    log = logging.getLogger("startup")
    if not settings.gm_enabled:
        log.warning("OPENAI_API_KEY가 설정되지 않았습니다. GM(성찰/루틴/엿듣기) 호출은 폴백으로 대체됩니다.")
    if not settings.dialogue_enabled:
        log.warning("대사용 LLM이 설정되지 않았습니다. NPC 대사(/chat)는 폴백으로 대체됩니다.")
    elif settings.dialogue_base_url:
        log.info("NPC 대사는 로컬 모델(%s @ %s)로 라우팅됩니다.", settings.dialogue_model, settings.dialogue_base_url)

    yield


app = FastAPI(title="LLM Village Simulation API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check() -> dict:
    return {
        "status": "ok",
        "gm_enabled": settings.gm_enabled,
        "dialogue_enabled": settings.dialogue_enabled,
        "dialogue_model": settings.dialogue_model if settings.dialogue_enabled else None,
    }


app.include_router(chat.router)
app.include_router(eavesdrop.router)
app.include_router(world.router)
app.include_router(npc.router)
app.include_router(user.router)
app.include_router(event.router)
app.include_router(rumor.router)
app.include_router(config.router)
app.include_router(shop.router)
app.include_router(facility.router)
app.include_router(encounter.router)
app.include_router(combat.router)
