from pydantic import BaseModel


class NPCOut(BaseModel):
    id: int
    name: str
    job: str
    personality: str
    secret: str
    core_traits: str
    pos_x: float
    pos_y: float
    mood: str
    illness: str  # 빈 문자열 = 건강함. HP와 달리 질병은 유저에게 보여도 되는 정보다.
    is_dead: bool
    is_asleep: bool

    model_config = {"from_attributes": True}


class NPCStateUpdate(BaseModel):
    pos_x: float | None = None
    pos_y: float | None = None
    fatigue: int | None = None
    hunger: int | None = None
    hp: int | None = None
    mood: str | None = None
    is_asleep: bool | None = None
    is_dead: bool | None = None

    # 고정된 자아(블록 1) 편집용. prompt_builder.build_identity_block이 그대로 참조하므로,
    # 여기를 바꾸면 다음 /chat 호출부터 즉시 반영된다.
    job: str | None = None
    personality: str | None = None
    secret: str | None = None
    core_traits: str | None = None  # 콤마 구분 태그: 예) "gossipy,greedy" (소문 왜곡 확률에 영향)


class RelationshipOut(BaseModel):
    familiarity: float
    affection: float
    trust: float
    respect: float
    tension: float

    model_config = {"from_attributes": True}
