"""마을의 좌표 배치 상수. 프론트엔드 src/game/map/mapData.js 가 동일한 값을 미러링한다
(두 리포지토리가 언어가 달라 직접 import는 불가능하므로, 값을 바꿀 때는 양쪽을 함께 수정할 것).

건물은 전부 3x3 칸짜리 "들어갈 수 있는" 구조로 취급한다:
- 외곽 8칸 중 아래쪽 가운데 1칸 = 문(DOOR, 통행 가능)
- 나머지 외곽 7칸 = 벽(WALL, 통행 불가)
- 정중앙 1칸 = 내부(INTERIOR, 통행 가능) - NPC의 실제 근무 위치이자 상점 상호작용 위치
"""

TILE_SIZE = 32
MAP_COLS = 32
MAP_ROWS = 24


def tile_to_px(col: int, row: int) -> tuple[float, float]:
    return col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE + TILE_SIZE / 2


# 건물(들어갈 수 있는 3x3 구조물). anchor = 좌상단 타일 좌표.
BUILDINGS_ANCHOR = {
    "tavern": (2, 2),
    "shop": (7, 2),
    "restaurant_a": (12, 2),
    "restaurant_b": (17, 2),
    "blacksmith": (22, 2),
    "carpenter": (27, 2),
    "hospital": (2, 9),
    "police": (7, 9),
}

BUILDING_LABELS = {
    "tavern": "🍺 술집",
    "shop": "🛒 상점",
    "restaurant_a": "🍜 식당 A",
    "restaurant_b": "🍲 식당 B",
    "blacksmith": "⚒ 대장간",
    "carpenter": "🪚 목공소",
    "hospital": "🏥 병원",
    "police": "🚔 경찰서",
}


def building_interior_tile(key: str) -> tuple[int, int]:
    col, row = BUILDINGS_ANCHOR[key]
    return col + 1, row + 1


def building_door_tile(key: str) -> tuple[int, int]:
    col, row = BUILDINGS_ANCHOR[key]
    return col + 1, row + 2


# 열린 공간(건물 아님, 마커 타일 하나) - 광장/묘지/숲/광산
OPEN_MARKERS = {
    "square": (17, 9, "⛲ 광장"),
    "graveyard": (24, 9, "⚰ 묘지"),
    "forest": (2, 16, "🌲 숲"),
    "mine": (27, 16, "⛏ 광산"),
}

# 하위 호환: 예전 코드(FACILITIES_TILES)를 참조하던 곳들을 위해 building/open marker를 합쳐서 제공.
FACILITIES_TILES = {key: BUILDINGS_ANCHOR[key] for key in BUILDINGS_ANCHOR}
FACILITIES_TILES.update({key: (col, row) for key, (col, row, _label) in OPEN_MARKERS.items()})

# NPC 집 (1칸 마커, 서로 떨어져 있음)
HOME_TILES = {
    "촌장": (6, 16),
    "상인": (9, 16),
    "대장장이": (12, 16),
    "의사": (15, 16),
    "경찰": (18, 16),
    "술집 주인": (21, 16),
    "목수": (24, 16),
}

PLAYER_HOME_TILE = (14, 20)

NPC_SEED = [
    {
        "name": "촌장",
        "job": "촌장",
        "personality": "위엄 있고 신중하지만 마을 사람들을 진심으로 아낀다.",
        "secret": "",
        "core_traits": "honest,cautious",
        "home_tile": HOME_TILES["촌장"],
        "workplace_tile": building_interior_tile("police"),  # 촌장은 관청(경찰서)에서 업무를 본다
    },
    {
        "name": "상인",
        "job": "상인",
        "personality": "말이 많고 흥정을 좋아하며 돈 계산에 밝다.",
        "secret": "",
        "core_traits": "gossipy,greedy",
        "home_tile": HOME_TILES["상인"],
        "workplace_tile": building_interior_tile("shop"),
    },
    {
        "name": "대장장이",
        "job": "대장장이",
        "personality": "무뚝뚝하지만 정이 많고 자기 일에 자부심이 강하다.",
        "secret": "",
        "core_traits": "honest,short-tempered",
        "home_tile": HOME_TILES["대장장이"],
        "workplace_tile": building_interior_tile("blacksmith"),
    },
    {
        "name": "의사",
        "job": "의사",
        "personality": "차분하고 이성적이며 사람들의 건강을 최우선으로 여긴다.",
        "secret": "",
        "core_traits": "honest,calm",
        "home_tile": HOME_TILES["의사"],
        "workplace_tile": building_interior_tile("hospital"),
    },
    {
        "name": "경찰",
        "job": "경찰",
        "personality": "원칙주의자이며 마을의 치안을 엄격하게 지키려 한다.",
        "secret": "",
        "core_traits": "honest,strict",
        "home_tile": HOME_TILES["경찰"],
        "workplace_tile": building_interior_tile("police"),
    },
    {
        "name": "술집 주인",
        "job": "술집 주인",
        "personality": "수다스럽고 마을의 온갖 소문을 꿰고 있다.",
        "secret": "",
        "core_traits": "gossipy,suspicious",
        "home_tile": HOME_TILES["술집 주인"],
        "workplace_tile": building_interior_tile("tavern"),
    },
    {
        "name": "목수",
        "job": "목수",
        "personality": "묵묵히 자기 일만 하는 편이지만 손재주가 좋고 마을 사람들을 잘 돕는다.",
        "secret": "",
        "core_traits": "honest,calm",
        "home_tile": HOME_TILES["목수"],
        "workplace_tile": building_interior_tile("carpenter"),
    },
]

# 도박장/암시장은 별도 건물이 아니라, 특정 NPC와의 친밀도가 일정 이상이 되면 밤에만
# 기존 건물(술집/대장간)이 "변신"하는 형태로 존재한다. 유저는 친밀도가 쌓이기 전까지는
# 이런 시설이 있는지조차 알 수 없다.
HIDDEN_FACILITY_HOSTS = {
    "gambling_den": {"host_building": "tavern", "gatekeeper": "술집 주인"},
    "black_market": {"host_building": "blacksmith", "gatekeeper": "대장장이"},
}
