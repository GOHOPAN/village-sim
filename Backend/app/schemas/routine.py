from pydantic import BaseModel, Field


class RoutineEntry(BaseModel):
    time: str = Field(..., description="HH:MM 24시간제")
    action: str
    x: float
    y: float
    state: str = "IDLE"


class RoutineSchedule(BaseModel):
    npc_id: int
    entries: list[RoutineEntry]
