from pydantic import BaseModel


class FacilityAccessOut(BaseModel):
    allowed: bool
    reason: str
    required_familiarity: float
    current_familiarity: float
    is_night: bool


class FacilityRevealOut(BaseModel):
    revealed: bool
    hidden_key: str | None = None


class GambleRequest(BaseModel):
    user_id: int
    bet: int = 10


class GambleResult(BaseModel):
    success: bool
    won: bool | None = None
    message: str
    gold: int
