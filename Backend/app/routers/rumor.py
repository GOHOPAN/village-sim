from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.npc import NPC
from app.models.rumor import Rumor, RumorKnowledge
from app.schemas.rumor import RumorKnownOut, RumorSpreadRequest
from app.services import memory_service, rumor_service
from app.services.world_event_manager import get_or_create_world_state

router = APIRouter(prefix="/rumor", tags=["rumor"])


@router.post("/spread", response_model=RumorKnownOut)
def spread_rumor_from_user(payload: RumorSpreadRequest, db: Session = Depends(get_db)) -> RumorKnownOut:
    """유저가 NPC에게 직접 말(사실이든 거짓 모함이든)을 전달하는 엔드포인트.

    유저의 입에서 나온 직접 발화이므로 확률적 왜곡 없이 그대로 NPC의 '앎'으로 등록된다
    (완벽한 범죄 후 유저가 거짓 소문으로 다른 NPC를 모함하는 플레이가 여기서 가능해진다).
    """
    npc = db.get(NPC, payload.to_npc_id)
    if npc is None:
        raise HTTPException(status_code=404, detail="NPC를 찾을 수 없습니다.")

    world = get_or_create_world_state(db)
    rumor = rumor_service.create_rumor(
        db, fact_text=payload.rumor_text, subject_npc_id=payload.subject_npc_id
    )

    knowledge = RumorKnowledge(
        npc_id=npc.id, rumor_id=rumor.id, distorted_text=payload.rumor_text, is_distorted=False
    )
    db.add(knowledge)
    db.commit()
    db.refresh(knowledge)

    memory_service.add_memory(
        npc_id=npc.id,
        text=f"[유저가 전한 이야기] {payload.rumor_text}",
        importance=6.0,
        memory_type="rumor",
        game_timestamp=world.game_datetime,
    )

    return RumorKnownOut(
        rumor_id=rumor.id, fact_text=rumor.fact_text, distorted_text=knowledge.distorted_text, is_distorted=False
    )


@router.post("/{rumor_id}/propagate/{npc_id}", response_model=RumorKnownOut | None)
async def propagate_rumor_to_npc(rumor_id: str, npc_id: int, db: Session = Depends(get_db)):
    """NPC-to-NPC 전파 시뮬레이션 (테스트/디버그용). 실제로는 두 NPC가 우연히 마주쳤을 때 호출된다."""
    rumor = db.get(Rumor, rumor_id)
    npc = db.get(NPC, npc_id)
    if rumor is None or npc is None:
        raise HTTPException(status_code=404, detail="소문 또는 NPC를 찾을 수 없습니다.")

    world = get_or_create_world_state(db)
    knowledge = await rumor_service.propagate_rumor(db, rumor, npc, world.game_datetime)
    if knowledge is None:
        return None
    return RumorKnownOut(
        rumor_id=rumor.id,
        fact_text=rumor.fact_text,
        distorted_text=knowledge.distorted_text,
        is_distorted=knowledge.is_distorted,
    )


@router.get("/npc/{npc_id}/known", response_model=list[RumorKnownOut])
def get_known_rumors(npc_id: int, db: Session = Depends(get_db)) -> list[RumorKnownOut]:
    knowledge_list = rumor_service.get_known_rumors(db, npc_id)
    output = []
    for k in knowledge_list:
        rumor = db.get(Rumor, k.rumor_id)
        if rumor is None:
            continue
        output.append(
            RumorKnownOut(
                rumor_id=rumor.id, fact_text=rumor.fact_text, distorted_text=k.distorted_text, is_distorted=k.is_distorted
            )
        )
    return output
