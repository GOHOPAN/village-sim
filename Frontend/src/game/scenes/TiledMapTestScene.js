import Phaser from "phaser";

import { TILED_TILESET_MANIFEST } from "../tiledTilesetManifest";

const MOVE_SPEED = 220;
const RUN_MOVE_SPEED = 450; // Shift를 누른 채 이동할 때(달리기)
const CAMERA_ZOOM = 0.8;

// "안에 들어옴" 트리거 존은 각 건물 그룹의 `Floors` 타일 레이어에서 실제로 타일이 채워진 칸(=사용자가
// Tiled에서 "여기 서 있으면 실내" 라고 칠해둔 영역)에서 직접 만든다(_buildTriggerZonesFromFadeLayers).
// 지붕/벽/문 타일이나 그 교집합, 문 상태 등을 따지던 예전 방식(2026-08-31 이전)은 전부 폐기 - 사용자가
// `Floors` 레이어 하나로 실내 영역을 명시적으로 지정하는 게 훨씬 단순하고 정확하다.
// 이 값을 양수로 하면 존을 그만큼 사방으로 부풀리고, 음수면 그만큼 안쪽으로 줄인다. Arcade Physics가
// 매 프레임 속도만큼 이동한 뒤에야 충돌을 보정하기 때문에(220px/s 기준 한 프레임 ~4px) 벽 쪽으로 수 px
// 파고들었다 되밀리는 게 반복될 수 있어, Floors 경계에 딱 붙어 서는 것만으로 발동하지 않도록 음수로 둔다.
const ROOF_TRIGGER_ZONE_PADDING = -4;

// currentActiveRoofs(매 프레임 overlap 결과)는 충돌 보정 등으로 인해 경계 부근에서 프레임 단위로
// 흔들릴 수 있다. 흔들릴 때마다 바로 페이드를 시작/역행시키면 tween이 끝까지 못 가고 계속 중간값에서
// 되돌아가 "반투명한 채로 깜빡이는" 것처럼 보인다. 그래서 상태가 바뀐 것처럼 보여도 몇 프레임 연속으로
// 같은 방향을 유지해야만 실제로 확정(confirmed)하고 페이드를 커밋한다 - 일종의 디바운스/히스테리시스.
const ACTIVE_STATE_DEBOUNCE_FRAMES = 4;

// Phaser 오브젝트는 기본적으로 씬에 추가된 순서대로 그려진다(나중에 추가될수록 위). 플레이어는 모든
// 타일 레이어를 다 만든 뒤에 생성되므로, depth를 안 주면 지붕/벽/문(WInteriors 포함)보다도 위에
// 그려져서 그 구조물들이 캐릭터를 가려야 할 때도 캐릭터가 그 위로 보이는 문제가 있었다. 지붕류는
// "안에 들어가면 그 자체가 alpha 0이 되어 사라지므로" 캐릭터와의 실제 앞/뒤 관계가 중요하지 않고
// 항상 캐릭터보다 위여야만 한다 - 그래서 맵 전체 좌표 범위(150x32=4800px)보다 훨씬 큰 고정값을 줘서
// 절대 역전되지 않게 한다(아래 Forest 나무처럼 y좌표 기반 동적 depth와 값 범위가 겹치지 않아야 함).
const STRUCTURE_ALWAYS_ON_TOP_DEPTH = 1000000;

// "어둠(Darkness)"은 예전엔 건물마다 맵 크기의 타일 레이어(자기 footprint 모양 구멍이 뚫린)로 authored했으나,
// 집이 여러 개가 되면 그 타일 레이어들이 다른 건물 구조물 레이어와 depth가 같아(둘 다 STRUCTURE_ALWAYS_ON_TOP_DEPTH)
// Tiled 레이어 순서에 따라 다른 집이 어둠 위로 삐져나오는 문제가 있었다. 그래서 씬 전체에 딱 하나짜리 검은
// 오버레이(rectangle)를 두고, "지금 들어가 있는 건물 footprint"만 반전 geometry mask로 구멍 낸다
// (_refreshDarknessOverlay 참고). 오버레이 depth는 모든 구조물보다 위 - 다른 집 지붕/벽이 절대 못 뚫는다.
// 활성 건물의 자기 인테리어/플레이어는 구멍(마스크) 안이라 그대로 보인다.
const DARKNESS_DEPTH = STRUCTURE_ALWAYS_ON_TOP_DEPTH + 1;
const DARKNESS_FADE_MS = 300;

// Y-정렬(Y-sort)이 필요한 오브젝트(나무, 석상, 비석 등)는 평범한 타일 레이어로 그리면 depth가 레이어
// 단위로 고정돼서 "캐릭터가 오브젝트 뒤로 걸어 들어가면 가려지고, 앞으로 지나가면 위에 보이는" 연출이
// 불가능하다(항상 한쪽에만 고정). 그래서 그런 레이어는 `createLayer()` 대신 각 타일을 개별 Phaser
// 이미지 오브젝트로 변환해(자세한 내용은 _renderYSortLayerVisuals 참고) 타일의 월드 y좌표를 그대로
// depth로 쓰고, 플레이어도 매 프레임 자신의 y좌표를 depth로 갱신해(update() 참고) 두 값을 같은
// 좌표계에서 비교하는 표준 Y-정렬을 구현한다. 어떤 레이어가 이 대상인지는 `_isYSortLayerName()`이
// 판정한다 - Forest 그룹의 `Tree1`~`Tree12`뿐 아니라, 리프 타일 레이어 이름에 "ysort"가 들어간 레이어는
// 전부 동일하게 처리되므로 석상/비석처럼 새로운 종류의 오브젝트도 그런 이름의 타일 레이어에 담기만
// 하면 코드 변경 없이 바로 Y-정렬 대상이 된다(예: 그룹 안에 "StatueYSort" 같은 이름의 타일 레이어).
const PLAYER_DEPTH = 10; // Y-정렬 오브젝트 변환 전 초기값(첫 update() 전 한 프레임 대비용, 이후 y로 갱신됨)

// 계단은 그림상 x:y=2:1 비율로 완만하게 누워있어서(위로 1칸 오를 때 옆으로 2칸씩 이동), 단순히 8방향
// 입력을 그대로 속도로 쓰면 그림의 기울기와 실제 이동 궤적이 어긋나 "계단을 오른다"는 느낌이 안 산다.
// 그래서 "Stair" 오브젝트 레이어(사각형, Tiled에 정밀하게 그릴 필요 없이 계단 통로를 넉넉히 덮기만
// 하면 됨 - 실제 벽/난간은 CollisionLayer가 이미 막아주므로 존이 그 위까지 덮어도 무해함) 위에서는
// 입력을 이 비율의 대각선으로 스냅한다. 오브젝트에 dirX/dirY 커스텀 프로퍼티를 넣으면 계단마다 다른
// 방향/비율도 지원되고(코드 변경 불필요), 없으면 이 기본값(오른쪽 위로 2:1)을 쓴다.
const STAIR_ASCEND_DIRECTION_DEFAULT = { dx: 2, dy: -1 };
// 계단을 오르내리는 동안은 힘이 드는 느낌을 주기 위해 이동 속도를 고정값으로 줄인다(달리기 중이어도
// 계단 위에서는 이 속도가 우선 적용됨 - 아래 update() 참고).
const STAIR_MOVE_SPEED = 150;

