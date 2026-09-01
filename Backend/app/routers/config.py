from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.config import GameConfigOut, GameConfigUpdate
from app.services.game_config_service import get_or_create_config

router = APIRouter(prefix="/config", tags=["config"])


@router.get("", response_model=GameConfigOut)
def get_config(db: Session = Depends(get_db)) -> GameConfigOut:
    return GameConfigOut.model_validate(get_or_create_config(db))


@router.patch("", response_model=GameConfigOut)
def update_config(payload: GameConfigUpdate, db: Session = Depends(get_db)) -> GameConfigOut:
    config = get_or_create_config(db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(config, field, value)
    db.add(config)
    db.commit()
    db.refresh(config)
    return GameConfigOut.model_validate(config)
