# Village Simulation Frontend

React + Phaser 3 기반 2D 마을 시뮬레이션 클라이언트. 백엔드(`../Backend`)와 통신하여 NPC 대화, 루틴 이동,
은신/엿듣기, 전투, 상점/채집, 시간 흐름을 렌더링한다.

## 실행 방법

```bash
npm install
cp .env.example .env      # VITE_API_BASE_URL이 백엔드 주소와 다르면 수정
npm run dev
```

백엔드가 `http://127.0.0.1:8000` 에서 먼저 실행 중이어야 한다 (`../Backend/README.md` 참고).

## 폴더 구조

```
src/
  api/client.js          # 백엔드 REST 클라이언트
  game/
    config.js             # Phaser 게임 config (arcade physics + phaser-raycaster 플러그인 등록)
    eventBus.js            # Phaser <-> React 통신 채널 (Phaser.Events.EventEmitter)
    drunkText.js            # 취기에 따른 채팅 텍스트 왜곡 유틸
    map/mapData.js         # 타일 크기/맵 크기/건물·집 좌표 (백엔드 world_layout.py와 값 동기화 필요)
    scenes/
      BootScene.js          # 절차적 placeholder 텍스처 생성 (실제 아트 로딩으로 교체할 지점)
      MainScene.js          # 맵/플레이어/NPC/상호작용/은신/전투/시간 시스템 총괄
    entities/
      Player.js             # WASD 이동, 은신 시 반투명 처리
      NPC.js                 # 루틴(JSON 시간표)을 따라 이동 + 질병/경계 상태 아이콘
    systems/
      TimeSystem.js          # 게임 시계, 기절(pass-out) 트리거
      InteractionSystem.js   # E키 상호작용 타겟팅 우선순위(가장 가까운 정면 대상)
      StealthSystem.js       # 수풀(HIDDEN) 판정 + NPC 시야각/LOS 기반 은신/목격 판정
      Pathfinder.js           # easystarjs 기반 A* 경로 탐색
  components/
    GameCanvas.jsx          # Phaser.Game 마운트
    HUD.jsx                  # 날짜/시간/날씨/유저 스탯 표시 + 취침/시간건너뛰기 버튼
    ChatBox.jsx               # NPC와의 자유 텍스트 대화 + 선물 버튼
    Inventory.jsx             # 소지품(I키) - 도구/무기 장착, 소비 아이템 사용
    FacilityModal.jsx         # 상점 구매/판매, 채집, 도박, 숨겨진 시설 진입
    EavesdropModal.jsx        # 은신 상태에서 엿듣기 결과 표시
    LoadingOverlay.jsx        # 성찰/루틴 갱신(밤 사이클) 동안의 로딩 연출
```

## 조작법

| 키 | 동작 |
| --- | --- |
| `W`/`A`/`S`/`D` | 이동 |
| `E` | 정면의 가장 가까운 NPC와 대화 / 시설 상호작용 / 엿듣기 |
| `I` | 소지품(인벤토리) 열기·닫기 |
| `K` | 정면(또는 사거리 내) NPC 공격 |
| `H` | 게임 시간 1시간 건너뛰기 |

수풀 타일에 들어가면 자동으로 은신을 시도한다 (근처 NPC의 시야각 + 벽 차폐 여부로 성공/실패 판정).
HUD의 "🛏 취침" 버튼은 전체 NPC 성찰/루틴 재계획을 트리거하고 다음 날 아침으로 전환하며,
기력이 0이 되거나 새벽 2시(기본값)까지 취침하지 않으면 자동으로 기절(pass-out) 처리된다.

---

## 🎨 커스터마이징 가이드

이 스캐폴드는 **디자인 리소스 없이 즉시 실행**되도록 `BootScene.js`가 코드로 절차적 placeholder
텍스처(색상 사각형/원/문/바닥)를 그려서 쓰고, 맵도 Tiled 파일 없이 `mapData.js`가 런타임에 생성한다.
아래는 각 영역을 실제 리소스로 교체할 때의 절차다.

### 1. 실제 맵으로 교체하기 (좌표/크기가 전부 바뀔 때)

좌표 체계의 원본은 **두 파일에 동시에** 존재하며 반드시 값이 일치해야 한다 (언어가 달라 import 공유 불가):

- `Frontend/src/game/map/mapData.js` — 프론트 렌더링/충돌/경로탐색용
- `Backend/app/world_layout.py` — NPC 홈/일터 좌표, 시설 접근 판정용

두 파일 다음 항목들이 **1:1로 대응**해야 한다:

| 항목 | mapData.js | world_layout.py |
| --- | --- | --- |
| 타일 크기 | `TILE_SIZE` | `TILE_SIZE` |
| 맵 크기 | `MAP_COLS`, `MAP_ROWS` | `MAP_COLS`, `MAP_ROWS` |
| 건물 좌상단 좌표 | `BUILDINGS_ANCHOR` | `BUILDINGS_ANCHOR` |
| 열린 마커(광장/묘지/숲/광산) | `OPEN_MARKERS` | `OPEN_MARKERS` |
| NPC 집 좌표 | `HOME_TILES` | `HOME_TILES` |
| 유저 스폰 좌표 | `PLAYER_HOME_TILE` | `PLAYER_HOME_TILE` |