/**
 * Tiled에서 만든 실제 맵(map.json)을 그대로 불러와 테스트하는 전용 씬.
 * BootScene/MainScene의 절차적 placeholder 맵과는 완전히 분리되어 있으며,
 * "?map=tiled" 쿼리 파라미터로 들어왔을 때만 사용된다 (config.js 참고).
 *
 * [맵 데이터 구조]
 * - 타일 충돌은 두 가지 방식이 섞여 있다:
 *   ① 최상위 `CollisionLayer`: 타일셋 자체의 `collides: true` 커스텀 속성이 붙은 타일만 이 레이어에
 *      배치된다 (`layer.setCollisionByProperty({ collides: true })`). 이 레이어는 순수하게 충돌 판정
 *      전용이라 **항상 숨김 처리**한다(그룹의 가림막 페이드와 무관하게 영원히 안 보임).
 *   ② `Interiors`처럼 실제로 보여야 하는 레이어의 타일 중 일부는 Tiled의 Tile Collision Editor로
 *      타일 자체에 사각형 히트박스가 그려져 있다. `layer.setCollisionFromCollisionGroup(true)`가 이
 *      타일들을 충돌 타일로 표시한다(Arcade Physics는 타일 전체를 사각형으로 취급하므로, 그려둔
 *      히트박스의 정확한 모양이 아니라 "그 타일에 충돌 판정이 있다/없다"만 반영됨).
 * - 그룹 레이어: 건물/구조물 하나가 그룹 레이어 하나(예: "House1", "Cave")로 묶이고, 그 안에 여러 타일
 *   레이어가 들어있다. **그룹에 `Floors` 타일 레이어가 있으면 그 그룹이 "들어가면 실내가 되는 건물"이다.**
 *   `Floors` 레이어에는 사용자가 Tiled에서 "여기 서 있으면 실내" 인 칸을 직접 칠해두며(문턱/문 칸 포함,
 *   지붕만 있고 벽은 없는 처마 아래는 칠하지 않음), 플레이어 발밑이 그 칸에 들어오면 트리거가 켜진다:
 *   - 그 그룹에서 이름에 "roof"/"wall"/"door"가 들어간 레이어(`hideOnEnterLayersByGroupName`) → 들어가면
 *     완전히 투명해짐(alpha 0), 나가면 완전히 불투명(alpha 1). 지붕/벽/문이 사라져 내부가 보이는 연출.
 *   - 어둠(주변을 검게 덮어 내부에 집중시키는 연출): 씬 전체에 검은 오버레이 사각형 하나(`darknessOverlay`,
 *     depth는 모든 구조물보다 위)를 두고 "지금 들어가 있는 건물의 실내 footprint(Floors + 안에서 보이는
 *     WInteriors/Interiors/Rugs 등)"만 반전 geometry
 *     mask로 구멍 낸다 - `_refreshDarknessOverlay()`. Tiled의 "darkness" 타일 레이어는 쓰지 않는다.
 *   - 그 외(`Interiors`, `WInteriors`, `Rugs`, `Floors` 자신 등)는 페이드 대상이 아니라 항상 그대로 보인다.
 *   문으로 들어가면 별도 내부 맵으로 이동하는 게 아니라 같은 맵 안에서 지붕/벽/문만 사라지고(+ 주변이
 *   어둠 오버레이로 덮이고) 인테리어가 그대로 보이는 방식이다. `Floors`가 없는 그룹(Graveyard, Plaza,
 *   Mountain 등)은 트리거 대상이 아니라 아무 것도 페이드/어둡게 하지 않는다.
 *
 * 페이드 로직: 각 건물 그룹의 `Floors` 타일 레이어에서 실제로 타일이 채워진 칸을 행(row) 단위로 훑어
 * 가로로 이어진 구간을 하나의 정적 물리 존(Zone)으로 합쳐 roofTriggerZoneGroup에 담고, 플레이어와 Arcade
 * Physics overlap으로 겹침을 감지한다(`_buildTriggerZonesFromFadeLayers`). 지붕/벽/문 타일이나 그 교집합,
 * 문 열림/닫힘 상태 등을 따지던 예전 방식(2026-08-31 이전, 처마·얕은 방 문제로 폐기)은 전부 없어지고,
 * 사용자가 `Floors` 레이어로 실내 영역을 직접 지정하는 것으로 대체됐다. overlap 콜백은 겹치는 동안 매
 * 프레임 실행되므로, 그 안에서 currentActiveRoofs(이번 프레임에 닿은 그룹 이름들) Set을 채운다. 같은
 * 그룹의 존 여러 개를 동시에 밟아도 Set이라 자동으로 하나로 합쳐지고, 존 중 단 하나라도 닿아 있으면 그
 * 이름은 계속 currentActiveRoofs에 남는다.
 *
 * update()는 이 raw currentActiveRoofs를 바로 페이드에 반영하지 않고, confirmedActiveRoofs(실제로
 * 페이드가 적용된 확정 상태)와 비교해서 다르면 pendingTransitions에 후보로 기록한다. 같은 방향으로
 * ACTIVE_STATE_DEBOUNCE_FRAMES 프레임 연속 유지되어야 비로소 confirmedActiveRoofs를 갱신하고 실제
 * 페이드를 커밋한다 - 경계 부근에서 프레임 단위로 흔들리는 raw 신호가 tween을 계속 중간에서 되돌려
 * "반투명한 채로 깜빡이는" 것을 막기 위한 디바운스.
 *
 * Y-정렬이 필요한 타일 레이어(`_isYSortLayerName()`이 판정 - Forest 그룹의 `Tree1`~`Tree12` 또는 리프
 * 이름에 "ysort"가 들어간 임의의 타일 레이어)는 다른 레이어와 달리 `createLayer()`로 그리지 않고
 * `_renderYSortLayerVisuals()`로 개별 오브젝트(Phaser Image)로 변환한다(상단 상수 주석 참고). 나무나
 * 석상/비석 같은 오브젝트는 건물처럼 그룹 안이 아니라 맵 위에 흩어져 있어서, 캐릭터가 그 뒤로 걸어
 * 들어가면 가려지고 앞으로 지나가면 위에 보여야 한다 - 이건 지붕처럼 고정된 앞/뒤 관계가 아니라
 * 매 프레임 캐릭터 위치에 따라 바뀌는 관계라 depth를 y좌표로 동적으로 매기는 Y-정렬이 필요하다.
 * depth는 타일 자신의 y좌표가 아니라 `_buildYSortColumnRunDepths()`가 만드는, "같은 열에서 세로로
 * 끊기지 않고 이어진 구간"이 공유하는 값을 쓴다 - 타일별로 자기 y좌표를 쓰면 오브젝트 하나가 여러 행에
 * 걸쳐 있을 때 플레이어가 그 행 범위 중간에 서는 순간 위/아래로 갈라져 보이기 때문(Forest에서 실제로
 * 겪은 버그, 사용자가 스크린샷으로 보고함). 8방향 플러드 필로 붙어있는 칸을 통째로 묶는 방법도 시도했으나,
 * 이 맵의 Forest는 나무가 서로 빈틈없이 이어진 하나의 큰 덩어리라 숲 전체(1232개 타일)가 하나의
 * 컴포넌트로 뭉쳐버려 오히려 숲 전체가 플레이어와 절대 자리를 바꾸지 않는 하나의 판板처럼 굳어버렸다
 * (실측: distinctDepthValues === 1) - 그래서 가로로는 절대 묶지 않고 같은 열의 세로 구간만 묶는다.
 * 이 depth 그룹핑은 Y-정렬 대상으로 잡힌 모든 레이어를 합친 점유 격자(`_buildYSortMergedOccupancy()`)
 * 기준으로 계산되므로, 예를 들어 석상 레이어와 나무 레이어가 같은 열에서 우연히 맞닿아 있어도 시각적으로
 * 하나처럼 보이는 동안은 함께 Y-정렬된다(서로 다른 종류의 오브젝트라도 겹쳐 있으면 하나의 실루엣으로
 * 취급하는 게 일관적임 - Forest 나무끼리도 원래 이렇게 동작함).
 *
 * 나무 밑둥 충돌은 더 이상 코드가 타일 그림을 분석해 자동으로 만들지 않는다 - 대신 최상위 `CollisionLayer`
 * (클래스 상단 설명의 ①번 메커니즘)에 사용자가 Tiled에서 직접 밑둥/받침대 위치마다 `collides: true`
 * 타일을 얹어두는 방식으로 바뀌었다. Y-정렬 레이어는 시각적으로만 개별 오브젝트로 변환되고(Y-정렬용),
 * 충돌은 다른 모든 레이어와 마찬가지로 CollisionLayer 하나가 맵 전체 기준으로 담당한다(Cave 벽 충돌과
 * 동일한 방식). 자동 판정 방식(알파 채널 분석 + 사각형 병합)은 그림체에 따라 오탐/누락이 반복적으로
 * 발생해 정확도를 보장하기 어려웠던 반면, 사람이 그림을 보고 직접 놓는 이 방식은 항상 정확하다.
 *
 * 계단(2026-08-09 추가, 2026-08-09 StairStraight로 확장): 대각선 계단은 그림상 x:y=2:1 비율로
 * 완만하게 누워있어서, CollisionLayer만으로 "오르는 느낌"을 만들려면 픽셀 단위로 정밀한 사각형이
 * 필요해 현실적이지 않다(가진 부분 사각형 해상도가 16x16/16x32/32x32뿐이라 그 비율을 정확히 못
 * 따라감). 대신 `Stair`라는 오브젝트 레이어의 사각형 위에서는 입력을 계단 기울기로 강제 스냅한다
 * (`_buildStairZones`가 존 데이터를 만들고, `update()`가 `_findStairZoneForPlayer()`로 매 프레임
 * 직접 사각형 검사를 해서 부호 비교로 리다이렉트) - CollisionLayer는 여전히 통로 양옆만 대충 막아주면
 * 되고, 정밀도 부담이 줄어든다. 세로/가로로 곧게 뻗은 계단(`StairStraight`)은 입력이 이미 그림과
 * 일치해서 대각선 스냅이 필요 없으므로, 감속만 적용하고 스냅은 건너뛴다(`_buildStairZones`가 리프
 * 이름의 "straight" 여부로 `snap` 플래그를 정함). 이 존들은 다른 트리거들과 달리
 * `physics.add.overlap()`을 쓰지 않는데, 실측 결과 그 콜백이 물리 서브스텝과 렌더 프레임이 항상
 * 1:1로 맞물리지 않아 한 프레임씩 걸러 호출되는 경우가 있었기 때문이다(roof 트리거는 페이드가 몇 프레임
 * 밀려도 안 보이지만, 매 프레임 속도를 직접 정해야 하는 계단은 그 프레임에 원래 속도로 되돌아가 버벅였다).
 */
export default class TiledMapTestScene extends Phaser.Scene {
  constructor() {
    super("TiledMapTestScene");
    this.hideOnEnterLayersByGroupName = new Map(); // 그룹 이름(소문자) -> Roof/Wall/Door 타일레이어 이름 배열 (들어가면 투명해짐)
    this.floorLayerNameByGroup = new Map(); // 그룹 이름(소문자) -> Phaser 평탄화 Floors 레이어 이름 ("House1/Floors")
    this.buildingFootprintRects = new Map(); // 그룹 이름(소문자) -> [{x,y,width,height}] 월드좌표 - 어둠 오버레이 구멍(마스크)용 (= 실내 footprint: Floors + WInteriors/Interiors/Rugs 등)
    this._darknessTargetAlpha = 0; // 어둠 오버레이의 현재 목표 alpha(같은 값이면 트윈 재시작 안 함)
    this.currentActiveRoofs = new Set(); // 이번 프레임(찰나)에 닿고 있는 그룹 이름(소문자)들 - raw, 노이즈 있을 수 있음
    this.confirmedActiveRoofs = new Set(); // 디바운스를 통과해 실제로 페이드가 적용된 확정 상태
    this.pendingTransitions = new Map(); // groupNameLower -> { toActive, streak } - 확정 대기 중인 후보 전환
    this.warnedMissingGroups = new Set();
  }

  preload() {
    this.load.tilemapTiledJSON("village", "/maps/village.json");
    Object.values(TILED_TILESET_MANIFEST).forEach((key) => {
      this.load.image(key, `/tilesets/${key}.png`);
    });
  }

