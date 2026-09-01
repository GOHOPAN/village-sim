from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.npc import NPC
from app.schemas.npc import NPCOut, NPCStateUpdate, RelationshipOut
from app.services.relationship_service import get_or_create_relationship
from app.services.routine_service import get_todays_routine

router = APIRouter(prefix="/npc", tags=["npc"])


@router.get("", response_model=list[NPCOut])
def list_npcs(db: Session = Depends(get_db)) -> list[NPCOut]:
    npcs = db.execute(select(NPC)).scalars().all()
    return [NPCOut.model_validate(n) for n in npcs]


@router.get("/{npc_id}", response_model=NPCOut)
def get_npc(npc_id: int, db: Session = Depends(get_db)) -> NPCOut:
    npc = db.get(NPC, npc_id)
    if npc is None:
        raise HTTPException(status_code=404, detail="NPC를 찾을 수 없습니다.")
    return NPCOut.model_validate(npc)


@router.get("/{npc_id}/routine")
def get_npc_routine(npc_id: int, db: Session = Depends(get_db)) -> dict:
    routine = get_todays_routine(db, npc_id, date.today())
    if routine is None:
        return {"npc_id": npc_id, "entries": [], "is_fallback": True, "is_event_override": False}
    return {
        "npc_id": npc_id,
        "entries": routine.entries,
        "is_fallback": routine.is_fallback,
        "is_event_override": routine.is_event_override,
    }


@router.patch("/{npc_id}/state", response_model=NPCOut)
def update_npc_state(npc_id: int, payload: NPCStateUpdate, db: Session = Depends(get_db)) -> NPCOut:
    npc = db.get(NPC, npc_id)
    if npc is None:
        raise HTTPException(status_code=404, detail="NPC를 찾을 수 없습니다.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(npc, field, value)
    db.add(npc)
    db.commit()
    db.refresh(npc)
    return NPCOut.model_validate(npc)


@router.get("/{npc_id}/relationship", response_model=RelationshipOut)
def get_npc_relationship(npc_id: int, with_user_id: int = 1, db: Session = Depends(get_db)) -> RelationshipOut:
    npc = db.get(NPC, npc_id)
    if npc is None:
        raise HTTPException(status_code=404, detail="NPC를 찾을 수 없습니다.")
    relationship = get_or_create_relationship(db, "user", with_user_id, "npc", npc_id)
    return RelationshipOut.model_validate(relationship)