**절차:**

1. **맵 디자인 확정**: 새 맵의 타일 크기, 전체 크기(열/행), 각 건물(술집/상점/식당A·B/대장간/목공소/병원/
   경찰서)의 좌상단 좌표와 크기, 그리고 광장/묘지/숲/광산/각 NPC 집 좌표를 정한다.
2. **두 파일의 좌표 상수를 동시에 수정**한다 (위 표의 6개 항목). 값이 어긋나면 NPC가 도달 불가능한
   좌표로 출근하거나(길찾기 실패로 제자리에 멈춤), 시설 라벨과 실제 건물 위치가 어긋난다.
3. **Tiled 등으로 실제 타일맵을 만든 경우** (placeholder 그래픽 대신 진짜 그림을 쓰고 싶다면):
   - 맵 JSON + 타일셋 이미지를 `public/`에 넣는다.
   - `BootScene.js`의 `_generateTileset()` 호출을 지우고, `preload()`에서
     `this.load.tilemapTiledJSON('villageMap', '/village.json'); this.load.image('tiles', '/tileset.png');`
     로 교체한다.
   - `MainScene.js`의 `_buildMap()`에서 `buildTileGrid()` 기반 런타임 생성 대신
     `this.make.tilemap({ key: 'villageMap' })` → `map.addTilesetImage(...)` → `map.createLayer(...)`
     로 교체하고, 벽에 해당하는 타일에 `layer.setCollisionByProperty({ collides: true })`(또는
     타일 인덱스 목록)를 적용한다.
   - 건물의 "문(walkable)"과 "벽(blocked)" 구분은 Tiled 쪽 타일 속성으로 대체되므로,
     `mapData.js`의 `TILE.DOOR`/`TILE.INTERIOR` 개념은 시각적으로는 더 이상 필요 없어진다. 다만
     `BUILDINGS_ANCHOR`/`buildingDoorTile()`가 계산해주는 "문 앞 좌표"는 **시설 상호작용 판정
     기준점**으로 계속 쓰이므로, 새 맵에서 각 건물의 문 위치에 맞는 타일 좌표로 반드시 갱신해야 한다.
4. `Backend/village.db`를 삭제하고 서버를 재시작한다 (NPC 홈/일터가 새 좌표로 다시 시드된다).

### 2. NPC / 유저 캐릭터 스프라이트 교체

현재 `BootScene._generateCharacterTextures()`가 Phaser Graphics로 원(플레이어)/둥근 사각형(NPC)을
그려서 각각 `player-tex`, `npc-tex` 텍스처 키로 등록한다. `NPC.js`는 `JOB_COLORS`로 직업별 색깔만
`setTint()`로 입혀서 구분한다.

**실제 스프라이트(예: Universal LPC Spritesheet Generator 결과물)로 교체하려면:**

1. `BootScene.js`의 `_generateCharacterTextures()` 호출을 지운다.
2. `preload()`에서 스프라이트 시트를 로드한다:
   ```js
   this.load.spritesheet('player-tex', '/assets/player.png', { frameWidth: 32, frameHeight: 32 });
   this.load.spritesheet('npc-tex', '/assets/npc-generic.png', { frameWidth: 32, frameHeight: 32 });
   ```
   텍스처 키 이름(`player-tex`, `npc-tex`)만 유지하면 `Player.js`/`NPC.js`를 고칠 필요가 없다.
3. **NPC마다 다른 외형**을 쓰고 싶다면 (예: 대장장이는 앞치마, 의사는 가운):
   - `BootScene`에서 직업별로 여러 스프라이트 시트를 각각 다른 키로 로드 (`npc-tex-blacksmith` 등).
   - `NPC.js` 생성자에서 `data.job`에 따라 텍스처 키를 선택하도록 `super(scene, x, y, textureKeyFor(data.job))`
     로 수정하고, 더 이상 필요 없어진 `setTint(JOB_COLORS[...])` 호출은 제거한다.

### 3. 행동 별 애니메이션 적용하기

**현재 상태(중요): 백엔드가 이미 애니메이션 상태값을 만들어서 보내주고 있지만, 프론트엔드가 아직
그것을 재생하지 않는다.** `POST /chat`, `/chat/gift` 응답의 `action` 객체에는 다음 필드가 항상 들어있다
(`Backend/app/schemas/chat.py`의 `NPCAction`):

- `animation_state`: `IDLE | WALK | BACKSTEP | DANCE | SCARED_IDLE | ATTACK`
- `emotion`: `NEUTRAL | HAPPY | SURPRISED | ANGRY | SAD` (이건 이미 이모지로 사용 중)
- `movement_x`, `movement_y`: 뒷걸음질 등에 쓸 이동량

지금은 `ChatBox.jsx`의 `send()`/`sendGift()`가 `dialog`, `emotion`만 꺼내 `NPC_SPOKE` 이벤트로 넘기고
`animation_state`/`movement_x`/`movement_y`는 버려진다. 실제로 재생하려면:

