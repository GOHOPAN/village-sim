from sqlalchemy.orm import Session

from app.models.game_config import GameConfig


def get_or_create_config(db: Session) -> GameConfig:
    config = db.get(GameConfig, 1)
    if config is None:
        config = GameConfig(id=1)
        db.add(config)
        db.commit()
        db.refresh(config)
    return config
