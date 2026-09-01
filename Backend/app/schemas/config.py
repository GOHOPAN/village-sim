from pydantic import BaseModel


class GameConfigOut(BaseModel):
    minutes_per_real_second: int
    days_per_season: int
    hunger_decay_per_hour: float
    fatigue_decay_per_hour: float
    event_fire_chance: float
    wedding_affection_threshold: float
    npc_illness_chance: float
    npc_illness_recovery_chance: float
    encounter_dialogue_chance: float
    gambling_win_chance: float
    reputation_danger_threshold: int
    reputation_warning_threshold: int
    speakeasy_familiarity_requirement: float

    model_config = {"from_attributes": True}


class GameConfigUpdate(BaseModel):
    minutes_per_real_second: int | None = None
    days_per_season: int | None = None
    hunger_decay_per_hour: float | None = None
    fatigue_decay_per_hour: float | None = None
    event_fire_chance: float | None = None
    wedding_affection_threshold: float | None = None
    npc_illness_chance: float | None = None
    npc_illness_recovery_chance: float | None = None
    encounter_dialogue_chance: float | None = None
    gambling_win_chance: float | None = None
    reputation_danger_threshold: int | None = None
    reputation_warning_threshold: int | None = None
    speakeasy_familiarity_requirement: float | None = None
