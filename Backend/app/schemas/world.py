from datetime import datetime

from pydantic import BaseModel


class WorldStateOut(BaseModel):
    game_datetime: datetime
    season: str
    weather: str
    market_summary: str

    model_config = {"from_attributes": True}


class AdvanceTimeRequest(BaseModel):
    minutes: int = 10


class EventTriggerRequest(BaseModel):
    event_type: str  # wedding | funeral | fire
    affected_npc_ids: list[int] = []
    data: dict = {}
