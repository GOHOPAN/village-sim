from pydantic import BaseModel


class ShopItemOut(BaseModel):
    name: str
    price: int
    category: str


class InventoryItemOut(BaseModel):
    item_name: str
    quantity: int

    model_config = {"from_attributes": True}


class BuyRequest(BaseModel):
    user_id: int
    facility_key: str
    item_name: str
    quantity: int = 1


class SellRequest(BaseModel):
    user_id: int
    facility_key: str  # 판매하려는 재료를 사들이는 NPC의 건물 (예: 철광석 -> blacksmith)
    item_name: str
    quantity: int = 1


class UseRequest(BaseModel):
    user_id: int
    item_name: str
    quantity: int = 1


class TransactionResult(BaseModel):
    success: bool
    message: str
    gold: int | None = None


class GatherRequest(BaseModel):
    user_id: int
    location: str  # "forest" | "mine"
    # 채집하는 순간 근처에 있던(반경 내) 살아있는 NPC id 목록 - 채집 현장을 목격한 NPC들에게
    # 기억을 심어주는 데 쓰인다 (환경 상호작용 상태 변화가 주변 NPC에게 전파되는 것과 같은 개념).
    nearby_npc_ids: list[int] = []


class GatherResult(BaseModel):
    success: bool
    message: str
    item_gained: str | None = None
    fatigue: int | None = None
    minutes_spent: int = 0


class EquipRequest(BaseModel):
    user_id: int
    slot: str  # "tool" | "weapon"
    item_name: str  # 빈 문자열("") = 해제
