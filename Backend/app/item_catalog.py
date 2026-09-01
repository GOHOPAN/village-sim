"""정적 아이템 카탈로그 (MVP: DB가 아닌 코드로 관리, 디자인/밸런스만 나중에 조정하면 됨).

sold_at: 이 아이템을 구매할 수 있는 시설 키(app/world_layout.py의 BUILDINGS_ANCHOR 키와 동일).
빈 리스트면 채집(gather)으로만 얻을 수 있다.

category별 의미:
- food/drink: /shop/use 로 소비하면 허기/체력/취기에 영향
- material: 채집으로만 얻고, buys_at에 지정된 NPC 건물에만 판매 가능 (일반 판매 불가)
- tool: 장착(equip)하면 해당 tool_for 장소에서 채집이 가능해짐
- weapon: 장착(equip)하면 전투 시 피해량이 크게 증가
- gift: 실용 효과 없이 선물 전용
"""

ITEM_CATALOG: dict[str, dict] = {
    # --- 음식/음료 ---
    "빵": {
        "price": 5,
        "category": "food",
        "sold_at": ["tavern"],
        "hunger_restore": 25,
        "gift_value": 3,
    },
    "국밥": {
        "price": 7,
        "category": "food",
        "sold_at": ["restaurant_a"],
        "hunger_restore": 35,
        "gift_value": 4,
    },
    "스튜": {
        "price": 8,
        "category": "food",
        "sold_at": ["restaurant_b"],
        "hunger_restore": 40,
        "gift_value": 4,
    },
    "구운 생선": {
        "price": 6,
        "category": "food",
        "sold_at": ["restaurant_b"],
        "hunger_restore": 30,
        "gift_value": 3,
    },
    "에일": {
        "price": 6,
        "category": "drink",
        "sold_at": ["tavern"],
        "hunger_restore": 5,
        "intoxication_add": 20,
        "gift_value": 3,
    },
    "약초물약": {
        "price": 15,
        "category": "medicine",
        "sold_at": ["hospital"],
        "hp_restore": 20,
        "cures_illness": True,
        "gift_value": 5,
    },

    # --- 선물 전용 ---
    "꽃다발": {
        "price": 10,
        "category": "gift",
        "sold_at": ["shop"],
        "gift_value": 10,
    },
    "손거울": {
        "price": 20,
        "category": "gift",
        "sold_at": ["shop"],
        "gift_value": 15,
    },

    # --- 채집 재료 (일반 판매 불가, 지정된 NPC 건물에만 판매 가능) ---
    "장작": {
        "price": 0,
        "category": "material",
        "sold_at": [],
        "buys_at": "carpenter",
        "sell_price": 4,
        "gift_value": 2,
    },
    "철광석": {
        "price": 0,
        "category": "material",
        "sold_at": [],
        "buys_at": "blacksmith",
        "sell_price": 7,
        "gift_value": 2,
    },

    # --- 채집 도구 (대장간에서만 판매, 장착해야 채집 가능) ---
    "곡괭이": {
        "price": 25,
        "category": "tool",
        "sold_at": ["blacksmith"],
        "tool_for": "mine",
        "gift_value": 5,
    },
    "도끼": {
        "price": 20,
        "category": "tool",
        "sold_at": ["blacksmith"],
        "tool_for": "forest",
        "gift_value": 5,
    },

    # --- 무기 (암시장 전용, 장착 시 전투력 급상승) ---
    "낡은 검": {
        "price": 60,
        "category": "weapon",
        "sold_at": ["black_market"],
        "damage_min": 25,
        "damage_max": 40,
        "gift_value": 30,
    },

    # --- 암시장 전용 잡화 ---
    "수상한 반지": {
        "price": 50,
        "category": "gift",
        "sold_at": ["black_market"],
        "gift_value": 25,
    },
    "만병통치약": {
        "price": 40,
        "category": "medicine",
        "sold_at": ["black_market"],
        "hp_restore": 999,
        "cures_illness": True,
        "gift_value": 20,
    },
}

# 채집(숲/광산) 설정: 장착한 도구가 있어야 시도할 수 있다.
# 골드는 주지 않는다 - 얻은 재료를 해당 NPC(대장장이/목수)에게 직접 팔아야 골드로 바뀐다.
# 프론트엔드가 5초(실제 시간) 로딩 연출을 보여준 뒤 이 엔드포인트를 호출하며, 성공/실패 확률 없이
# 항상 고정된 게임 시간(game_minutes)만큼 시간이 흐르고 고정 수량(yield_quantity)을 확정적으로 얻는다.
GATHER_CONFIG: dict[str, dict] = {
    "forest": {
        "item": "장작",
        "required_tool": "도끼",
        "fatigue_cost": 15,
        "game_minutes": 15,
        "yield_quantity": 1,
    },
    "mine": {
        "item": "철광석",
        "required_tool": "곡괭이",
        "fatigue_cost": 20,
        "game_minutes": 15,
        "yield_quantity": 1,
    },
}

UNARMED_DAMAGE_MIN, UNARMED_DAMAGE_MAX = 1, 3


def items_sold_at(facility_key: str) -> dict[str, dict]:
    return {name: data for name, data in ITEM_CATALOG.items() if facility_key in data.get("sold_at", [])}


def get_weapon_damage_range(equipped_weapon: str) -> tuple[int, int]:
    entry = ITEM_CATALOG.get(equipped_weapon)
    if entry and entry.get("category") == "weapon":
        return entry["damage_min"], entry["damage_max"]
    return UNARMED_DAMAGE_MIN, UNARMED_DAMAGE_MAX
