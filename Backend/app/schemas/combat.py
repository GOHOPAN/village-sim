from pydantic import BaseModel


class AttackRequest(BaseModel):
    user_id: int
    # 공격 순간 유저를 목격할 수 있었던(StealthSystem의 시야각+LOS 판정을 통과한) NPC id 목록.
    # 프론트엔드가 판정해서 넘겨준다 - 목격자가 없으면 소문이 자동으로 퍼지지 않아 "완벽한 범죄"가 성립한다.
    witness_npc_ids: list[int] = []


class AttackResult(BaseModel):
    success: bool
    npc_id: int
    npc_is_dead: bool
    message: str
    reputation: int
    witnessed: bool