1. 실제 스프라이트 시트에 애니메이션 프레임이 준비되면, `BootScene.create()`에서 상태별 애니메이션을
   등록한다:
   ```js
   this.anims.create({ key: 'npc-dance', frames: this.anims.generateFrameNumbers('npc-tex', { start: 8, end: 11 }), frameRate: 6, repeat: -1 });
   // IDLE / WALK / BACKSTEP / SCARED_IDLE / ATTACK 도 동일하게 등록
   ```
2. `ChatBox.jsx`에서 `NPC_SPOKE` emit 시 `animation_state`, `movement_x`, `movement_y`도 함께 실어 보낸다.
3. `MainScene.js`의 `NPC_SPOKE` 리스너(또는 `_showSpeechBubble` 옆에 새 메서드)에서
   `npc.play(\`npc-${action.animation_state.toLowerCase()}\`)` 를 호출하고, `movement_x/y`가 있으면
   `this.tweens.add({ targets: npc, x: npc.x + movement_x, y: npc.y + movement_y, duration: 300 })`
   같은 트윈으로 뒷걸음질 등을 표현한다.
4. NPC-NPC 우연한 마주침 대사(`_triggerNpcEncounter`)는 현재 감정을 항상 `"NEUTRAL"`로 고정해 두었는데,
   `POST /npc-encounter/dialogue` 응답에 감정/애니메이션 필드를 추가하고 싶다면
   `Backend/app/schemas/encounter.py`의 `EavesdropLine`에 필드를 추가하고 프롬프트도 그에 맞게 수정해야 한다.

### 4. 공격 스프라이트/이펙트 적용하기

**현재 상태: `K`키 공격은 순수하게 API 호출 + 말풍선 텍스트뿐이고, 시각 효과가 전혀 없다**
(`MainScene._handleAttackKey()` 참고). 스윙 모션도, 피격 이펙트도 없는 상태다.

추가하려면:

1. 플레이어 스프라이트에 "공격" 애니메이션(또는 무기를 든 오버레이 스프라이트)을 준비하고
   `BootScene`에서 애니메이션으로 등록한다.
2. `MainScene._handleAttackKey()`에서 `target`을 찾은 직후, API 응답을 기다리기 전에
   `this.player.play('attack')`을 먼저 재생해 즉각적인 타격감을 준다.
3. 피격 이펙트는 결과를 받은 뒤 간단히 다음과 같이 넣을 수 있다:
   ```js
   target.setTintFill(0xff4444);
   this.time.delayedCall(120, () => target.clearTint());
   ```
4. **장착 무기별로 다른 연출**을 주고 싶다면, HUD가 폴링하는 유저 상태(`STATS_UPDATE` 이벤트 payload의
   `equipped_weapon`)를 `MainScene`에서도 구독해 두었다가, 맨손/검 등 무기 종류에 따라 다른 애니메이션
   키를 선택하면 된다.

### 5. NPC 성격/능력치/세계 좌표 조정하기

전부 백엔드 쪽 설정이다 — 자세한 내용과 절차는 `../Backend/README.md`의
**"NPC 성격/게임 밸런스 조정하기"** 섹션을 참고할 것.

### 6. 그 외 자주 손보게 되는 프론트 상수

| 위치 | 내용 |
| --- | --- |
| `src/game/systems/StealthSystem.js` 상단 `VIEW_DISTANCE`, `FOV_HALF_ANGLE_RAD` | NPC 시야 범위/시야각 |
| `src/game/scenes/MainScene.js` 상단 `const` 목록 | 상호작용/공격/엿듣기/NPC 마주침 거리, 쿨다운, 스탯 틱 주기 등 |
| `src/game/systems/TimeSystem.js` 생성자 기본값 | 시간 배속·기절 시각의 프론트 측 기본값 (실제로는 백엔드 `GameConfig`가 우선 적용됨) |
| `src/components/Inventory.jsx`의 `TOOL_ITEMS`/`WEAPON_ITEMS`/`CONSUMABLE_ITEMS` | 새 아이템을 카탈로그에 추가하면 여기에도 이름을 등록해야 장착/사용 버튼이 뜬다 |

---

## 알려진 미구현/단순화 지점

- **애니메이션 미재생**: 위 3, 4번 항목 그대로 — `animation_state`/`movement_x`/`movement_y`는 데이터로는
  이미 오가지만 실제 스프라이트 애니메이션으로 이어지지 않는다. 공격도 시각 효과가 없다.
- **딴청 피우기(벤치 앉기 등으로 NPC 경계 낮추기)** 연출 없음.
- **NPC 사망 후 직업 계승(공석을 다른 NPC가 메꾸는 시스템)** 없음.
- **실제 아트/Tiled 맵**: 여전히 색깔 도형 + 절차적 타일 placeholder.
- `phaser-raycaster` 플러그인은 game config에 등록만 해 두었고, 실제 은신/목격 판정은 자체 LOS 계산
  (`StealthSystem`)을 사용한다.
