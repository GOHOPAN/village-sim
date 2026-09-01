/**
 * 마을 좌표 배치 상수.
 * Backend/app/world_layout.py 와 반드시 동일한 값을 유지할 것
 * (언어가 달라 직접 import가 불가능하므로 값을 바꿀 때는 양쪽을 함께 수정해야 한다).
 *
 * 건물은 전부 3x3 칸짜리 "들어갈 수 있는" 구조로 취급한다:
 * - 외곽 8칸 중 아래쪽 가운데 1칸 = 문(DOOR, 통행 가능)
 * - 나머지 외곽 7칸 = 벽(WALL, 통행 불가)
 * - 정중앙 1칸 = 내부(INTERIOR, 통행 가능) - NPC의 실제 근무 위치이자 상점 상호작용 위치
 */
export const TILE_SIZE = 32;
export const MAP_COLS = 32;
export const MAP_ROWS = 24;

export const TILE = {
  FLOOR: 0,
  WALL: 1,
  BUSH: 2,
  DOOR: 3,
  INTERIOR: 4,
};

// 건물(들어갈 수 있는 3x3 구조물). anchor = 좌상단 타일 좌표.
export const BUILDINGS_ANCHOR = {
  tavern: { col: 2, row: 2 },
  shop: { col: 7, row: 2 },
  restaurant_a: { col: 12, row: 2 },
  restaurant_b: { col: 17, row: 2 },
  blacksmith: { col: 22, row: 2 },
  carpenter: { col: 27, row: 2 },
  hospital: { col: 2, row: 9 },
  police: { col: 7, row: 9 },
};

export const BUILDING_LABELS = {
  tavern: "🍺 술집",
  shop: "🛒 상점",
  restaurant_a: "🍜 식당 A",
  restaurant_b: "🍲 식당 B",
  blacksmith: "⚒ 대장간",
  carpenter: "🪚 목공소",
  hospital: "🏥 병원",
  police: "🚔 경찰서",
};

export function buildingInteriorTile(key) {
  const { col, row } = BUILDINGS_ANCHOR[key];
  return { col: col + 1, row: row + 1 };
}

export function buildingDoorTile(key) {
  const { col, row } = BUILDINGS_ANCHOR[key];
  return { col: col + 1, row: row + 2 };
}

// 열린 공간(건물 아님, 마커 타일 하나) - 광장/묘지/숲/광산
export const OPEN_MARKERS = {
  square: { col: 17, row: 9, label: "⛲ 광장" },
  graveyard: { col: 24, row: 9, label: "⚰ 묘지" },
  forest: { col: 2, row: 16, label: "🌲 숲" },
  mine: { col: 27, row: 16, label: "⛏ 광산" },
};

// 하위 호환: 라벨/좌표를 한 번에 순회하고 싶은 코드를 위한 통합 뷰.
export const FACILITIES = {
  ...Object.fromEntries(
    Object.entries(BUILDINGS_ANCHOR).map(([key, { col, row }]) => [
      key,
      { col, row, label: BUILDING_LABELS[key], isBuilding: true },
    ])
  ),
  ...Object.fromEntries(
    Object.entries(OPEN_MARKERS).map(([key, { col, row, label }]) => [key, { col, row, label, isBuilding: false }])
  ),
};

// NPC 집 (1칸 마커, 서로 떨어져 있음)
export const HOME_TILES = {
  촌장: { col: 6, row: 16 },
  상인: { col: 9, row: 16 },
  대장장이: { col: 12, row: 16 },
  의사: { col: 15, row: 16 },
  경찰: { col: 18, row: 16 },
  "술집 주인": { col: 21, row: 16 },
  목수: { col: 24, row: 16 },
};

export const PLAYER_HOME_TILE = { col: 14, row: 20 };

// 도박장/암시장은 별도 건물이 아니라 술집/대장간이 "변신"하는 형태다. 존재를 미리 드러내지 않기 위해
// FACILITIES/라벨에는 절대 등록하지 않는다 (백엔드 HIDDEN_FACILITY_HOSTS와 대응).
export const HIDDEN_FACILITY_HOSTS = {
  gambling_den: { hostBuilding: "tavern", gatekeeper: "술집 주인" },
  black_market: { hostBuilding: "blacksmith", gatekeeper: "대장장이" },
};

// 은신용 수풀(HIDDEN=TRUE) 타일 좌표들
const BUSH_TILES = [
  [5, 13],
  [9, 13],
  [13, 13],
  [17, 13],
  [21, 13],
  [25, 13],
  [5, 6],
  [11, 6],
  [19, 6],
  [25, 6],
];

function stampBuilding(grid, key) {
  const { col, row } = BUILDINGS_ANCHOR[key];
  for (let dr = 0; dr < 3; dr++) {
    for (let dc = 0; dc < 3; dc++) {
      grid[row + dr][col + dc] = TILE.WALL;
    }
  }
  const door = buildingDoorTile(key);
  const interior = buildingInteriorTile(key);
  grid[door.row][door.col] = TILE.DOOR;
  grid[interior.row][interior.col] = TILE.INTERIOR;
}

/** 런타임에 2D 타일 그리드를 생성한다 (Tiled 맵 파일 없이도 즉시 실행 가능하도록). */
export function buildTileGrid() {
  const grid = Array.from({ length: MAP_ROWS }, () => Array(MAP_COLS).fill(TILE.FLOOR));

  // 테두리 벽
  for (let c = 0; c < MAP_COLS; c++) {
    grid[0][c] = TILE.WALL;
    grid[MAP_ROWS - 1][c] = TILE.WALL;
  }
  for (let r = 0; r < MAP_ROWS; r++) {
    grid[r][0] = TILE.WALL;
    grid[r][MAP_COLS - 1] = TILE.WALL;
  }

  Object.keys(BUILDINGS_ANCHOR).forEach((key) => stampBuilding(grid, key));

  // 은신용 수풀 배치
  BUSH_TILES.forEach(([col, row]) => {
    if (grid[row]?.[col] !== undefined && grid[row][col] === TILE.FLOOR) grid[row][col] = TILE.BUSH;
  });

  return grid;
}

export function tileToPixel(col, row) {
  return { x: col * TILE_SIZE + TILE_SIZE / 2, y: row * TILE_SIZE + TILE_SIZE / 2 };
}