  create() {
    this._generatePlayerTexture();

    const rawData = this.cache.tilemap.get("village").data;
    this.map = this.make.tilemap({ key: "village" });

    const tilesetImages = this.map.tilesets.map((ts) => {
      const key = TILED_TILESET_MANIFEST[ts.name];
      if (!key) {
        // eslint-disable-next-line no-console
        console.warn(`[TiledMapTestScene] 타일셋 "${ts.name}"에 대응하는 이미지 매핑이 없습니다.`);
        return null;
      }
      return this.map.addTilesetImage(ts.name, key);
    }).filter(Boolean);
    this.tilesetImages = tilesetImages; // _buildDoorZones()가 문 타일의 gid -> 애니메이션 프레임 데이터를 조회할 때 재사용

    // Tiled Tile Collision Editor로 타일에 직접 그려둔 사각형 히트박스를 그 좌표/크기 그대로 반영할
    // 정적 존들을 담는다 (setCollisionFromCollisionGroup()은 타일 "전체"를 막아버려서 대신 이 방식을 씀).
    this.preciseHitboxZoneGroup = this.physics.add.staticGroup();
    this._ySortTileFrameCache = new Map(); // `${textureKey}:${globalTileIndex}` -> 이미 만들어둔 프레임 키

    const ySortLayerDatas = this.map.layers.filter((l) => this._isYSortLayerName(l.name));
    // Y-정렬 대상 레이어 전부를 합친 점유 격자 - depth 그룹핑(아래 ySortColumnRunDepths)에만 쓰인다.
    // 나무/석상 등의 밑둥 충돌은 이 데이터로 자동 계산하지 않고, 최상위 CollisionLayer에 직접 배치한
    // 타일이 담당한다.
    const ySortMergedOccupancy = this._buildYSortMergedOccupancy(ySortLayerDatas);
    // 타일 하나하나에 자기 자신의 y좌표로 depth를 주면, 오브젝트 하나가 여러 행에 걸쳐 있을 때 플레이어가
    // 그 행 범위 "중간"에 서기만 해도 위/아래로 갈라져 보이는 문제가 생긴다(Forest에서 사용자가
    // 스크린샷으로 보고한 증상). 같은 열에서 세로로 끊기지 않고 이어진 구간(vertical run)마다 depth
    // 하나를 공유하게 해서, 그 열에서는 더 이상 중간에 갈라지지 않으면서도 옆 열(다른 오브젝트)은
    // 독립적으로 자기 Y-정렬을 유지한다(왜 8방향 플러드 필 대신 이 방식을 쓰는지는 아래 메서드 docblock
    // 참고).
    const ySortColumnRunDepths = this._buildYSortColumnRunDepths(ySortMergedOccupancy);

    this.tileLayers = [];
    this.map.layers.forEach((layerData) => {
      if (this._isYSortLayerName(layerData.name)) {
        // 평범한 타일 레이어로 두면 depth가 고정이라 캐릭터가 오브젝트 앞/뒤로 자연스럽게 걸어다닐 수
        // 없다. createLayer로 렌더링하는 대신, 타일 하나하나를 개별 오브젝트로 변환한다.
        this._renderYSortLayerVisuals(layerData, tilesetImages, ySortColumnRunDepths);
        return;
      }

      const layer = this.map.createLayer(layerData.name, tilesetImages, 0, 0);
      if (!layer) return;

      const leafName = layerData.name.split("/").pop();
      if (/^collisionlayer$/i.test(leafName)) {
        // 충돌 판정 전용 레이어 - 절대 화면에 보이면 안 되므로 항상 숨김 유지(가림막 페이드 대상 아님).
        layer.setVisible(false);
      } else if (/darkness/i.test(leafName)) {
        // Darkness 타일 레이어는 더 이상 쓰지 않는다 - 어둠은 씬 전체 오버레이 + 반전 마스크로 처리한다
        // (상단 DARKNESS_DEPTH 주석, _refreshDarknessOverlay 참고). 아직 Tiled에서 안 지운 레이어가
        // 남아 있어도(마이그레이션 중) 조용히 숨기고 무시한다. tileLayers/충돌/페이드 어디에도 안 넣는다.
        layer.setVisible(false);
        return;
      } else {
        layer.setVisible(true); // Tiled에 저장된 visible=false(예: Roof)도 강제로 보이게 하고 알파로만 제어한다
        if (/(roof|wall|door)/i.test(leafName) || /^winteriors?\d+$/i.test(leafName)) {
          // 지붕/벽/문 + "안 사라지는 벽 중 캐릭터를 가려야 하는 것"(숫자 접미사 있는 WInteriors2 등 -
          // 방의 좌/우/아래(near) 벽 안쪽 면. 위에서 내려다보는 시점에서 플레이어보다 위에 그려져야
          // 자연스럽다)은 "구조물" 레이어다. 기본값(depth 0)으로는 나중에 생성되는 플레이어가 항상 위에
          // 그려지므로, 이들만 고정 depth로 캐릭터보다 위에 둔다.
          // **숫자 없는 순수 `WInteriors`는 여기서 제외한다(2026-08-31)**: 그건 방의 뒤(far) 벽 안쪽
          // 면이라 Tiled 레이어 순서상 Rugs/Interiors보다 아래에 그려져야 하는데(사용자 피드백:
          // "WInteriors가 Interiors보다 위에 있다"), 여기 넣으면 그 둘 위로 튀어 올라온다. 순수
          // WInteriors는 depth를 안 줘서 맵 레이어 순서(Floors→WInteriors→Rugs→Interiors)대로 그려지게 둔다.
          layer.setDepth(STRUCTURE_ALWAYS_ON_TOP_DEPTH);
        }
      }

      // 타일셋 tiles[].properties에 있는 collides:true를 그대로 읽어 충돌 타일을 표시한다(CollisionLayer용,
      // 기본적으로는 타일 전체를 막는 게 의도된 동작이다).
      layer.setCollisionByProperty({ collides: true });
      // 다만 collides:true인 타일 중에서도 Tile Collision Editor로 사각형을 따로 그려둔 타일(예:
      // CollisionLayer의 모서리/부분 차단용 타일)은 타일 "전체"가 아니라 그려둔 사각형만 막혀야 한다
      // (Cave Interiors의 히트박스와 동일한 원칙 - 사용자가 실제로 CollisionLayer 타일 일부를 Tile
      // Collision Editor로 잘라서 만들어뒀는데, setCollisionByProperty가 타일 전체를 막아버려서 그
      // 사각형이 무시되고 있었다). 그런 타일 인덱스만 골라 방금 켠 전체-타일 충돌을 다시 끄고, 정확한
      // 사각형은 바로 아래 _buildPreciseTileHitboxZones가 별도 존으로 만든다. collides:true이면서
      // Tile Collision Editor 사각형이 없는 타일(예: CollisionLayer의 기본 전체 차단 타일)은 그대로
      // 타일 전체가 막힌다.
      const preciseShapeIndices = new Set();
      layer.layer.data.forEach((rowTiles) => {
        rowTiles.forEach((tile) => {
          if (!tile || tile.index === -1) return;
          const collisionGroup = tile.getCollisionGroup();
          if (collisionGroup && collisionGroup.objects && collisionGroup.objects.length > 0) {
            preciseShapeIndices.add(tile.index);
          }
        });
      });
      if (preciseShapeIndices.size > 0) {
        layer.setCollision([...preciseShapeIndices], false);
      }
      // Tile Collision Editor로 일부 타일에 그려둔 사각형 히트박스는 타일 전체가 아니라 그려둔 부분만
      // 막혀야 하므로, 위처럼 setCollisionFromCollisionGroup()으로 타일 전체를 막지 않고 정확한
      // 사각형 그대로 별도 존을 만든다.
      this._buildPreciseTileHitboxZones(layer);
      this.tileLayers.push(layer);
    });

    this._buildGroupFadeLayerMap(rawData.layers);

    this.player = this.physics.add.sprite(2100, 2140, "tiled-test-player");
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(20, 20);
    this.player.setDepth(PLAYER_DEPTH); // 첫 update() 전까지의 임시값, 이후 매 프레임 y좌표 기반으로 갱신됨

    this.tileLayers.forEach((layer) => {
      this.physics.add.collider(this.player, layer);
    });
    this.physics.add.collider(this.player, this.preciseHitboxZoneGroup);

    // 각 그룹의 지붕+벽 타일 레이어에서 실제 채워진 타일 범위(합집합)로 정적 물리 존을 만들고,
    // 플레이어와의 overlap을 등록한다.
    this.roofTriggerZoneGroup = this.physics.add.staticGroup();
    this._buildTriggerZonesFromFadeLayers();
    this.physics.add.overlap(this.player, this.roofTriggerZoneGroup, (_player, zone) => {
      this.currentActiveRoofs.add(zone.getData("triggerName"));
    });

    // "Stair" 오브젝트 레이어(사각형)에서 이동 방향 스냅 존 데이터를 만든다. Arcade Physics의
    // physics.add.overlap()은 물리 서브스텝(고정 60Hz)과 렌더 프레임(update())이 항상 1:1로 맞물리지
    // 않아서, 실측 결과 overlap 콜백이 매 프레임이 아니라 한 프레임씩 걸러 호출되는 경우가 있었다(roof
    // 트리거는 페이드가 몇 프레임 디바운스되어도 티가 안 나서 문제없었지만, 이동 속도를 매 프레임 직접
    // 덮어써야 하는 계단은 그 프레임 걸러 원래 속도로 되돌아가 버벅였다). 그래서 overlap 이벤트에
    // 의존하지 않고, update()마다 플레이어 바디와 각 존을 직접 사각형 대 사각형으로 검사한다(순수 판정용,
    // 물리 바디/충돌은 필요 없음).
    this._buildStairZones();

    // "Door"/"DoorObject" 이름 규칙(문 오브젝트 존 + 애니메이션 문 타일)으로 문을 찾아 상태머신을 만든다.
    // 계단과 마찬가지로 물리 바디 없이 update()에서 직접 사각형 검사를 한다(이유는 클래스 상단 계단
    // 설명 참고 - overlap 콜백이 매 프레임 호출을 보장하지 않아 상태를 매 프레임 직접 판정해야 함).
    this._buildDoorZones();

    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.cameras.main.setZoom(CAMERA_ZOOM);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);

    // `setScrollFactor(0)`는 카메라 스크롤(이동)에 안 끌려가게만 해줄 뿐, 카메라 zoom은 scrollFactor와
    // 무관하게 화면에 그려지는 모든 오브젝트에 그대로 적용된다. 그래서 메인 카메라를 줌 아웃하면
    // scrollFactor(0)로 고정해둔 디버그 텍스트도 함께 작아지고, 화면 좌상단(8,8) 기준 좌표도 줌 배율만큼
    // 축소되어 실제로는 화면 중앙 쪽으로 당겨져 보인다(맵의 일부가 아닌 UI인데도). 해결: zoom=1로 고정된
    // 별도의 UI 전용 카메라를 하나 더 만들고, 메인(줌 적용) 카메라는 디버그 텍스트를 그리지 않게,
    // UI 카메라는 지금까지 만들어진 월드 오브젝트(타일/플레이어 등)를 그리지 않게 서로 역할을 나눈다.
    this.uiCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    this.uiCamera.setZoom(1);
    this.uiCamera.ignore(this.children.list);

    // 어둠 오버레이 - 씬 전체를 덮는 검은 사각형 하나. 평소엔 alpha 0(안 보임)이고, 건물에 들어가면
    // _refreshDarknessOverlay()가 그 건물 footprint 모양으로 마스크(구멍)를 그리고 alpha를 1로 올린다.
    // depth는 모든 구조물(STRUCTURE_ALWAYS_ON_TOP_DEPTH)보다 위 - 다른 집 지붕/벽이 어둠 위로 못 뚫는다.
    // 맵보다 사방 2000px 크게 잡는다 - 줌 아웃(0.8) 상태에서 카메라가 맵 가장자리 밖을 살짝 비출 때도 덮이게.
    const darknessMargin = 2000;
    this.darknessOverlay = this.add
      .rectangle(
        -darknessMargin,
        -darknessMargin,
        this.map.widthInPixels + darknessMargin * 2,
        this.map.heightInPixels + darknessMargin * 2,
        0x000000,
        1
      )
      .setOrigin(0, 0)
      .setDepth(DARKNESS_DEPTH)
      .setAlpha(0);
    // 마스크 소스: 화면에 직접 그려지지 않는 Graphics(this.make - 디스플레이 리스트에 안 올라감).
    // invertAlpha=true → "이 그래픽스에 칠한 영역만 빼고" 오버레이가 그려짐 = 칠한 영역이 구멍.
    this.darknessMaskGraphics = this.make.graphics({ x: 0, y: 0 });
    const darknessMask = this.darknessMaskGraphics.createGeometryMask();
    darknessMask.invertAlpha = true;
    this.darknessOverlay.setMask(darknessMask);
    this.uiCamera.ignore(this.darknessOverlay); // children.list 스냅샷 이후 추가돼서 수동 제외 필요

