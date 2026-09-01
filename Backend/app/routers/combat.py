import random

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.item_catalog import get_weapon_damage_range
from app.models.npc import NPC
from app.models.user import User
from app.schemas.combat import AttackRequest, AttackResult
from app.services import memory_service, relationship_service, rumor_service
from app.services.world_event_manager import get_or_create_world_state, trigger_funeral_from_death

router = APIRouter(prefix="/npc", tags=["combat"])

REPUTATION_PENALTY_SURVIVED = 15.0
REPUTATION_PENALTY_KILLED = 30.0
POLICE_RETALIATION_DAMAGE_MIN, POLICE_RETALIATION_DAMAGE_MAX = 15, 25


@router.post("/{npc_id}/attack", response_model=AttackResult)
async def attack_npc(npc_id: int, payload: AttackRequest, db: Session = Depends(get_db)) -> AttackResult:
    """유저가 NPC를 공격한다. NPC 사망은 오직 이 액션을 통해서만 일어난다 (NPC끼리는 서로 죽이지 않음).

    피해량은 장착한 무기에 따라 결정된다 (맨손은 1~3, 무기 장착 시 훨씬 강해짐 - 암시장에서만 구할 수 있음).

    평판은 공격하는 즉시 깎이는 것이 아니라, "누군가 이 사실을 실제로 알게 됐을 때"만 깎인다:
    - 목격자가 있으면 그 자리에서 바로 평판이 깎인다 (다른 사람이 보는 경우).
    - 목격자가 없고 피해자가 살아남으면, 피해자 본인은 항상 사건을 기억하지만 아직 아무에게도
      알려지지 않았으므로 평판은 그대로다. 나중에 피해자가 다른 NPC와 우연히 마주쳐 이 얘기를
      실제로 옮기면(rumor_service.propagate_rumor) 그 시점에 비로소 평판이 깎인다 (당사자에 의해 소문났을 때).
    - 목격자도 없고 죽여서 아는 사람이 아무도 없으면 평판에 영향이 전혀 없다 (완벽한 범죄).

    목격자가 있으면 소문이 자동으로 퍼지고, 경찰이 목격했다면 그 자리에서 반격(체포 시도)당한다.
    NPC가 사망했고 목격자가 있으면(=발견되었으면) 시체는 묘지로 옮겨지고 장례식이 열린다.
    """
    npc = db.get(NPC, npc_id)
    if npc is None or npc.is_dead:
        raise HTTPException(status_code=404, detail="NPC를 찾을 수 없거나 이미 사망했습니다.")

    user = db.get(User, payload.user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없습니다.")

    world = get_or_create_world_state(db)
    now = world.game_datetime

    dmg_min, dmg_max = get_weapon_damage_range(user.equipped_weapon)
    damage = random.randint(dmg_min, dmg_max)
    npc.hp = max(npc.hp - damage, 0)
    killed = npc.hp <= 0

    if killed:
        npc.is_dead = True
        fact_text = f"유저가 {npc.name}을(를) 공격해 죽였다."
        reputation_penalty = REPUTATION_PENALTY_KILLED
    else:
        fact_text = f"유저가 {npc.name}을(를) 공격했다."
        reputation_penalty = REPUTATION_PENALTY_SURVIVED
        # 생존한 피해자는 자신에게 벌어진 일을 항상 직접 기억한다 (목격자 유무와 무관).
        relationship = relationship_service.get_or_create_relationship(db, "user", user.id, "npc", npc.id)
        relationship_service.adjust_relationship(
            db, relationship, affection_delta=-30.0, trust_delta=-30.0, tension_delta=50.0
        )
        memory_service.add_memory(
            npc_id=npc.id,
            text="유저에게 공격당했다. 몸이 아프고 유저가 두렵다.",
            importance=10.0,
            memory_type="episodic",
            game_timestamp=now,
        )

    db.add(npc)
    db.commit()

    rumor = rumor_service.create_rumor(
        db, fact_text=fact_text, subject_npc_id=npc.id, reputation_penalty=reputation_penalty
    )

    witnesses = [
        w for wid in payload.witness_npc_ids if (w := db.get(NPC, wid)) and not w.is_dead and w.id != npc.id
    ]
    witnessed = len(witnesses) > 0

    retaliation_message = ""
    if witnessed:
        for witness in witnesses:
            await rumor_service.propagate_rumor(db, rumor, witness, now)

        # 살해를 목격했다면 시체가 묘지로 옮겨지고 장례식이 시작된다 (목격자가 없으면 발견되지 않는다).
        if killed:
            await trigger_funeral_from_death(db, npc, now)

        # 경찰이 현장을 목격했다면 그 자리에서 유저에게 반격한다 (죽이기 어렵게 만드는 억제 장치).
        police_witness = next((w for w in witnesses if w.job == "경찰"), None)
        if police_witness is not None:
            retaliation = random.randint(POLICE_RETALIATION_DAMAGE_MIN, POLICE_RETALIATION_DAMAGE_MAX)
            user.hp = max(user.hp - retaliation, 1)
            db.add(user)
            db.commit()
            retaliation_message = f" 경찰이 현장을 보고 달려들어 반격했다! (체력 -{retaliation})"
    elif not killed:
        # 목격자는 없었지만 피해자는 생존했다 - 본인은 알고 있으니, 나중에 소문을 낼 수 있게 해 둔다
        # (지금 당장은 평판에 영향 없음 - 실제로 퍼졌을 때만 깎인다).
        rumor_service.record_direct_knowledge(db, rumor, npc, now)

    db.refresh(user)
    message = (
        fact_text
        + (" 목격자가 있어 소문이 퍼지기 시작했다." if witnessed else " 아무도 보지 못한 것 같다...")
        + retaliation_message
    )
    return AttackResult(
        success=True, npc_id=npc.id, npc_is_dead=killed, message=message, reputation=user.reputation, witnessed=witnessed
    )
