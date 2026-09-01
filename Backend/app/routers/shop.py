from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.item_catalog import GATHER_CONFIG, ITEM_CATALOG, items_sold_at
from app.models.npc import NPC
from app.models.user import User
from app.schemas.shop import (
    BuyRequest,
    EquipRequest,
    GatherRequest,
    GatherResult,
    SellRequest,
    ShopItemOut,
    TransactionResult,
    UseRequest,
)
from app.services import inventory_service, memory_service
from app.services.world_event_manager import get_or_create_world_state

router = APIRouter(tags=["shop"])

GATHER_LOCATION_LABELS = {"forest": "숲", "mine": "광산"}
GATHER_WITNESS_MEMORY_IMPORTANCE = 2.0


@router.get("/shop/{facility_key}/items", response_model=list[ShopItemOut])
def get_shop_items(facility_key: str) -> list[ShopItemOut]:
    items = items_sold_at(facility_key)
    return [ShopItemOut(name=name, price=data["price"], category=data["category"]) for name, data in items.items()]


@router.post("/shop/buy", response_model=TransactionResult)
def buy_item(payload: BuyRequest, db: Session = Depends(get_db)) -> TransactionResult:
    user = db.get(User, payload.user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없습니다.")

    catalog_entry = ITEM_CATALOG.get(payload.item_name)
    if catalog_entry is None or payload.facility_key not in catalog_entry.get("sold_at", []):
        raise HTTPException(status_code=400, detail=f"'{payload.item_name}'은(는) 이 시설에서 팔지 않습니다.")

    total_price = catalog_entry["price"] * payload.quantity
    if user.gold < total_price:
        return TransactionResult(success=False, message="골드가 부족합니다.", gold=user.gold)

    user.gold -= total_price
    db.add(user)
    db.commit()
    inventory_service.add_item(db, "user", user.id, payload.item_name, payload.quantity)

    return TransactionResult(success=True, message=f"{payload.item_name} {payload.quantity}개를 구매했습니다.", gold=user.gold)


@router.post("/shop/sell", response_model=TransactionResult)
def sell_item(payload: SellRequest, db: Session = Depends(get_db)) -> TransactionResult:
    """채집 재료(장작/철광석 등)는 아무 데서나 팔 수 없고, 지정된 NPC의 건물(목수/대장장이)에서만 판매 가능하다."""
    user = db.get(User, payload.user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없습니다.")

    catalog_entry = ITEM_CATALOG.get(payload.item_name)
    sell_price = catalog_entry.get("sell_price") if catalog_entry else None
    if sell_price is None:
        raise HTTPException(status_code=400, detail=f"'{payload.item_name}'은(는) 판매할 수 없는 아이템입니다.")
    if catalog_entry.get("buys_at") != payload.facility_key:
        raise HTTPException(status_code=400, detail="이 시설은 그 아이템을 사들이지 않습니다.")

    removed = inventory_service.remove_item(db, "user", user.id, payload.item_name, payload.quantity)
    if not removed:
        return TransactionResult(success=False, message="보유 수량이 부족합니다.", gold=user.gold)

    user.gold += sell_price * payload.quantity
    db.add(user)
    db.commit()

    return TransactionResult(success=True, message=f"{payload.item_name} {payload.quantity}개를 판매했습니다.", gold=user.gold)


@router.post("/shop/use", response_model=TransactionResult)
def use_item(payload: UseRequest, db: Session = Depends(get_db)) -> TransactionResult:
    """유저가 자신의 인벤토리 아이템을 직접 소비한다 (빵을 먹는다, 물약을 마신다 등)."""
    user = db.get(User, payload.user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없습니다.")

    catalog_entry = ITEM_CATALOG.get(payload.item_name)
    if catalog_entry is None:
        raise HTTPException(status_code=400, detail="존재하지 않는 아이템입니다.")

    removed = inventory_service.remove_item(db, "user", user.id, payload.item_name, payload.quantity)
    if not removed:
        return TransactionResult(success=False, message="보유 수량이 부족합니다.", gold=user.gold)

    for _ in range(payload.quantity):
        # 허기/체력은 100이 최상 상태이므로, 먹으면 채워지는 방향(+)으로 적용한다.
        user.hunger = min(user.hunger + catalog_entry.get("hunger_restore", 0), 100)
        user.hp = min(user.hp + catalog_entry.get("hp_restore", 0), 100)
        user.intoxication = min(user.intoxication + catalog_entry.get("intoxication_add", 0), 100)

    db.add(user)
    db.commit()

    return TransactionResult(success=True, message=f"{payload.item_name}을(를) 사용했습니다.", gold=user.gold)


@router.post("/user/{user_id}/equip", response_model=TransactionResult)
def equip_item(user_id: int, payload: EquipRequest, db: Session = Depends(get_db)) -> TransactionResult:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없습니다.")

    if payload.item_name:
        catalog_entry = ITEM_CATALOG.get(payload.item_name)
        if catalog_entry is None or catalog_entry.get("category") != payload.slot:
            raise HTTPException(status_code=400, detail=f"'{payload.item_name}'은(는) {payload.slot} 슬롯에 장착할 수 없습니다.")
        owned = inventory_service.get_item(db, "user", user.id, payload.item_name)
        if owned is None or owned.quantity < 1:
            raise HTTPException(status_code=400, detail="해당 아이템을 보유하고 있지 않습니다.")

    if payload.slot == "tool":
        user.equipped_tool = payload.item_name
    elif payload.slot == "weapon":
        user.equipped_weapon = payload.item_name
    else:
        raise HTTPException(status_code=400, detail="슬롯은 tool 또는 weapon 이어야 합니다.")

    db.add(user)
    db.commit()

    message = f"{payload.item_name}을(를) 장착했습니다." if payload.item_name else "장착을 해제했습니다."
    return TransactionResult(success=True, message=message, gold=user.gold)


@router.post("/gather", response_model=GatherResult)
def gather_resource(payload: GatherRequest, db: Session = Depends(get_db)) -> GatherResult:
    user = db.get(User, payload.user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없습니다.")

    config = GATHER_CONFIG.get(payload.location)
    if config is None:
        raise HTTPException(status_code=400, detail="채집할 수 없는 장소입니다.")

    required_tool = config["required_tool"]
    if user.equipped_tool != required_tool:
        return GatherResult(success=False, message=f"{required_tool}을(를) 장착해야 채집할 수 있습니다.", fatigue=user.fatigue)

    if user.fatigue <= 10:
        return GatherResult(success=False, message="너무 지쳐서 채집할 수 없습니다. 좀 쉬어야 할 것 같습니다.", fatigue=user.fatigue)

    # 프론트엔드가 이미 5초짜리 로딩 연출을 보여준 뒤 호출하므로, 여기서는 확률 없이 항상 고정된
    # 게임 시간(game_minutes)만큼 흐르고 고정 수량(yield_quantity)을 확정적으로 지급한다.
    minutes_spent = config["game_minutes"]
    world = get_or_create_world_state(db)
    world.game_datetime = world.game_datetime + timedelta(minutes=minutes_spent)
    db.add(world)

    user.fatigue = max(user.fatigue - config["fatigue_cost"], 0)
    db.add(user)
    db.commit()

    quantity = config["yield_quantity"]
    inventory_service.add_item(db, "user", user.id, config["item"], quantity)

    # 채집이라는 "상태 변화"(자원이 그 자리에서 채굴/벌목되는 중)를 목격한 근처 NPC들에게
    # 각자의 기억으로 남긴다 (전투/언어폭력의 목격자 처리와 같은 패턴).
    location_label = GATHER_LOCATION_LABELS.get(payload.location, payload.location)
    witnesses = [
        w for wid in payload.nearby_npc_ids if (w := db.get(NPC, wid)) and not w.is_dead
    ]
    for witness in witnesses:
        memory_service.add_memory(
            npc_id=witness.id,
            text=f"유저가 {location_label}에서 {config['item']}을(를) 채집하는 모습을 보았다.",
            importance=GATHER_WITNESS_MEMORY_IMPORTANCE,
            memory_type="episodic",
            game_timestamp=world.game_datetime,
        )

    return GatherResult(
        success=True,
        message=f"{minutes_spent}분 동안 채집해서 {config['item']} {quantity}개를 얻었습니다.",
        item_gained=config["item"],
        fatigue=user.fatigue,
        minutes_spent=minutes_spent,
    )