    this.keys = this.input.keyboard.addKeys("W,S,A,D,SHIFT");
    // E(상호작용)는 폴링(JustDown)이 아니라 keydown 이벤트 리스너로 처리한다 - MainScene.js의 NPC
    // 상호작용(`keydown-E`)과 동일한 패턴. update()에서 JustDown()으로 폴링하면 Phaser의 입력 처리
    // 타이밍과 게임 루프 프레임이 어긋나는 경우(다른 여러 곳에서 이미 겪은 종류의 문제, 클래스 상단
    // overlap 콜백 설명 참고) 눌림이 씹힐 수 있어, 이벤트 자체에 직접 반응하는 이 방식이 더 안전하다.
    this.input.keyboard.on("keydown-E", () => this._handleDoorInteractKey());

    this.debugText = this.add
      .text(8, 8, "", { fontSize: "12px", color: "#ffffff", backgroundColor: "#000000aa", padding: { x: 4, y: 2 } })
      .setScrollFactor(0)
      .setDepth(1000);
    this.cameras.main.ignore(this.debugText);

    // 문 앞에 서 있을 때만 뜨는 "[E] 문 열기/닫기" 안내 텍스트. debugText(화면 고정 UI)와 달리 이건
    // 문 위치를 따라다니는 월드 오브젝트라 반대로 uiCamera 쪽에서 제외한다(uiCamera.ignore(this.children.list)는
    // 생성 시점 스냅샷이라 그 이후에 추가된 오브젝트는 자동으로 걸러지지 않음 - 새 월드 오브젝트를 만들 때마다
    // 이렇게 개별적으로 제외해줘야 줌 카메라와 UI 카메라 양쪽에 중복으로 그려지지 않는다).
    this.doorPromptText = this.add
      .text(0, 0, "[E] 문 열기", {
        fontSize: "12px",
        color: "#ffe066",
        backgroundColor: "#00000099",
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(DARKNESS_DEPTH + 1) // 어둠 오버레이보다 위 - 건물 안 문 앞에서도 프롬프트가 안 묻히게
      .setVisible(false);
    this.uiCamera.ignore(this.doorPromptText);
  }

  /**
   * fullName(Phaser 평탄화 이름, 예: "Forest/Tree3" 또는 "StatueYSort")이 Y-정렬 대상 타일 레이어인지
   * 판정한다. 두 조건 중 하나만 맞으면 대상: ① Forest 그룹의 `Tree1`~`Tree12`(기존 나무 전용 규칙,
   * 하위 호환용으로 유지 - 이미 이 이름으로 만들어둔 맵을 다시 손댈 필요 없게), ② 리프 타일 레이어
   * 이름 자체에 "ysort"가 부분 문자열로 들어간 레이어(신규 범용 규칙) - 나무뿐 아니라 석상/비석처럼
   * 캐릭터가 앞/뒤로 지나다녀야 하는 임의의 오브젝트를 그릴 때, 그 타일 레이어 이름에 "ysort"만 넣으면
   * 코드 변경 없이 동일하게 처리된다(그룹 안에 넣을 필요도 없음 - 순전히 리프 이름만 검사).
   */
  _isYSortLayerName(fullName) {
    if (/^forest\/tree\d+$/i.test(fullName)) return true;
    const leafName = fullName.split("/").pop();
    return /ysort/i.test(leafName);
  }

  /**
   * 그룹 레이어(예: "House1", "Cave") 안의 자식 타일 레이어를 훑어, **`Floors` 타일 레이어가 있는 그룹만**
   * "들어가면 실내가 되는 건물"로 등록한다:
   * - `floorLayerNameByGroup`: 그룹 이름(소문자) → Phaser 평탄화 Floors 레이어 이름("House1/Floors").
   *   `_buildTriggerZonesFromFadeLayers`가 이 레이어의 채워진 칸에서 트리거 존을 만든다.
   * - `hideOnEnterLayersByGroupName`: 그 그룹에서 이름에 "roof"/"wall"/"door"가 들어간 레이어들 → 들어가면
   *   alpha 0(투명). `WInteriors`/`Rugs`/`Interiors`/`Floors`처럼 매칭 안 되는 레이어는 항상 그대로 보임.
   * - `buildingFootprintRects`: 실내에서 계속 보여야 하는 레이어(Floors + roof/wall/door가 아닌 나머지 =
   *   WInteriors/WInteriors2/Interiors/Rugs 등) 채워진 칸의 합집합을 행 단위 사각형으로 → 어둠 오버레이
   *   구멍(마스크)용. Floors만 쓰면 방 바깥쪽 줄에 그린 "안에서 본 벽"이 어둠에 잘린다.
   * `Floors`가 없는 그룹(Graveyard, Plaza, Mountain 등)은 아무 것도 등록하지 않는다(트리거 대상 아님).
   *
   * 주의: Phaser는 중첩 그룹의 자식 타일레이어를 `this.map.layers`(및 `getLayer()`)에 평탄화하면서
   * 이름을 raw JSON의 단순 이름("Roofs")이 아니라 `"부모그룹/자식이름"`("Cave/Roofs") 형태로 바꿔
   * 저장한다. 이 매핑에 raw 이름을 그대로 넣으면 `this.map.getLayer(layerName)`가 항상 null을
   * 반환해서(`_fadeGroupLayers`가 조용히 아무 것도 안 함) 가림막이 절대 페이드되지 않는다 - 실제로
   * 겪었던 버그. 그래서 재귀하면서 부모 경로(parentPath)를 누적해 Phaser가 쓰는 것과 동일한 평탄화
   * 이름을 만들어 저장한다. (footprint 사각형은 raw 그룹 자식 data를 직접 훑으므로 평탄화 이름과 무관.)
   */
  _buildGroupFadeLayerMap(layers, parentPath = "") {
    layers.forEach((layer) => {
      if (layer.type !== "group") return;
      const groupPath = parentPath ? `${parentPath}/${layer.name}` : layer.name;
      const childTileLayers = (layer.layers || []).filter((child) => child.type === "tilelayer");
      const groupNameLower = layer.name.toLowerCase();

      const floorsChild = childTileLayers.find((child) => /^floors?$/i.test(child.name));
      if (floorsChild) {
        this.floorLayerNameByGroup.set(groupNameLower, `${groupPath}/${floorsChild.name}`);

        const hideOnEnterNames = childTileLayers
          .filter((child) => /(roof|wall|door)/i.test(child.name))
          .map((child) => `${groupPath}/${child.name}`);
        if (hideOnEnterNames.length > 0) {
          this.hideOnEnterLayersByGroupName.set(groupNameLower, hideOnEnterNames);
        }

        // 어둠 오버레이 구멍(마스크) = 실내에서 계속 보여야 하는 레이어(Floors + 페이드 안 되는 나머지:
        // WInteriors/WInteriors2/Interiors/Rugs 등)의 채워진 칸 합집합. Floors만 쓰면 방 바깥쪽 한두 줄에
        // 그려진 "안에서 본 벽"(WInteriors)이 어둠에 잘려 보인다(2026-08-31 사용자 피드백). roof/wall/door
        // 이름 레이어(들어가면 투명해짐)는 제외 - 넣으면 처마/벽 바깥 영역까지 구멍이 뚫려 바깥이 새어 보인다.
        const holeLayers = childTileLayers.filter(
          (child) => !/(roof|wall|door|darkness)/i.test(child.name)
        );
        const rects = this._footprintRectsFromRawLayers(holeLayers.length > 0 ? holeLayers : [floorsChild]);
        if (rects.length > 0) this.buildingFootprintRects.set(groupNameLower, rects);
      }

      // 그룹 안에 또 그룹이 중첩된 경우도 재귀적으로 처리
      this._buildGroupFadeLayerMap(layer.layers || [], groupPath);
    });
  }

  /**
   * raw Tiled 타일 레이어(비무한 맵이라 `data`가 flat gid 배열, 0=빈칸) 한 장 이상의 채워진 칸 합집합을
   * "같은 행에서 가로로 이어진 구간"마다 하나의 월드좌표 사각형으로 묶어 반환한다. 트리거 존을 만들 때
   * (`_buildTriggerZonesFromFadeLayers`)와 같은 행-런 방식이라, 건물 모양이 직사각형이 아니어도(ㄱ자 등)
   * 정확히 그 모양대로 사각형들이 나온다.
   */
  _footprintRectsFromRawLayers(rawLayers) {
    if (rawLayers.length === 0) return [];
    const w = rawLayers[0].width;
    const h = rawLayers[0].height;
    const tw = this.map.tileWidth;
    const th = this.map.tileHeight;

    const occupied = new Array(w * h).fill(false);
    rawLayers.forEach((rl) => {
      const data = rl.data || [];
      for (let i = 0; i < data.length; i++) {
        if (data[i] !== 0) occupied[i] = true;
      }
    });

    const rects = [];
    for (let row = 0; row < h; row++) {
      let runStart = null;
      for (let col = 0; col <= w; col++) {
        const filled = col < w && occupied[row * w + col];
        if (filled) {
          if (runStart === null) runStart = col;
        } else if (runStart !== null) {
          rects.push({ x: runStart * tw, y: row * th, width: (col - runStart) * tw, height: th });
          runStart = null;
        }
      }
    }
    return rects;
  }

  /**
   * `floorLayerNameByGroup`의 각 건물 그룹에 대해, 그 그룹의 `Floors` 타일 레이어에서 실제로 타일이
   * 채워진 칸(= 사용자가 Tiled에서 "여기 서 있으면 실내" 라고 칠한 영역)만으로 정적 물리 존(Zone)을
   * 만들어 roofTriggerZoneGroup에 담고, 플레이어와의 overlap을 등록한다. 지붕/벽/문 타일이나 그 교집합,
   * 문 상태 등을 따지던 예전 방식은 폐기 - `Floors` 레이어 하나로 실내 영역이 명시적으로 정해진다.
   * 존 개수를 줄이기 위해 같은 행(row)에서 가로로 이어진 채워진 칸들을 하나의 넓은 존으로 합친다.
   * 각 존은 ROOF_TRIGGER_ZONE_PADDING만큼 사방으로 살짝 줄여서(음수) Floors 경계에 딱 붙어 서는 것만으로는
   * 발동하지 않게 한다.
   */
  _buildTriggerZonesFromFadeLayers() {
    const tileWidth = this.map.tileWidth;
    const tileHeight = this.map.tileHeight;

    this.floorLayerNameByGroup.forEach((floorLayerName, groupNameLower) => {
      const floorLayer = this.map.getLayer(floorLayerName);
      if (!floorLayer) return;
      const rows = floorLayer.data;
      const isFloorFilled = (row, col) => {
        if (row < 0 || col < 0 || row >= rows.length || col >= rows[row].length) return false;
        const tile = rows[row][col];
        return tile && tile.index !== -1;
      };

      for (let row = 0; row < rows.length; row++) {
        let runStartCol = null;

        const flushRun = (endCol) => {
          if (runStartCol === null) return;
          const x0 = runStartCol * tileWidth - ROOF_TRIGGER_ZONE_PADDING;
          const x1 = (endCol + 1) * tileWidth + ROOF_TRIGGER_ZONE_PADDING;
          const y0 = row * tileHeight - ROOF_TRIGGER_ZONE_PADDING;
          const y1 = (row + 1) * tileHeight + ROOF_TRIGGER_ZONE_PADDING;
          const zone = this.add.zone((x0 + x1) / 2, (y0 + y1) / 2, x1 - x0, y1 - y0);
          this.physics.add.existing(zone, true); // 정적(static) 바디: overlap 판정 전용, 렌더링/이동에는 관여하지 않음
          zone.setData("triggerName", groupNameLower);
          this.roofTriggerZoneGroup.add(zone);
          runStartCol = null;
        };

        for (let col = 0; col < rows[row].length; col++) {
          if (isFloorFilled(row, col)) {
            if (runStartCol === null) runStartCol = col;
          } else {
            flushRun(col - 1);
          }
        }
        flushRun(rows[row].length - 1);
      }
    });
  }

  /**
   * 리프 이름에 "stair"가 들어간 오브젝트 레이어(들)의 사각형 오브젝트마다 이동 존 데이터를
   * `this.stairZones`에 모은다. Arcade의 overlap 이벤트를 쓰지 않고 update()에서 직접 사각형 검사를
   * 하므로(바로 위 create() 주석 참고) 물리 바디가 필요 없는 순수 데이터({x0,y0,x1,y1,snap,direction})
   * 로만 저장한다. Roof/Wall 트리거와 달리 이 존은 타일 데이터에서 자동 유도하지 않고 손으로 그린
   * 사각형을 그대로 쓴다 - 지붕 커버리지 문제(버그 2/5)는 "여러 사각형을 이어 붙여 넓은 영역을 빈틈없이
   * 덮어야 하는" 경우에만 발생했는데, 계단은 사각형 몇 개로 충분하고 서로 안 이어 붙여도 되니 그 부류의
   * 버그가 애초에 생길 수 없다. 또한 사각형이 계단 옆 난간/벽까지 덮어도 무해하다 - 그 부분은
   * CollisionLayer가 이미 막고 있어서 플레이어가 실제로 거기 서 있을 수 없다.
   *
   * 리프 이름에 "straight"가 추가로 들어가면(예: "StairStraight") 세로/가로로 곧게 뻗은 계단용 -
   * 입력이 이미 그림과 일치하니 대각선으로 스냅할 필요 없이 감속만 적용한다(`snap: false`). 그 외
   * 일반 "Stair"는 기존처럼 대각선 스냅 + 감속을 둘 다 적용한다(`snap: true`) - dirX/dirY 커스텀
   * 프로퍼티가 있으면 그 값을, 없으면 STAIR_ASCEND_DIRECTION_DEFAULT를 방향으로 쓴다(straight 존은
   * 스냅을 안 하므로 방향 데이터 자체가 무의미해 읽지 않는다).
   */
  _buildStairZones() {
    this.stairZones = [];
    const stairObjectLayers = this.map.objects.filter((ol) => /stair/i.test(ol.name.split("/").pop()));

    stairObjectLayers.forEach((objectLayer) => {
      const leafName = objectLayer.name.split("/").pop();
      const snap = !/straight/i.test(leafName);

      objectLayer.objects.forEach((obj) => {
        if (obj.polygon || obj.ellipse || obj.point) return; // 사각형 외 모양은 미지원
        const width = obj.width;
        const height = obj.height;
        if (!width || !height) return;

        let direction = null;
        if (snap) {
          const props = {};
          (obj.properties || []).forEach((p) => {
            props[p.name] = p.value;
          });
          const dx = typeof props.dirX === "number" ? props.dirX : STAIR_ASCEND_DIRECTION_DEFAULT.dx;
          const dy = typeof props.dirY === "number" ? props.dirY : STAIR_ASCEND_DIRECTION_DEFAULT.dy;
          direction = { dx, dy };
        }

        this.stairZones.push({
          x0: obj.x,
          y0: obj.y,
          x1: obj.x + width,
          y1: obj.y + height,
          snap,
          direction,
        });
      });
    });
  }

  /** 플레이어 바디와 겹치는 계단 존이 있으면 그 존({snap, direction})을, 없으면 null을 반환한다. */
  _findStairZoneForPlayer() {
    const body = this.player.body;
    return (
      this.stairZones.find((z) => body.right > z.x0 && body.x < z.x1 && body.bottom > z.y0 && body.y < z.y1) || null
    );
  }

  /**
   * "Door"(리프 이름에 "door"가 들어간 오브젝트 레이어, 예: "DoorObject")의 사각형마다 문 하나를
   * 만든다. 판정 존(상호작용 감지용)과 실제 막는 범위(충돌)를 하나의 사각형으로 겸하면 모순이 생긴다
   * (닫혀있을 때 그 사각형 자체가 벽이 되어버리면, "안에 들어가야" 뜨는 열기 프롬프트를 영원히 못
   * 띄움) - 그래서 이 오브젝트 사각형은 문 타일 칸보다 한 칸 정도 넉넉하게 그려서 "상호작용 판정 전용"
   * 으로만 쓰고, 실제로 막는 범위는 아래에서 "Doors" 타일 레이어의 진짜 타일 칸(사각형과 겹치는 것만)
   * 에서 직접 유도한다 - 지붕 트리거(버그 5)에서 배운 "유도 가능한 건 손으로 그리지 않고 데이터에서
   * 유도한다" 원칙과 같다.
   *
   * 애니메이션은 Phaser의 자동 타일 애니메이션 루프를 쓰지 않는다(그렇게 하면 물 흐르는 연출처럼
   * 영원히 반복 재생됨 - 상호작용으로 열고 닫는 것과 맞지 않음). 대신 Tiled Tile Animation Editor로
   * 각 문 타일에 만들어둔 프레임 데이터(`tileset.getTileData(localId).animation`, [{tileid, duration}, ...]
   * - index 0이 맵에 배치된 원본(닫힘) 프레임)만 읽어와서, `_updateDoors()`가 문 상태(열리는 중/닫히는
   * 중)에 따라 이 배열을 직접 앞/뒤로 재생한다.
   *
   * **바깥쪽(Doors) + 안쪽(WInteriors) 두 그림을 함께 찾는다(2026-08-24)**: 문을 위에서 내려다본 모습을
   * 형상화한 애니메이션 타일이 `WInteriors` 레이어의 같은 위치에 별도로 authored되어 있을 수 있다(집
   * 내부에서 봤을 때의 문 모습 - `Doors`는 벽과 함께 안에 들어가면 사라지므로, 그 자리를 대신 채워야
   * 어색하지 않다). `Doors`뿐 아니라 `WInteriors`에서도 애니메이션 프레임이 있는 타일을 훑어 같은 문
   * 판정 사각형과 겹치는 것들을 `interiorCells`로 따로 모은다 - `cells`(바깥쪽, 충돌 대상)와 달리
   * `interiorCells`는 순수 시각 애니메이션 전용이며 충돌에도 페이드(hideOnEnter)에도 관여하지 않는다
   * (WInteriors 자체가 이름에 "wall"/"door"가 없어 애초에 페이드 대상이 아니므로 안에 들어가도 항상
   * 보인다). `_updateDoors()`가 매 프레임 `cells`와 `interiorCells`를 항상 같은 프레임으로 동시에
   * 재생해서, 문 하나를 열고 닫으면 바깥 그림과 안쪽 그림이 함께 바뀐다.
   *
   * **충돌은 문 칸 전체가 아니라 벽 두께만큼만(2026-08-24)**: 이전에는 문 칸(Tile 인스턴스) 자체에
   * `setCollision()`을 걸어서 문 스프라이트가 차지하는 칸 전체(예: House1은 2×2칸=64×64px)가 그대로
   * 막혔는데, 옆 벽은 실제로 타일 절반(16px)만 두꺼운 얇은 판이라 문만 유독 두꺼운 문턱처럼 어색했다
   * (사용자 피드백). `_deriveDoorHitboxRects()`가 문과 맞닿은 `CollisionLayer` 이웃 타일(좌/우 또는
   * 상/하)에서 Tile Collision Editor로 그려둔 실제 벽 두께 사각형을 찾아 그 두께 그대로 문 너비/높이에
   * 맞게 늘린 정적 존(`doorHitboxZoneGroup`, `physics.add.existing(zone, true)`)을 만들어 대신 쓴다 -
   * 두께를 하드코딩하지 않고 이웃 벽 데이터에서 그대로 유도한다(버그 5의 "유도 가능한 건 데이터에서
   * 유도한다" 원칙과 동일). 문이 열리면 이 존들의 `body.enable = false`로 충돌만 끄고(존 자체는 유지),
   * 닫히면 다시 `true`로 되돌린다 - 애니메이션이 중간(opening/closing)인 동안은 계속 막힌/뚫린 상태를
   * 유지하고, 완전히 열렸을 때만 뚫고 완전히 닫혔을 때만 막는다(중간에 바꾸면 마침 그 칸에 서 있는
   * 플레이어가 물리적으로 밀려나는 등 어색해질 수 있어서 상태 전이가 끝난 시점에만 바꾼다). 이웃
   * 벽 데이터를 못 찾은 문(향후 벽 없이 단독으로 놓일 경우)은 안전하게 문 칸 전체를 막는 것으로
   * 대체하고 콘솔 경고를 남긴다.
   *
   * 잠금(locked) 로직은 아직 없다 - 추후 NPC 집 문에 잠금을 추가할 때 이 존 데이터에 `locked` 필드와
   * 판정 분기만 얹으면 되도록 구조를 남겨둔다(사용자 요청으로 이번 라운드에서는 보류).
   */
  _buildDoorZones() {
    this.doorZones = [];
    // 문이 닫혔을 때 벽만큼 얇게 막는 전용 정적 존들 - 문 타일 자체의 setCollision() 대신 이걸 쓴다
    // (위 docblock "충돌은 문 칸 전체가 아니라 벽 두께만큼만" 참고).
    this.doorHitboxZoneGroup = this.physics.add.staticGroup();

    // leafNamePattern에 해당하는 타일 레이어들을 훑어 애니메이션 프레임이 있는 타일 칸만 모은다.
    // Doors(바깥쪽 문)와 WInteriors(안쪽에서 본 문) 양쪽에 동일하게 재사용한다.
    const collectAnimatedCells = (layers) => {
      const cells = [];
      layers.forEach((layer) => {
        layer.layer.data.forEach((rowTiles) => {
          rowTiles.forEach((tile) => {
            if (!tile || tile.index === -1) return;
            const tileset = this.tilesetImages.find((ts) => ts.containsTileIndex(tile.index));
            if (!tileset) return;
            // getTileData()는 인자로 gid(전역 인덱스)를 받아 내부적으로 firstgid를 빼므로, 로컬 id를
            // 미리 빼서 넘기면 두 번 빼져서 항상 실패한다 - tile.index(gid)를 그대로 넘겨야 한다.
            const tileData = tileset.getTileData(tile.index);
            const frames = tileData && tileData.animation;
            if (!frames || frames.length === 0) return; // Tile Animation Editor로 프레임을 안 만든 타일은 지원 대상 아님

            cells.push({
              layer,
              tileset,
              col: tile.x,
              row: tile.y,
              centerX: tile.pixelX + this.map.tileWidth / 2,
              centerY: tile.pixelY + this.map.tileHeight / 2,
              frames,
            });
          });
        });
      });
      return cells;
    };

    const doorTileLayers = this.tileLayers.filter((layer) => /door/i.test(layer.layer.name.split("/").pop()));
    // "WInteriors"뿐 아니라 "WInteriors2"처럼 숫자 접미사가 붙은 레이어도 포함(House1이 2026-08-25에
    // WInteriors를 두 레이어로 나눴는데, 문 위치의 안쪽 애니메이션 타일이 WInteriors2 쪽으로 옮겨감).
    const winteriorTileLayers = this.tileLayers.filter((layer) =>
      /^winteriors?\d*$/i.test(layer.layer.name.split("/").pop())
    );
    const doorTileCells = collectAnimatedCells(doorTileLayers);
    const winteriorTileCells = collectAnimatedCells(winteriorTileLayers);

    const doorObjectLayers = this.map.objects.filter((ol) => /door/i.test(ol.name.split("/").pop()));
    doorObjectLayers.forEach((objectLayer) => {
      objectLayer.objects.forEach((obj) => {
        if (obj.polygon || obj.ellipse || obj.point) return; // 사각형 외 모양은 미지원
        const width = obj.width;
        const height = obj.height;
        if (!width || !height) return;

        const x0 = obj.x;
        const y0 = obj.y;
        const x1 = obj.x + width;
        const y1 = obj.y + height;
        // 이 판정 사각형 안에 중심이 들어오는 문 타일 칸만 이 문에 소속시킨다(여러 문이 같은 "Doors"
        // 레이어를 공유해도 사각형별로 자동으로 분리됨).
        const cells = doorTileCells.filter(
          (c) => c.centerX >= x0 && c.centerX <= x1 && c.centerY >= y0 && c.centerY <= y1
        );
        if (cells.length === 0) return; // 겹치는 문 타일이 없으면(오브젝트 배치 실수 등) 조용히 건너뜀
        const interiorCells = winteriorTileCells.filter(
          (c) => c.centerX >= x0 && c.centerX <= x1 && c.centerY >= y0 && c.centerY <= y1
        );

        const minCol = Math.min(...cells.map((c) => c.col));
        const maxCol = Math.max(...cells.map((c) => c.col));
        const minRow = Math.min(...cells.map((c) => c.row));
        const maxRow = Math.max(...cells.map((c) => c.row));
        const hitboxRects = this._deriveDoorHitboxRects(minCol, maxCol, minRow, maxRow);
        const hitboxZones = hitboxRects.map((rect) => {
          const zone = this.add.zone(rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width, rect.height);
          this.physics.add.existing(zone, true); // 정적(static) 바디: 충돌 판정 전용, 렌더링/이동에는 관여하지 않음
          this.doorHitboxZoneGroup.add(zone);
          return zone;
        });
        // 기본 상태는 닫힘 - 각 칸의 frames[0](=맵에 배치된 원본 타일)이 닫힘 프레임과 정확히 일치하므로
        // 시작 상태와 충돌 상태(막힘)를 그대로 맞춘다.
        hitboxZones.forEach((zone) => {
          zone.body.enable = true;
        });

        this.doorZones.push({
          x0,
          y0,
          x1,
          y1,
          cells,
          interiorCells,
          hitboxZones,
          state: "closed", // closed | opening | open | closing
          frameIndex: 0,
          frameElapsed: 0,
        });
      });
    });

    this.physics.add.collider(this.player, this.doorHitboxZoneGroup);
  }

  /**
   * 문이 차지하는 타일 범위(minCol~maxCol, minRow~maxRow) 바로 바깥의 `CollisionLayer` 이웃 타일에서
   * Tile Collision Editor로 그려둔 사각형(벽 두께)을 찾아, 그 두께 그대로 문의 너비/높이에 맞게 늘린
   * 월드 좌표 사각형 목록을 반환한다(위 `_buildDoorZones` docblock "충돌은 문 칸 전체가 아니라 벽
   * 두께만큼만" 참고). 좌/우 이웃(가로로 이어지는 벽)과 상/하 이웃(세로로 이어지는 벽)을 각각 독립적으로
   * 확인하므로, 문이 가로 벽에 있든 세로 벽에 있든 동일하게 동작한다. 문이 여러 행/열에 걸쳐 있어도
   * 행/열마다 따로 확인해서, 실제로 벽이 있는 행/열에만 얇은 사각형을 만든다(House1 문처럼 위쪽 행은
   * 문틀이라 원래 벽이 없고 아래쪽 행만 실제 벽 두께였던 경우, 아래쪽 행에만 사각형이 생김).
   * 이웃 어디서도 벽 두께를 못 찾으면(향후 벽 없이 단독으로 놓인 문) 안전하게 문 칸 전체를 막는 사각형
   * 하나로 대체하고 콘솔 경고를 남긴다 - 조용히 아예 안 막히는 문보다는 나음.
   */
  _deriveDoorHitboxRects(minCol, maxCol, minRow, maxRow) {
    const tileWidth = this.map.tileWidth;
    const tileHeight = this.map.tileHeight;
    const collisionLayer = this.tileLayers.find((l) => /^collisionlayer$/i.test(l.layer.name.split("/").pop()));
    const rects = [];

    const getPreciseRect = (col, row) => {
      if (!collisionLayer || row < 0 || col < 0) return null;
      const rowTiles = collisionLayer.layer.data[row];
      const tile = rowTiles && rowTiles[col];
      if (!tile || tile.index === -1) return null;
      const collisionGroup = tile.getCollisionGroup();
      const obj = collisionGroup && collisionGroup.objects && collisionGroup.objects[0];
      if (!obj || obj.polygon || obj.ellipse || obj.point) return null;
      return { x: obj.x, y: obj.y, width: obj.width, height: obj.height };
    };

    // 가로로 이어지는 벽(문의 좌/우가 벽): 문이 차지하는 각 행마다 독립적으로 확인.
    for (let row = minRow; row <= maxRow; row++) {
      const neighborRect = getPreciseRect(minCol - 1, row) || getPreciseRect(maxCol + 1, row);
      if (!neighborRect) continue;
      rects.push({
        x: minCol * tileWidth,
        y: row * tileHeight + neighborRect.y,
        width: (maxCol - minCol + 1) * tileWidth,
        height: neighborRect.height,
      });
    }

    // 세로로 이어지는 벽(문의 상/하가 벽): 문이 차지하는 각 열마다 독립적으로 확인.
    for (let col = minCol; col <= maxCol; col++) {
      const neighborRect = getPreciseRect(col, minRow - 1) || getPreciseRect(col, maxRow + 1);
      if (!neighborRect) continue;
      rects.push({
        x: col * tileWidth + neighborRect.x,
        y: minRow * tileHeight,
        width: neighborRect.width,
        height: (maxRow - minRow + 1) * tileHeight,
      });
    }

    if (rects.length === 0) {
      // eslint-disable-next-line no-console
      console.warn(
        "[TiledMapTestScene] 문 주변 CollisionLayer에서 벽 두께를 유도하지 못해 문 칸 전체를 막습니다."
      );
      return [
        {
          x: minCol * tileWidth,
          y: minRow * tileHeight,
          width: (maxCol - minCol + 1) * tileWidth,
          height: (maxRow - minRow + 1) * tileHeight,
        },
      ];
    }

    return rects;
  }

  /** 플레이어 바디와 겹치는 문 존이 있으면 그 존을, 없으면 null을 반환한다(계단과 동일한 방식). */
  _findDoorZoneForPlayer() {
    const body = this.player.body;
    return (
      this.doorZones.find((z) => body.right > z.x0 && body.x < z.x1 && body.bottom > z.y0 && body.y < z.y1) || null
    );
  }

  /** "keydown-E" 이벤트 핸들러: 플레이어가 문 존 안에 있고 전환 애니메이션 중이 아니면 상태를 토글한다. */
  _handleDoorInteractKey() {
    const doorZone = this._findDoorZoneForPlayer();
    if (!doorZone) return;
    const isBusy = doorZone.state === "opening" || doorZone.state === "closing";
    if (isBusy) return; // 열리는/닫히는 중간에는 재입력 무시(중간에 방향 전환하는 건 이번 범위 밖)
    doorZone.state = doorZone.state === "closed" ? "opening" : "closing";
  }

  /**
   * 모든 문 존을 훑어 opening/closing 상태인 것만 프레임을 진행시킨다. 각 문의 프레임 duration은
   * Tiled에서 authored된 값(cells[0].frames가 대표값 - 같은 문의 칸들은 항께 애니메이션되도록
   * Tiled에서 만들어졌다고 가정, WInteriors의 interiorCells도 동일한 프레임 수/duration으로
   * authored되어 있다고 가정)을 그대로 쓴다. cells(바깥쪽, Doors)와 interiorCells(안쪽, WInteriors)를
   * 항상 함께 같은 프레임으로 재생해서 두 그림이 동기화된다. 프레임이 마지막(열림)/처음(닫힘)에
   * 도달하면 상태를 확정하고 그 시점에만 doorHitboxZoneGroup 존들의 충돌을 토글한다(위 _buildDoorZones
   * docblock 참고) - interiorCells는 충돌과 무관하므로 건드리지 않는다.
   */
  _updateDoors(delta) {
    this.doorZones.forEach((door) => {
      if (door.state !== "opening" && door.state !== "closing") return;

      door.frameElapsed += delta;
      const frames = door.cells[0].frames;
      const currentDuration = frames[door.frameIndex].duration;
      if (door.frameElapsed < currentDuration) return;

      door.frameElapsed = 0;
      door.frameIndex += door.state === "opening" ? 1 : -1;

      door.cells.forEach((c) => {
        const gid = c.tileset.firstgid + c.frames[door.frameIndex].tileid;
        c.layer.putTileAt(gid, c.col, c.row);
      });
      door.interiorCells.forEach((c) => {
        const gid = c.tileset.firstgid + c.frames[door.frameIndex].tileid;
        c.layer.putTileAt(gid, c.col, c.row);
      });

      const lastFrameIndex = frames.length - 1;
      if (door.state === "opening" && door.frameIndex >= lastFrameIndex) {
        door.frameIndex = lastFrameIndex;
        door.state = "open";
        door.hitboxZones.forEach((zone) => {
          zone.body.enable = false;
        });
      } else if (door.state === "closing" && door.frameIndex <= 0) {
        door.frameIndex = 0;
        door.state = "closed";
        door.hitboxZones.forEach((zone) => {
          zone.body.enable = true;
        });
      }
    });
  }

  /**
   * layer(TilemapLayer)의 타일들을 훑어서, Tiled Tile Collision Editor로 그려둔 사각형 히트박스가
   * 있는 타일마다 그 사각형의 실제 좌표/크기 그대로 정적 물리 존을 만들어 preciseHitboxZoneGroup에
   * 담는다. 사각형 좌표(obj.x/y/width/height)는 Tiled 규격상 타일 왼쪽 위 모서리 기준 로컬 픽셀
   * 좌표라, 타일의 월드 좌표(tile.pixelX/pixelY)를 더해 월드 좌표로 변환한다.
   * 폴리곤/타원/포인트 모양은 아직 미지원(현재는 전부 사각형으로 그려져 있음) - 만나면 조용히 건너뛴다.
   */
  _buildPreciseTileHitboxZones(layer) {
    layer.layer.data.forEach((rowTiles) => {
      rowTiles.forEach((tile) => {
        if (!tile || tile.index === -1) return;
        const collisionGroup = tile.getCollisionGroup();
        const objects = collisionGroup && collisionGroup.objects;
        if (!objects || objects.length === 0) return;

        objects.forEach((obj) => {
          if (obj.polygon || obj.ellipse || obj.point) return; // 사각형 외 모양은 미지원
          const width = obj.width;
          const height = obj.height;
          if (!width || !height) return;

          const worldX = tile.pixelX + obj.x + width / 2;
          const worldY = tile.pixelY + obj.y + height / 2;
          const zone = this.add.zone(worldX, worldY, width, height);
          this.physics.add.existing(zone, true); // 정적(static) 바디: 충돌 판정 전용, 렌더링/이동에는 관여하지 않음
          this.preciseHitboxZoneGroup.add(zone);
        });
      });
    });
  }

  /**
   * layerData(`_isYSortLayerName()`이 골라낸 Y-정렬 대상 타일 레이어, 예: Forest 그룹의 "Tree3" 또는
   * 임의의 "...YSort" 레이어)의 타일 하나하나를 개별 Phaser Image 오브젝트로 변환한다("타일 레이어 ->
   * 오브젝트 레이어" 자동 변환). 일반 TilemapLayer로 그리면 depth가 레이어 단위로 고정돼서 캐릭터가
   * 오브젝트 앞/뒤를 자연스럽게 오갈 수 없기 때문에, 타일마다 독립된 오브젝트로 만든다. depth는 타일
   * 자신의 y좌표가 아니라 `columnRunDepths`(그 타일이 속한, 같은 열에서 세로로 이어진 구간 전체가
   * 공유하는 값 - `_buildYSortColumnRunDepths` 참고)를 쓴다: 타일별로 자기 y좌표를 쓰면 오브젝트 하나가
   * 여러 행에 걸쳐 있을 때 플레이어가 그 행 범위 중간에 서는 순간 위/아래로 갈라져 보이므로(Forest에서
   * 실제로 겪은 버그), 같은 열의 이어진 구간을 하나의 Y-정렬 단위로 취급해야 한다(update()에서 플레이어도
   * 매 프레임 y좌표로 depth를 갱신하므로, 두 값이 같은 좌표계에서 비교된다). 충돌은 여기서 만들지 않는다
   * - 밑둥/받침대 충돌은 최상위 `CollisionLayer`에 사용자가 직접 배치한 `collides: true` 타일이 담당한다
   * (Cave 벽과 동일한 방식, 클래스 상단 docblock 참고).
   */
  _renderYSortLayerVisuals(layerData, tilesetImages, columnRunDepths) {
    const tileWidth = this.map.tileWidth;
    const tileHeight = this.map.tileHeight;

    layerData.data.forEach((rowTiles, row) => {
      rowTiles.forEach((tile, col) => {
        if (!tile || tile.index === -1) return;

        const tileset = tilesetImages.find((ts) => ts.containsTileIndex(tile.index));
        if (!tileset) return; // 매니페스트에 없는 타일셋이면 위쪽 경고 로그가 이미 남았으므로 조용히 건너뜀
        const frame = this._getOrCreateTileFrameKey(tileset, tile.index);
        if (!frame) return;

        const centerX = tile.pixelX + tileWidth / 2;
        const centerY = tile.pixelY + tileHeight / 2;

        const image = this.add.image(centerX, centerY, frame.textureKey, frame.frameKey);
        image.setDepth(columnRunDepths[row][col]);
      });
    });
  }

  /**
   * ySortLayerDatas(`_isYSortLayerName()`이 골라낸 모든 LayerData 배열) 전부를 겹쳐서, (row, col)마다
   * "이 칸에 어느 레이어든 타일이 하나라도 있는가"만 표시하는 하나의 boolean 격자를 만든다.
   * `_buildYSortColumnRunDepths`가 이 격자로 열(column) 단위 세로 연결 구간을 찾아 depth 그룹핑에
   * 쓴다 - 다른 오브젝트와 겹쳐도 시각적으로 하나처럼 보이면 같이 Y-정렬해야 하므로 레이어 구분 없이
   * 합쳐서 봐야 한다.
   */
  _buildYSortMergedOccupancy(ySortLayerDatas) {
    if (ySortLayerDatas.length === 0) return [];

    const rowCount = ySortLayerDatas[0].data.length;
    const colCount = ySortLayerDatas[0].data[0].length;
    const occupied = Array.from({ length: rowCount }, () => new Array(colCount).fill(false));

    ySortLayerDatas.forEach((layerData) => {
      layerData.data.forEach((rowTiles, row) => {
        rowTiles.forEach((tile, col) => {
          if (tile && tile.index !== -1) occupied[row][col] = true;
        });
      });
    });

    return occupied;
  }

  /**
   * mergedOccupancy(Y-정렬 대상 레이어를 합친 점유 격자)에서 "같은 열(column)에서 세로로 끊기지 않고
   * 이어진 구간"(vertical run)마다 하나의 depth를 공유하도록 만든다 - 그 구간의 가장 아래 행의 하단
   * y좌표를 쓴다.
   *
   * 처음에는 8방향으로 붙어있는 칸을 전부 하나로 묶는 플러드 필을 시도했으나, 이 맵의 Forest는 나무들이
   * 서로 옆으로 맞닿아 끊김 없이 이어진 하나의 큰 덩어리라(사용자가 사용하는 이 숲은 빈틈 없는 밀집
   * 지역), 8방향 플러드 필로는 숲 전체 1232개 타일이 통째로 하나의 컴포넌트가 되어버렸다 - 그러면 숲
   * 전체가 플레이어보다 계속 앞이거나 계속 뒤인 하나의 판板처럼 굳어버려서, 개별 나무를 오갈 때의
   * Y-정렬이 아예 없어지는 더 나쁜 결과였다(실측 확인: distinctDepthValues === 1).
   *
   * 그래서 옆 칸(가로)으로는 절대 묶지 않고, 정확히 같은 열에서 세로로만 끊김 없이 이어진 구간만 하나로
   * 묶는다. 오브젝트 하나가 여러 행에 걸쳐 있어도 "그 오브젝트가 서 있는 열"에서는 위아래가 끊기지 않고
   * 이어지므로 그 열 전체가 하나의 depth를 공유해 더 이상 중간에서 갈라지지 않으면서도, 옆 열(다른
   * x좌표)은 독립적으로 자기 자신의 구간·depth를 가지므로 전체가 하나로 얼어붙지도 않는다 - 플레이어가
   * 가로질러 걸으면 지나는 열마다 자연스럽게 앞/뒤가 바뀐다.
   */
  _buildYSortColumnRunDepths(mergedOccupancy) {
    const rowCount = mergedOccupancy.length;
    if (rowCount === 0) return [];
    const colCount = mergedOccupancy[0].length;
    const tileHeight = this.map.tileHeight;

    const runDepth = Array.from({ length: rowCount }, () => new Array(colCount).fill(0));

    for (let col = 0; col < colCount; col++) {
      let runStart = null;
      for (let row = 0; row <= rowCount; row++) {
        const occupied = row < rowCount && mergedOccupancy[row][col];
        if (occupied) {
          if (runStart === null) runStart = row;
          continue;
        }
        if (runStart === null) continue;

        const runEndRow = row - 1; // 이 구간의 마지막(가장 아래) 행
        const sharedDepth = (runEndRow + 1) * tileHeight;
        for (let r = runStart; r <= runEndRow; r++) runDepth[r][col] = sharedDepth;
        runStart = null;
      }
    }

    return runDepth;
  }

  /**
   * tileset(Phaser.Tilemaps.Tileset)의 globalTileIndex에 해당하는 텍스처 프레임을 찾아 반환한다.
   * `map.addTilesetImage()`로 불러온 타일셋 이미지는 타일맵 렌더러 전용 좌표만 갖고 있고 일반
   * Sprite/Image가 쓸 수 있는 개별 프레임으로는 안 잘려있어서, 필요한 타일마다 처음 한 번만
   * `Texture.add()`로 해당 타일의 사각형을 프레임으로 등록하고 이후에는 캐시해서 재사용한다.
   */
  _getOrCreateTileFrameKey(tileset, globalTileIndex) {
    const textureKey = tileset.image.key;
    const cacheKey = `${textureKey}:${globalTileIndex}`;
    const cached = this._ySortTileFrameCache.get(cacheKey);
    if (cached) return cached;

    const coords = tileset.getTileTextureCoordinates(globalTileIndex);
    if (!coords) return null;

    const frameKey = `ysort-tile-${cacheKey}`;
    const texture = this.textures.get(textureKey);
    if (!texture.has(frameKey)) {
      texture.add(frameKey, 0, coords.x, coords.y, tileset.tileWidth, tileset.tileHeight);
    }

    const result = { textureKey, frameKey };
    this._ySortTileFrameCache.set(cacheKey, result);
    return result;
  }

  _generatePlayerTexture() {
    if (this.textures.exists("tiled-test-player")) return;
    const g = this.add.graphics();
    g.fillStyle(0xffcc00, 1);
    g.fillCircle(12, 12, 12);
    g.generateTexture("tiled-test-player", 24, 24);
    g.destroy();
  }

  /** layerName의 tilemapLayer를 찾아 alpha를 targetAlpha로 부드럽게(300ms) 전환한다. */
  _tweenLayerAlpha(layerName, targetAlpha) {
    const layerData = this.map.getLayer(layerName);
    const tilemapLayer = layerData && layerData.tilemapLayer;
    if (!tilemapLayer) return;
    this.tweens.add({ targets: tilemapLayer, alpha: targetAlpha, duration: 300, ease: "Linear" });
  }

  /**
   * groupNameLower 그룹에 플레이어가 들어갔는지(isEntering)에 따라 그 그룹의 지붕/벽/문 레이어를
   * 페이드한다(들어가면 alpha 0=투명, 나가면 alpha 1=불투명). 어둠은 여기서 그룹별로 처리하지 않고,
   * `confirmedActiveRoofs` 전체를 보는 `_refreshDarknessOverlay()`가 담당한다(집이 여러 개여도 오버레이는
   * 하나뿐이라 매 전환마다 그 하나를 갱신하면 됨).
   */
  _fadeGroupLayers(groupNameLower, isEntering) {
    const hideOnEnterNames = this.hideOnEnterLayersByGroupName.get(groupNameLower);

    if (!hideOnEnterNames) {
      if (!this.warnedMissingGroups.has(groupNameLower)) {
        this.warnedMissingGroups.add(groupNameLower);
        // eslint-disable-next-line no-console
        console.warn(
          `[TiledMapTestScene] 트리거 그룹 이름("${groupNameLower}")과 일치하는 그룹 레이어를 찾지 못했습니다. ` +
            "Tiled에서 그룹 레이어 이름을 확인해주세요."
        );
      }
    } else {
      hideOnEnterNames.forEach((layerName) => this._tweenLayerAlpha(layerName, isEntering ? 0 : 1));
    }

    this._refreshDarknessOverlay();
  }

  /**
   * `confirmedActiveRoofs`(디바운스를 통과한, 지금 실제로 "안에 들어와 있는" 건물 그룹들)를 보고
   * 씬 전체 어둠 오버레이를 갱신한다:
   * - 활성 건물이 하나라도 있으면: 그 건물(들)의 footprint 사각형을 마스크 그래픽스에 다시 그려(구멍),
   *   오버레이 alpha를 1로 트윈. 마스크는 `invertAlpha`라 "그린 곳만 빼고" 검게 덮이므로, 그 건물 내부와
   *   플레이어는 그대로 보이고 나머지(다른 집 포함)는 전부 어둠에 묻힌다.
   * - 활성 건물이 없으면: 오버레이 alpha를 0으로 트윈. 마스크는 그대로 둔다(페이드 아웃되는 300ms 동안
   *   구멍이 유지돼야 내부가 갑자기 어두워지지 않음).
   *
   * 매 전환마다 호출되지만, 목표 alpha가 이미 같으면 트윈을 새로 시작하지 않는다.
   */
  _refreshDarknessOverlay() {
    if (!this.darknessOverlay) return;

    const activeRects = [];
    this.confirmedActiveRoofs.forEach((groupNameLower) => {
      const rects = this.buildingFootprintRects.get(groupNameLower);
      if (rects) activeRects.push(...rects);
    });
    const shouldShow = activeRects.length > 0;

    if (shouldShow) {
      this.darknessMaskGraphics.clear();
      this.darknessMaskGraphics.fillStyle(0xffffff, 1);
      activeRects.forEach((r) => this.darknessMaskGraphics.fillRect(r.x, r.y, r.width, r.height));
    }

    const targetAlpha = shouldShow ? 1 : 0;
    if (this._darknessTargetAlpha === targetAlpha) return;
    this._darknessTargetAlpha = targetAlpha;
    this.tweens.add({ targets: this.darknessOverlay, alpha: targetAlpha, duration: DARKNESS_FADE_MS, ease: "Linear" });
  }

  update(_time, delta) {
    if (!this.player) return;

    let vx = (this.keys.D.isDown ? 1 : 0) - (this.keys.A.isDown ? 1 : 0);
    let vy = (this.keys.S.isDown ? 1 : 0) - (this.keys.W.isDown ? 1 : 0);

    // 계단 존 위에 있으면 감속을 적용하고(모든 계단 공통), snap 타입("Stair")이면 추가로 입력을 계단
    // 기울기(dx, dy, 예: 2:1)로 강제한다. dx/dy가 ±1이 아닐 수 있어(완만한 비율) 값 자체가 아니라 부호만
    // 비교한다 - "전진" 축(오르는 방향) 쪽 키를 하나라도 누르면 완전한 대각선으로, "후진"(반대) 쪽 키를
    // 누르면 반대 대각선으로 강제한다. 그 외(무관한 조합, 정지)는 일반 이동 그대로 둔다. straight 타입
    // ("StairStraight")은 이미 입력 방향이 그림과 일치하므로 감속만 하고 vx/vy는 건드리지 않는다. 매
    // 프레임 직접 재계산하는 이유는 클래스 상단 create() 주석 참고(physics.add.overlap 콜백은 한
    // 프레임씩 걸러 호출돼 매 프레임 속도 제어에는 못 씀).
    const stairZone = this._findStairZoneForPlayer();
    if (stairZone && stairZone.snap) {
      const { dx, dy } = stairZone.direction;
      const matchesForward = (vx !== 0 && Math.sign(vx) === Math.sign(dx)) || (vy !== 0 && Math.sign(vy) === Math.sign(dy));
      const matchesBackward = (vx !== 0 && Math.sign(vx) === Math.sign(-dx)) || (vy !== 0 && Math.sign(vy) === Math.sign(-dy));
      if (matchesForward) {
        vx = dx;
        vy = dy;
      } else if (matchesBackward) {
        vx = -dx;
        vy = -dy;
      }
    }

    // 속도 우선순위: 계단 위에서는 Shift(달리기)를 누르고 있어도 STAIR_MOVE_SPEED로 고정한다(계단을
    // 뛰어오르는 연출은 의도한 게 아니므로) - 계단이 아닐 때만 Shift 여부로 평소/달리기 속도를 고른다.
    const len = Math.hypot(vx, vy) || 1;
    const moveSpeed = stairZone ? STAIR_MOVE_SPEED : this.keys.SHIFT.isDown ? RUN_MOVE_SPEED : MOVE_SPEED;
    this.player.setVelocity((vx / len) * moveSpeed, (vy / len) * moveSpeed);

    // Y-정렬 오브젝트(`_renderYSortLayerVisuals`가 만든 개별 이미지들)가 자신이 속한 컬럼 런의 y좌표를
    // depth로 쓰므로, 플레이어도 매 프레임 같은 좌표계(발밑 y좌표)로 depth를 갱신해야 표준 Y-정렬이
    // 성립한다 - 그래야 캐릭터가 오브젝트보다 위(화면상 아래)에 있으면 앞에, 오브젝트 위쪽(화면상 위)에
    // 있으면 뒤에 그려진다.
    this.player.setDepth(this.player.y + this.player.height / 2);

    // 문 존 판정: 계단과 마찬가지로 매 프레임 직접 사각형 검사(overlap 콜백 미사용, 이유는 클래스 상단
    // 계단 설명 참고). 존 안에 있을 때만 프롬프트를 띄운다 - 실제 상태 전환은 "keydown-E" 이벤트
    // 리스너(_handleDoorInteractKey, create() 참고)가 담당한다.
    const doorZone = this._findDoorZoneForPlayer();
    if (doorZone) {
      this.doorPromptText.setText(doorZone.state === "open" ? "[E] 문 닫기" : "[E] 문 열기");
      this.doorPromptText.setPosition((doorZone.x0 + doorZone.x1) / 2, doorZone.y0 - 10).setVisible(true);
    } else {
      this.doorPromptText.setVisible(false);
    }
    this._updateDoors(delta);

    // Arcade Physics의 물리 스텝(preupdate)이 이 update()보다 먼저 실행되므로, overlap 콜백은
    // 이번 프레임 몫을 currentActiveRoofs에 이미 다 채워 놓은 상태다.

    // raw 상태(currentActiveRoofs)와 확정 상태(confirmedActiveRoofs)가 다른 그룹만 후보로 추적한다.
    const namesToCheck = new Set([...this.currentActiveRoofs, ...this.confirmedActiveRoofs]);
    namesToCheck.forEach((name) => {
      const rawActive = this.currentActiveRoofs.has(name);
      const confirmed = this.confirmedActiveRoofs.has(name);

      if (rawActive === confirmed) {
        // raw가 확정 상태로 되돌아왔으면 대기 중이던 후보 전환은 취소.
        this.pendingTransitions.delete(name);
        return;
      }

      const pending = this.pendingTransitions.get(name);
      const streak = pending && pending.toActive === rawActive ? pending.streak + 1 : 1;
      this.pendingTransitions.set(name, { toActive: rawActive, streak });

      if (streak < ACTIVE_STATE_DEBOUNCE_FRAMES) return;

      // 같은 방향으로 충분히 연속됐으니 실제로 확정하고 페이드를 커밋한다.
      if (rawActive) {
        this.confirmedActiveRoofs.add(name);
      } else {
        this.confirmedActiveRoofs.delete(name);
      }
      this._fadeGroupLayers(name, rawActive);
      this.pendingTransitions.delete(name);
    });

    this.debugText.setText(
      `pos: (${Math.round(this.player.x)}, ${Math.round(this.player.y)})  ` +
        `roof-active: [${[...this.confirmedActiveRoofs].join(", ")}]  fps: ${Math.round(1000 / delta)}`
    );

    // 다음 프레임을 위해 raw 바구니를 비운다 (overlap 콜백이 다음 물리 스텝에서 다시 채워준다).
    this.currentActiveRoofs.clear();
  }
}
