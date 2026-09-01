from pydantic import BaseModel


class UserOut(BaseModel):
    id: int
    username: str
    pos_x: float
    pos_y: float
    fatigue: int
    hunger: int
    hp: int
    reputation: int
    hygiene: int
    intoxication: int
    stealth: int
    gold: int
    equipped_tool: str
    equipped_weapon: str
    is_asleep: bool
    is_hidden: bool

    model_config = {"from_attributes": True}


class UserStateUpdate(BaseModel):
    pos_x: float | None = None
    pos_y: float | None = None
    fatigue: int | None = None
    hunger: int | None = None
    hp: int | None = None
    hygiene: int | None = None
    intoxication: int | None = None
    is_hidden: bool | None = None


class UserTickRequest(BaseModel):
    game_minutes: float
