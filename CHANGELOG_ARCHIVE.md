# CHANGELOG_ARCHIVE — Village Simulation (상세 변경 이력 아카이브)

> 이 파일은 `PROJECT_STATUS.md`의 부속 아카이브다. `PROJECT_STATUS.md`가 "지금 상태"를 담은 스냅샷이라면,
> 이 파일은 "그 상태가 어떻게 만들어졌는지"에 대한 시간순 기록(로그)이다. `PROJECT_STATUS.md`가 단일
> `Read` 호출 한도(약 25,000토큰)를 넘어서기 시작해, 그 안에 있던 "겪었던 버그 1~6" 상세 서술과
> "변경 이력(Changelog)" 전체를 이 파일로 옮기며 신설되었다. **내용은 한 글자도 빠짐없이 그대로 옮긴
> 것이며, 삭제되거나 요약된 것은 없다** — `PROJECT_STATUS.md` 쪽에는 짧은 결론 요약 + 이 파일을
> 가리키는 링크만 남겨뒀다.

## 이 파일을 읽는 요령 (Claude 세션 필독)

- **이 파일은 처음부터 끝까지 순서대로 다 읽으려고 하지 말 것.** `PROJECT_STATUS.md`와 반대로, 이
  파일은 일부러 25,000 토큰(단일 `Read` 호출 한도)을 넘겨도 괜찮게 설계됐다 — 코드가 진행될수록
  계속 append만 되며 무한정 자랄 아카이브이기 때문이다. 매 세션 전체를 읽어야 하는 문서는
  `PROJECT_STATUS.md` 하나뿐이고, 이 파일은 **필요할 때만 검색해서 찾아보는 용도**다.
- **찾는 법**: 아래 "목차(색인)"에서 날짜/키워드로 원하는 항목을 먼저 찾은 뒤, `Grep`으로 그 날짜
  문자열(예: `2026-07-24`)이나 항목 제목 일부, 또는 `버그 4`처럼 언급된 라벨을 검색해서 해당 위치로
  바로 이동할 것. `Read`로 앞에서부터 스크롤하며 찾을 필요 없다. 파일이 25,000토큰을 넘어 한 번에
  안 읽히더라도 정상이니 당황하지 말 것 — `offset`을 그 위치 근처로 지정해서 필요한 부분만 읽으면 된다.
- **정렬 순서**: "변경 이력" 섹션은 최신이 위, 과거가 아래로 가는 역순 정렬이다(새 항목은 항상 그
  섹션 맨 위에 추가된다). "상세 버그 진단 기록"은 버그 번호 오름차순이며 발생/발견 순서와 대략 일치한다.
- **상호 참조**: 여러 항목이 "버그 4", "버그 5" 처럼 서로를 번호로 가리킨다. 이 라벨들은 모두 아래
  "상세 버그 진단 기록" 섹션에서 정의된다 — `Grep`으로 `버그 4`를 검색하면 정의부와 그걸 언급하는
  모든 변경 이력 항목을 한 번에 찾을 수 있다.
- **이 파일이 필요 없는 경우**: 새 기능을 짜기 위해 "지금 이 메커니즘이 어떻게 동작하는가"만 알면
  될 때는 이 파일이 필요 없다 — `PROJECT_STATUS.md`의 "핵심 구조 요약"/"구현 스펙 원문" 섹션이 이미
  현재 결론만 정리해둔 상태다. 이 파일은 ① 비슷한 버그를 이미 겪었는지 확인하고 싶을 때, ② 특정
  코드가 왜 이렇게 생겼는지 그 경위가 궁금할 때만 검색해서 보면 된다.

## 목차 (날짜/주제 색인 — 이 리스트만 훑어보고 Grep으로 이동할 것)

**상세 버그 진단 기록**
- 버그 1 — 그룹 레이어 이름 불일치(`Mine` vs `Cave`)로 지붕 페이드 무반응
- 버그 2 — RoofTrigger 사각형 사이 틈으로 인한 깜빡임 (1차 수정, 이후 버그 4/5로 대체됨)
- 버그 3 — 대용량 맵 JSON 붙여넣기가 `Write` 도구에서 잘림
- 버그 4 — 그룹 자식 레이어 이름 평탄화 문제로 지붕 페이드가 한 번도 실행 안 됨
- 버그 5 — RoofTrigger 사각형이 지붕 타일 범위를 다 못 덮는 진짜 구멍
- 버그 6 — 트리거 패딩 8px가 너무 넓어 벽에 스치기만 해도 오작동

**변경 이력 (최신 → 과거)**
- 2026-08-31 — 순수 `WInteriors`(방 뒤 벽)를 STRUCTURE_ALWAYS_ON_TOP_DEPTH 대상에서 제외(정규식 `\d*`→`\d+`) → 맵 레이어 순서대로 Rugs/Interiors 밑에 그려짐 ("WInteriors가 Interiors보다 위" 피드백)
- 2026-08-31 — 어둠 마스크 구멍을 `Floors`만 → `Floors` + 페이드 안 되는 레이어(WInteriors/Interiors/Rugs) 합집합으로 확대 (방 바깥줄 "안에서 본 벽"이 어둠에 잘리던 문제)
- 2026-08-31 — 실내/실외 판정을 `Floors` 타일 레이어 하나로 전면 단순화(그날 앞서 만든 처마 클리핑 + doorwayRect 동적 문 판정 전부 삭제). 그룹에 `Floors` 있으면 fade-building, 그 채워진 칸 위 = 실내
- 2026-08-31 — 지붕/문 "안에 들어옴" 트리거 재설계: 처마(벽 밖 지붕) 제외 + 문 칸은 doorwayRect + 문 상태 동적 판정 [같은 날 위 `Floors` 방식으로 대체 — 원인 진단만 참고]
- 2026-08-31 — untitled.tmx 대규모 재re-export: 타일셋 43→63, 레이어 그룹 재편(House1~6/Roads/Graveyard/Plaza), House 그룹 Roofs 재추가, 문 96×64(가운데 열만 애니메이션), Roads 발전(기금) 기획 문서화. 코드 변경은 타일셋 매니페스트 20줄뿐
- 2026-08-27 — untitled.tmx 재re-export: House2 그룹 신설(코드 변경 없이 자동 처리) + House1/Cave Darkness 레이어 삭제 완료
- 2026-08-27 — 어둠(Darkness)을 건물별 타일 레이어 → 씬 전체 오버레이 + 반전 geometry mask로 전환(집 여러 개일 때 depth 순서로 다른 집이 어둠 위로 삐져나오는 문제)
- 2026-08-27 — 문 밖에서 밀기만 해도 내부가 드러나던 버그 수정: 문 칸은 닫힌 문 충돌 영역을 뺀 "안쪽 ¾"만 트리거(_addDoorInteriorTriggerZones, 하루 3번 시도 끝)
- 2026-08-25 — untitled.tmx 재re-export #2(같은 날 두 번째, House1/Darkness 소폭 변경만, 코드 변경 없음)
- 2026-08-25 — untitled.tmx 재re-export(House1 인테리어 확장: WInteriors→WInteriors+WInteriors2+Rugs
  분리, Roofs 레이어 삭제) + 문/WInteriors 연동 코드가 WInteriors2도 인식하도록 정규식 확장
- 2026-08-24 — `PROJECT_STATUS.md`가 25,000토큰 예산을 초과해 non-기획개요 섹션 트리밍(버그 요약/
  구현 스펙 중복 서술/확인 필요 해결 항목/실전 주의사항 압축, 내용 손실 없이 아카이브 참조로 대체)
- 2026-08-24 — 퀘스트 시스템/조작법 UI/채집물 판매·구매처 매핑/NPC 최초 만남 처리를 기획 개요에 추가
  (전부 미구현, 코드 변경 없음)
- 2026-08-24 — 곡괭이/도끼/괭이/낚싯대 최초 구매처를 대장장이 NPC로 확정(기획 세부 확정, 코드 변경 없음)
- 2026-08-24 — 낚시/농사/장비 강화/인테리어/평판/마을 발전/야간 이벤트 신규 기획 아이디어를
  `PROJECT_STATUS.md` "게임 기획 개요"에 추가(전부 미구현, 코드 변경 없음)
- 2026-08-24 — 문(Doors)도 벽처럼 페이드 + WInteriors 안쪽 문 타일 애니메이션 연동 + 문 충돌을 벽
  두께만큼 얇게 유도
- 2026-08-24 — untitled.tmx → village.json 재export + TopDownHouse_FloorsAndWalls 타일셋 재동기화
- 2026-08-11 — 그림판으로 수정한 타일셋 원본이 웹에 반영 안 되던 문제 → public/tilesets/ 전체 재동기화
- 2026-08-11 — House1 문 왼쪽 칸 빈 프레임 문제 진단 + houseDoors 가로반전으로 대칭 더블도어 완성
- 2026-08-11 — 문 개폐 애니메이션 상호작용 구현 + 첫 번째 실제 건물 House1 통합
- 2026-08-09 — 기본/계단 이동 속도 재조정 (220/150)
- 2026-08-09 — 이동 속도 체계 정리: 기본/계단/달리기 3단 분리
- 2026-08-09 — StairStraight 추가: 세로/가로 계단은 대각선 스냅 없이 감속만
- 2026-08-09 — 계단 오브젝트 레이어 추가 + 대각선 스냅 이동 기능 구현
- 2026-08-06 — 이동 속도/카메라 줌/시작 좌표 조정 + 디버그 HUD 줌 버그 수정
- 2026-08-06 — 네 번째 맵 재export: 맵 크기 축소 + Y-정렬 메커니즘 범용화
- 2026-08-06 — 세 번째 맵 재export + Tree1~12 전체 확장/CollisionLayer 대량 추가분 검증
- 2026-07-27 — 두 번째 맵 재export + Forest 확장/CollisionLayer 추가분 검증
- 2026-07-27 — CollisionLayer가 Tile Collision Editor 사각형을 무시하고 타일 전체를 막던 버그 수정
- 2026-07-27 — 맵 재export + Forest 밑둥 충돌 방식을 자동 계산 → CollisionLayer 수동 배치로 교체
- 2026-07-24 — 나무 밑둥 히트박스: 병합 대신 대표 사각형 선택으로 교체
- 2026-07-24 — 나무 밑둥 히트박스 개수 축소 (병합 후처리)
- 2026-07-24 — 나무 밑둥 히트박스 판정 방식 재교정
- 2026-07-24 — 나무 depth 그룹핑 교정
- 2026-07-24 — 밑둥 히트박스 재작성
- 2026-07-24 — 사용자 요청 3가지 처리 (Forest 그룹 도입 + Tree1~12 개별 오브젝트 변환/Y-정렬 도입 + 밑둥 히트박스)
- 2026-07-22 — 재export: `town_doortransparent` 타일셋 추가
- 2026-07-22 — 캐릭터/WInteriors 등 depth 정렬 버그 수정 (`PLAYER_DEPTH` 도입)
- 2026-07-22 — 재export: Cave Roof+Wall 유니온 타일 293개로 감소
- 2026-07-22 — Interiors 충돌이 타일 전체(32x32)로 막히던 버그 → 정밀 히트박스 존으로 교체
- 2026-07-22 — 재export: Darkness/WInteriors/CollisionLayer 3개 레이어 추가 + Interiors 충돌 활성화
- 2026-07-21 — 재export: CollisionObjects 오브젝트그룹 추가(미사용)
- 2026-07-21 — "여전히 벽에 붙으면 트리거" 재보고 → PADDING -4로 전환
- 2026-07-21 — "여전히 반투명하게 보임" 재보고 → PADDING 8→2 + 디바운스 도입
- 2026-07-21 — roof-active 반투명 이슈 재보고 → Walls도 페이드 대상에 포함
- 2026-07-21 — 재export: 깜빡임 재검증 (재보고 시점은 하드 리프레시 전이었던 것으로 추정)
- 2026-07-21 — 버그 4/5 발견 및 수정 (그룹 레이어 평탄화, RoofTrigger 구멍)
- 2026-07-21 — 재export: Cave 그룹/RoofTrigger 15개 유지 확인
- 2026-07-21 — Set-diff 패턴 도입 + Arcade Physics 정적 존/overlap으로 재작성 (정적 검증만, 버그 2로 이어짐)
- 2026-07-21 — Mine→Cave 그룹 레이어명 수정 반영 (버그 3의 파일 손상 복구 포함)
- 2026-07-21 — `PROJECT_STATUS.md` 최초 생성

---

## 상세 버그 진단 기록 (버그 1~6)

> 원래 `PROJECT_STATUS.md`의 Frontend 섹션에 있던, Tiled 지붕/벽 페이드 트리거 관련 상세 버그 진단
> 기록이다. `PROJECT_STATUS.md`가 파일 길이 한도를 넘어 이 파일로 옮겨졌다(원문 그대로, 요약/삭제 없음).

#### 🐛 겪었던 버그 1: 그룹 레이어 이름 불일치 (해결됨)
Tiled에서 맵을 처음 만들 때 그룹 레이어 이름이 `Mine`이었는데 RoofTrigger 오브젝트의 `Name`은 `Cave`로
되어 있어서, 오버랩 감지(`roof-active: [cave]`)는 정상 작동했지만 실제 지붕 alpha 페이드는 **조용히
아무 반응 없이** 무시됐다 (코드 버그 아님 — 데이터 쪽 이름 불일치였고, 콘솔 경고로 정확히 진단 가능했음).
사용자가 Tiled에서 그룹 레이어 이름을 `Cave`로 바꿔 다시 export → **`public/maps/village.json`에 반영
완료, 해결됨** (아래 버그 3의 파일 손상 이슈를 거쳐 최종적으로 정확히 반영됨. `json.load` 재검증 + 파일
크기 632566바이트 일치까지 확인됨).
**교훈**: 지붕 페이드가 콘솔 경고 없이 "아무 반응이 없다"면 십중팔구 그룹 레이어 이름과 RoofTrigger
`Name` 불일치 문제이니 가장 먼저 확인할 것.

#### 🐛 겪었던 버그 2: RoofTrigger 사각형 사이 틈으로 인한 깜빡임 (1차 수정, 브라우저 검증 없이 "완료" 오기재했었음 — 실제로는 아래 버그 4/5로 이어짐)
사용자가 "roof-active가 계속 깜빡거리면서 투명해지지도 않는다, Cave 트리거 사각형이 하나라도 닿으면
투명해지는 로직으로 해달라"고 참고 코드(`currentActiveRoofs`/`previousActiveRoofs` Set-diff 패턴)와 함께
요청. `village.json`의 실제 RoofTrigger 좌표를 직접 계산해본 결과, 이어붙인 사각형들 사이에 실측 약
1.7~3.1px짜리 진짜 빈틈이 있었고, 플레이어가 그 틈을 지나는 프레임엔 겹치는 존이 하나도 없어 깜빡였던
것으로 진단됨 (Set-diff 로직 자체의 버그가 아니었음).
**당시 수정 내용**: 수동 사각형 교차 → Arcade Physics 정적 존 + overlap으로 교체, 존을
`ROOF_TRIGGER_ZONE_PADDING = 8`px씩 부풀림, `currentActiveRoofs`/`previousActiveRoofs` Set-diff 패턴 적용.
**이 항목은 최종적으로 버그 5의 타일 기반 재작성으로 대체됨** — 아래 "버그 4", "버그 5" 참고.

#### 🐛 겪었던 버그 3: 대용량 맵 JSON 붙여넣기가 Write 도구에서 잘림 (해결됨, 재발 시 대처법 기록)
사용자가 붙여넣은 632KB짜리 맵 JSON(그룹명 `Cave`로 수정된 버전)을 `Write` 도구로 그대로 저장하려 했더니,
결과물 크기 제한 때문에 레이어 6개 중 1개, 타일셋 30개 중 1개만 남고 나머지가 통째로 잘려나가는 손실이
있었다 (스스로 발견, 사용자에게 보고하기 전에 수정함).
**해결 방법**: Claude Code가 세션 대화를 그대로 저장해두는 JSONL 트랜스크립트 파일
(`C:/Users/<user>/.claude/projects/<project-slug>/<session-id>.jsonl`)에서, 사용자가 붙여넣은 첨부파일이
`type: "document"`, `source.data`에 원본 텍스트 그대로 들어있는 content block으로 남아있다는 점을 이용해
Python으로 JSONL을 파싱 → 정확한 원본 텍스트를 추출 → 그 문자열을 그대로 파일에 씀 → `json.load`로
구조/크기 재검증.
**교훈**: 앞으로도 수백 KB급 이상 텍스트를 붙여넣기로 받아 그대로 파일에 써야 할 때는, 한 번의 거대한
`Write` 호출 결과가 잘리지 않았는지 반드시 재확인할 것 (파일 크기, 최상위 키/레이어/타일셋 개수 등을
원본과 대조). 잘렸다면 위 세션 트랜스크립트 추출 방식으로 원본을 복구할 수 있다.

#### 🐛 겪었던 버그 4: 그룹 자식 레이어 이름 평탄화 문제로 지붕 페이드가 "한 번도" 실행 안 됨 (해결됨, 이번 라운드에서 새로 발견)
untitled.tmx를 재export해 맵을 새로 바꾼 뒤에도 사용자가 "여전히 깜빡인다"고 보고. Playwright로
`window.__roofDebugScene`(임시 디버그 훅) 통해 씬 내부를 직접 조회한 결과, `scene.map.getLayer("Roofs")`가
**항상 `null`을 반환**하고 있었다. 원인: Phaser가 그룹 레이어 안의 자식 타일레이어를 `this.map.layers`/
`getLayer()`에 평탄화할 때 이름을 raw JSON 그대로("Roofs")가 아니라 `"부모그룹이름/자식이름"`
(`"Cave/Roofs"`) 형태로 바꿔서 저장한다. 그런데 `_buildGroupRoofMap`이 `roofLayersByGroupName`에
raw 이름("Roofs")을 그대로 저장해 두고 있었어서, `_fadeRoof`의 `this.map.getLayer(layerName)` 호출이
매번 `null`을 반환 → `tilemapLayer`가 `undefined` → **경고조차 없이 조용히 아무 것도 안 하고 return**
(버그 1의 이름 불일치와 달리 이건 아예 콘솔 경고 코드 경로를 안 타서 더 발견하기 어려웠음). 즉 이
씬이 만들어진 이래로 지붕 alpha 페이드 자체가 단 한 번도 실행된 적이 없었다.
**수정**: `_buildGroupRoofMap`(`src/game/scenes/TiledMapTestScene.js`)이 재귀하면서 부모 그룹 경로를
누적해 Phaser와 동일한 평탄화 이름(`"Cave/Roofs"`)을 만들어 저장하도록 변경.
**교훈**: 그룹 레이어를 쓰는 Tiled 맵에서 `Tilemap.getLayer(name)`/`Tilemap.layers`를 쓸 때는 항상
`"그룹이름/자식이름"` 형태의 평탄화된 이름을 써야 한다. raw JSON의 자식 레이어 이름만 쓰면 조용히
`null`을 반환하며, 이 실패 경로엔 경고 로그가 없어서 매우 눈에 띄기 어렵다.

#### 🐛 겪었던 버그 5: RoofTrigger 사각형이 지붕 타일 범위를 다 못 덮는 진짜 구멍 (해결됨 — 손으로 그린 트리거를 아예 없앰)
버그 4를 고친 뒤에도 여전히 깜빡일 수 있는 지 확인하려고, `village.json`의 실제 `Roofs` 타일 레이어
데이터(150x150)와 `RoofTrigger` 오브젝트 15개의 좌표를 Python으로 직접 대조했다. 지붕 타일 276칸 중
33칸(맨 위 2줄, row 8~9, y=256~320 구간, col 10~26)이 **어떤 RoofTrigger 사각형에도 전혀 덮이지
않는** 것으로 확인됨 — 이는 인접 사각형 사이의 1~3px짜리 미세한 틈(버그 2)과는 다른, 트리거 사각형
자체가 지붕의 맨 위쪽을 아예 그리지 않은 진짜 구멍이었다. 사용자가 맵을 새로 그리며 "사각형 사이
틈"은 없앴지만, 이 "사각형이 지붕 범위 자체를 못 덮는" 문제는 성격이 달라 남아있었던 것.
**수정**: 손으로 그린 `RoofTrigger` 오브젝트에 의존하는 방식을 완전히 버리고, 그룹의 "지붕" 타일
레이어(`roofLayersByGroupName`으로 이미 찾아둔 레이어)에서 **실제로 타일이 채워진 칸을 직접 스캔**해
행(row) 단위로 가로로 이어진 구간을 트리거 존으로 자동 생성하도록 재작성
(`_buildRoofTriggerZonesFromRoofTiles`, `TiledMapTestScene.js`). 이러면 트리거 범위가 항상 지붕 타일과
정확히 일치해서 버그 2/5 같은 부류의 구멍이 구조적으로 발생할 수 없다. `Triggers` 오브젝트 레이어/
`RoofTrigger` 오브젝트는 더 이상 코드에서 쓰지 않는다(맵에는 남아있어도 무해함, 지워도 됨).
**검증**: Python으로 새 알고리즘(행 단위 병합 + 패딩 8px)을 그대로 시뮬레이션 → 지붕 타일 276칸 전부
커버(구멍 0개, 존 36개). Playwright로 `x=500` 고정, `y=240~1070`을 4px 간격으로 스윕하며
`previousActiveRoofs`를 관찰 → 상태 전환이 지붕의 실제 하단 경계 1곳에서만 발생(깜빡임 0회). 같은
스크립트로 지붕 alpha가 실제로 1↔0으로 tween되는 것도 확인함(버그 4 수정과 함께 검증).
**교훈**: Tiled에서 손으로 그린 트리거 지오메트리는 시각 타일과 별도 데이터라 어떻게 다시 그려도 어긋날
여지가 남는다(이번이 두 번째). 가능하면 트리거를 시각 타일 데이터에서 직접 유도해서 애초에 어긋날 수
없게 만드는 편이 근본적으로 안전하다.
(참고: 이후 `_buildRoofTriggerZonesFromRoofTiles`는 지붕+벽을 합집합으로 처리하는
`_buildTriggerZonesFromFadeLayers`로, `roofLayersByGroupName`/`_fadeRoof`는
`fadeLayersByGroupName`/`_fadeGroupLayers`로 이름이 바뀜 — 바로 아래 버그 6 참고.)

#### 🐛 겪었던 버그 6: 패딩 8px가 너무 넓어서 "벽에 스치기만 해도" 오작동 + 경계에서 매 프레임 흔들림 (해결됨)
사용자가 "Wall도 같이 투명해졌으면 좋겠다"는 요청과 별개로 "여전히 깜빡이면서 반투명하게만 보인다,
벽에 붙어도 반투명해지는데 더 좁게 설정하는 게 나을까, 아니면 폴리곤으로 다시 그릴까?"라고 재보고.
버그 4/5 수정 이후 Playwright로 여러 차례 재검증했을 때는(고정 x 스윕, 실제 WASD 왕복 스트레스
테스트) 깜빡임이 재현되지 않아서, 코드가 아니라 **트리거 존이 실제 지붕/벽 타일 범위보다 훨씬
넓다는 것** 자체가 원인이라고 결론 내림: `ROOF_TRIGGER_ZONE_PADDING = 8`은 원래 손으로 그린
사각형 사이의 실제 부동소수점 틈을 메우기 위한 것이었는데(버그 2), 버그 5에서 트리거를 타일 데이터
기반으로 바꾼 뒤로는 타일이 정수 픽셀 그리드에서 서로 정확히 맞닿아 있어 그 틈이 아예 없다(Python으로
PADDING=0에서도 타일 하위 2px 해상도 스캔 결과 커버리지 구멍 0개 확인). 즉 8px 패딩은 더 이상 구멍을
메우는 게 아니라 건물 "바깥"으로 존을 넓히는 부작용만 냈고, 플레이어가 벽에 물리적으로 부딪혀 딱
붙기만 해도(실제로 안 들어갔는데도) 8px 패딩 안에 들어가 있어서 페이드가 시작됐다.
**수정 두 가지** (`TiledMapTestScene.js`):
① `ROOF_TRIGGER_ZONE_PADDING`을 8 → 2로 축소(순수 부동소수점 경계 케이스만 대비할 정도로 최소화).
② `currentActiveRoofs`(매 프레임 raw overlap 결과)를 바로 페이드에 반영하던 것을, `confirmedActiveRoofs`
   (확정 상태) + `pendingTransitions`(후보 전환 스트릭 카운터)를 두어 같은 방향으로
   `ACTIVE_STATE_DEBOUNCE_FRAMES = 4`프레임 연속 유지돼야 실제로 페이드를 커밋하도록 디바운스 추가.
   경계 부근에서 raw 신호가 프레임 단위로 흔들려도(원인이 무엇이든) tween이 중간에 계속 되돌아가는
   일이 구조적으로 없어짐.
**검증**: Playwright로 플레이어 바디(20x20) 기준 "바디 가장자리가 존 경계에 딱 닿기만 함"(오버랩 0px)
→ 비활성 유지, "몇 px라도 실제 침투"→활성으로 정확히 갈리는 것 확인(벽 접촉만으로는 더 이상 트리거
안 됨). 기존 커버리지·스트레스 테스트(합집합 타일 408개 전부 커버, alpha 1↔0 tween, 40회 왕복 이동)도
새 패딩값으로 재통과.
**사용자 질문에 대한 답**: 폴리곤으로 손수 다시 그리는 방향은 권장하지 않음 — 버그 2/5가 정확히
"손으로 그린 지오메트리가 시각 타일과 어긋난다"는 문제였고, 폴리곤도 결국 손으로 좌표를 맞추는 방식이라
같은 부류의 버그가 재발할 여지가 있음. 타일 데이터에서 자동 생성하는 지금 방식(구조적으로 항상
타일과 일치)을 유지하고 패딩/디바운스로 미세 조정하는 편이 근본적으로 더 안전함.

**추가(같은 날 재보고)**: +2px로도 실제 플레이에서는 여전히 "벽에 딱 붙으면" 발동됐다. 원인: Arcade
Physics는 한 프레임치 속도만큼 먼저 이동시키고 그다음에 충돌을 보정하므로(220px/s·약 16.6ms/frame
기준 프레임당 최대 ~4px), 벽에 붙어 정지해 있어도 매 프레임 벽 쪽으로 몇 px 파고들었다가 되밀리는
게 반복될 수 있어 +2px 여유로는 부족했다. `ROOF_TRIGGER_ZONE_PADDING`을 아예 **음수(-4)**로 뒤집어서
존을 타일 경계보다 안쪽으로 4px 줄임 — 프레임당 파고듦보다 확실히 크게. Python으로 -4~-8까지도 타일
중심 좌표 기준 커버리지 구멍 0개 확인(32px 타일이라 여유 충분). Playwright로 실제 물리 이동으로 벽에
6초간 계속 눌러붙어 있어도(`d`키 홀드) 트리거 0회, 실제 진입 시엔 여전히 정상 발동하는 것 확인.

---

## 변경 이력 (Changelog)

> **[2026-08-11 편집자 주]** 아래 원본 지시문("모든 Claude Code 세션에 대한 지시")은 이 항목이 아직
> `PROJECT_STATUS.md` 안에 있을 때 쓰인 것이라 "위의 각 섹션"이 그 파일 자신의 섹션들을 가리킨다.
> 지금은 이 파일과 `PROJECT_STATUS.md`가 분리됐으므로, **새 변경사항을 어디에 어떻게 기록해야 하는지의
> 최신 절차는 `PROJECT_STATUS.md`의 "새 변경사항을 기록하는 방법" 섹션을 따를 것** — 요약하면 "새
> Changelog 항목은 이 파일(`CHANGELOG_ARCHIVE.md`) 맨 위에 추가하고, `PROJECT_STATUS.md`의 현재 상태
> 섹션에는 1~3줄 결론만 갱신"하는 것으로 바뀌었다. 아래 원문은 과거 기록이라 그대로 보존한다.

> **모든 Claude Code 세션에 대한 지시**: 이 프로젝트에서 코드 수정/추가/삭제 등 실질적인 변경을 할 때마다,
> 세션이 끝나기 전(또는 큰 변경 직후) 아래에 새 항목을 **위에 추가**한다(최신이 위로 오도록 역순 정렬).
> 날짜 + 무엇을 바꿨는지 + 왜 바꿨는지(사용자 요청/버그 등) + 관련 파일 경로를 한두 줄로 남길 것.
> 위의 각 섹션(구현 스펙, 버그 기록, 확인 필요, 다음 할 일 등)도 변경 내용에 맞게 함께 갱신할 것 —
> 아래 2026-07-24 항목 여섯 개는 같은 세션의 연속 작업이다(맵/변환/히트박스 처리 → 히트박스가 부정확해서
> 재요청 → 원인 진단 + 재작성(merged-occupancy 도입) → 나무가 플레이어 위치에 따라 갈라져 보인다는
> 재요청 → depth 그룹핑 방식 교정 → 그 여파로 히트박스가 다시 이상해졌다는 재요청 → merged-occupancy를
> 되돌리고 레이어별 독립 판정으로 교정 → 이번엔 히트박스가 너무 많아지고 이상한 곳에도 생긴다는 재요청
> → 판정 로직은 그대로 두고 계산된 사각형들을 병합하는 후처리 단계 추가(+ 병합 로직 자체의 버그까지
> 한 차례 더 수정) → 병합(바운딩 박스 합치기)이 나무 사이 통로를 막아버린다는 재요청 → 합치는 대신
> 그룹에서 가장 큰 사각형 하나만 남기는 방식으로 교체). 이 Changelog는 "언제 무슨 일이 있었는지"의
> 타임라인이고, 위 섹션들은 "현재 상태"의 스냅샷이므로 둘 다 최신으로 유지해야 이 파일의 목적(다음
> 세션이 처음부터 파악할 필요 없게 하는 것)이 지켜진다.

- **2026-08-31 (순수 `WInteriors`를 STRUCTURE_ALWAYS_ON_TOP_DEPTH 대상에서 제외 — 방 뒤 벽이 Rugs/Interiors 위로 튀던 문제)**:
  사용자 피드백: "`WInteriors` 위치가 이상하다. 그룹 레이어 순서가 WInteriors2 → Interiors → Rugs →
  WInteriors → Floors 라서 Interiors/Rugs는 WInteriors 위에 보여야 하는데 지금 WInteriors가 Interiors보다
  위에 있다."
  - **원인**: create() 레이어 루프가 `/^winteriors?\d*$/i`(숫자 접미사 optional)에 걸리는 레이어 전부에
    `STRUCTURE_ALWAYS_ON_TOP_DEPTH`(1e6)를 줘서, 순수 `WInteriors`도 Rugs/Interiors(depth 0)보다 위로
    올라갔다. tmx 데이터 확인 결과: `WInteriors`(숫자 없음) = 방 뒤(far) 벽의 안쪽 면(Floors보다 2줄 위,
    화면 상단), `WInteriors2` = 방 좌/우/아래(near) 벽의 안쪽 면. 뒤 벽은 항상 캐릭터/가구 뒤에 있어야
    하고(플레이어가 그 앞에 서므로), near 벽만 캐릭터 위에 그려져야 자연스럽다.
  - **수정**: 정규식을 `/^winteriors?\d+$/i`(숫자 1개 이상 필수)로 → `WInteriors2`/`WInterior3`는 계속
    구조물 depth, 순수 `WInteriors`는 depth 미지정 → Phaser가 맵 레이어 삽입 순서대로 그림
    (Floors → WInteriors → Rugs → Interiors → ...). `_buildDoorZones`의 문 안쪽-뷰 애니메이션 타일 탐색
    정규식(line ~671)은 `\d*` 그대로 둠(WInteriors/WInteriors2 둘 다에 문 타일이 있어야 함).
  - **주의**: 순수 `WInteriors`가 이제 플레이어(depth ~y)보다 아래라, 이론상 플레이어가 뒤 벽 앞에 서면
    벽이 캐릭터에 가려질 수 있으나 — 뒤 벽 칸(rows 0~1)은 CollisionLayer가 막아 플레이어가 거기 설 수
    없어 실질적 문제 없음(문 옆 몇 칸은 통과 중 잠깐 겹칠 수 있으나 무해).
  - **검증**: `npx oxlint`/`node --check` 통과. 정규식 단위 확인(WInteriors=False, WInteriors2/3=True).
    헤드리스: House1 실내 스폰, 에러 0, `roof-active: [house1]`. z-order 시각은 벽 페이드 후에만 보이므로
    사용자 실플레이 확인 필요.
  - **관련 파일**: `Frontend/src/game/scenes/TiledMapTestScene.js`, `PROJECT_STATUS.md`.

- **2026-08-31 (어둠 오버레이 구멍을 `Floors`만 → `Floors` + 페이드 안 되는 레이어 합집합으로 확대)**:
  `Floors` 방식(바로 아래 항목) 적용 직후 사용자 피드백: "집 안에서 바깥을 볼 때 어둠 처리할 때 지금
  `WInteriors` 부분까지 보여야 하는데 그만큼이 잘려서 보인다." 원인: 각 House의 `Floors`는 방 바닥
  영역만 칠해져 있고(예: House1 rows 2~10), "안에서 본 벽" 그림(`WInteriors`/`WInteriors2`)은 그보다
  2줄 위(rows 0~1)까지 그려져 있는데, 어둠 마스크 구멍이 `Floors` footprint로만 뚫려서 그 2줄이 어둠에
  묻혔다(측정: 6채 모두 WInteriors가 Floors 밖으로 20칸씩 튀어나옴).
  - **수정**: `_buildGroupFadeLayerMap`에서 `buildingFootprintRects`를 `[floorsChild]` → **그 그룹의
    childTileLayers 중 `/(roof|wall|door|darkness)/i`에 안 걸리는 전부**(= Floors + WInteriors +
    WInteriors2 + Interiors + Rugs)의 채워진 칸 합집합으로. roof/wall/door 레이어는 여전히 제외 - 넣으면
    처마/벽 바깥까지 구멍이 뚫려 바깥이 어둠 사이로 새어 보인다. 트리거 존(`_buildTriggerZonesFromFadeLayers`)은
    그대로 `Floors`만 씀(플레이어가 서 있을 수 있는 곳 = 바닥이라 이게 맞음).
  - **검증**: `npx oxlint`/`node --check` 통과. Python 시뮬로 6채+Cave 전부 WInteriors 칸이 새 구멍에
    포함됨 확인(missing 0). 헤드리스: House1 실내 스폰 → `roof-active: [house1]`, 에러 0. 어둠 마스크
    시각 자체는 헤드리스로 확인 불가 → 사용자 실플레이.
  - **관련 파일**: `Frontend/src/game/scenes/TiledMapTestScene.js`, `PROJECT_STATUS.md`.

- **2026-08-31 (실내/실외 판정을 `Floors` 타일 레이어 하나로 전면 단순화 — 아래 "처마 제외 + doorwayRect" 항목을 통째로 대체)**:
  바로 아래 "트리거 재설계" 항목(처마 bbox 클리핑 + 애니메이션 문 칸 제외 + `update()` 문 상태/안-밖
  동적 판정)까지 만들어 놓고 났더니, 사용자가 "이 복잡한 거 싹 다 없애고 기준을 간단하게 바꾸자"며
  대안을 제시: **기능이 필요한 그룹 레이어마다 `Floors`라는 타일 레이어를 새로 만들어뒀으니(House1~6,
  Cave), 플레이어가 그 `Floors` 타일 위에 있으면 실내 판정.**
  - **삭제한 것** (`TiledMapTestScene.js`):
    - `_buildTriggerZonesFromFadeLayers`: roof∪wall∪(bbox 안 roof) 계산, 애니메이션 문 칸 제외,
      `_tileLayerDatasBoundingBox` 처마 클리핑 → 전부 제거. 이제 그룹의 `Floors` 레이어 채워진 칸을 행
      단위로 훑어 존을 만드는 것뿐.
    - `_buildDoorZones`: `doorwayRect`/`outwardVec`/`doorCenter`/그룹 벽 방향 판정(`openSides` 등) →
      전부 제거. `doorZones`는 문 열기/닫기용 필드(`cells`/`interiorCells`/`hitboxZones`/`state`/…)만 남음.
    - `update()`: 문 칸 동적 트리거 루프 제거.
    - `_buildGroupFadeLayerMap`: roof 클리핑 footprint → `Floors` footprint로. `_rawLayersBoundingBox`,
      `_tileLayerDatasBoundingBox` 헬퍼 삭제, `_footprintRectsFromRawLayers`는 단일 인자로 원복.
    - 상수 `DOOR_TRIGGER_COLLISION_MARGIN` 삭제.
  - **추가/변경**: `this.floorLayerNameByGroup` (그룹 소문자 → "House1/Floors"). `_buildGroupFadeLayerMap`이
    `/^floors?$/i` 자식 레이어가 있는 그룹만 fade-building으로 등록(그 그룹의 `hideOnEnterLayersByGroupName`
    = roof/wall/door 이름 자식, `buildingFootprintRects` = Floors footprint). `Floors` 없는 그룹(Graveyard/
    Plaza/Mountain)은 트리거 대상 아님. "MountainFloor"는 `/^floors?$/i`에 안 걸리므로 안전.
  - **문 열기/닫기 애니메이션·충돌·상태머신은 안 건드림**(`collectAnimatedCells`, `_deriveDoorHitboxRects`,
    `_updateDoors`, `_handleDoorInteractKey`, `doorHitboxZoneGroup` 그대로).
  - **맵**: untitled.tmx 재export(2739KB). `House1`~`House6`·`Cave` 그룹 첫 자식으로 `Floors` 타일 레이어
    추가됨(각 90칸=방 전체를 실내로 칠함, House는 지붕 아래 tall roof 영역까지 포함, 문턱 칸도 포함).
    House5는 tmx에서 Walls/Doors/Roofs/WInteriors2가 `visible=0`(작업 중 토글) — 코드가 강제
    `setVisible(true)` 하므로 인게임 표시엔 문제 없음. 63 타일셋 불변.
  - **검증**: `npx oxlint`/`node --check` 통과, dangling ref grep 0. 헤드리스 Chrome(legacy `--headless`)로
    플레이어 스폰 위치별 HUD `roof-active` 확인: House1 실내(1780,260)=`[house1]`, 문턱(1840,340)=`[house1]`
    (구 버전 버그 지점 — 이제 됨), 문 밖 남쪽(1840,420)=`[]`, Cave 실내(200,300)=`[cave]`. **페이드/어둠
    tween 시각 완료는 헤드리스로 확인 불가**(Phaser 게임 루프가 몇 프레임만 진행, `--headless=new`는
    canvas 자체가 안 그려짐) → 사용자 실플레이 필요. 백업: `c:\PersonalProject\village.json.bak-20260831`.
  - **관련 파일**: `Frontend/src/game/scenes/TiledMapTestScene.js`, `Frontend/public/maps/village.json`,
    `PROJECT_STATUS.md`.

- **2026-08-31 (지붕/문 "안에 들어옴" 트리거 재설계 — 처마 제외 + doorwayRect 동적 문 판정, `_addDoorInteriorTriggerZones` 폐기) [같은 날 위 `Floors` 방식으로 통째 대체됨 — 원인 진단만 참고용]**:
  바로 아래 대규모 재export 직후 사용자 피드백 2건: ⓐ "가운데 타일만 Collision 해제 / `Roofs` 집 안 숨김은
  잘 되는데, House6을 제외한 House1~5는 문으로 들어가도 집 바깥 판정이 되어 내부가 안 보인다", ⓑ "House
  재디자인으로 `Roofs`가 벽 밖까지 튀어나오게 그려졌는데(처마), 집 밖에서 처마 밑에 서기만 해도 내부가
  드러난다".
  - **원인 진단**: (ⓐ) `_buildTriggerZonesFromFadeLayers`의 정적 트리거 모양은 roof∪wall인데, House1~5는
    Walls 레이어에도 문 자리에 2칸 구멍이 있고 그 자리엔 Roofs도 없어서 문 칸이 트리거 사각지대였다.
    House6만 Walls가 문 자리까지 꽉 차 있어(40/40) 우연히 동작. 구 `_addDoorInteriorTriggerZones`(문
    풋프린트에서 닫힌 문 충돌을 뺀 "안쪽 ¾" 정적 존)는 (1) `_deriveDoorHitboxRects`를 애니메이션 칸이
    아닌 문 레이어 전체 칸으로 호출해 히트박스가 문 깊이 전체를 덮어 "안쪽 ¾"이 0이 되거나, (2) House
    재디자인으로 방이 2줄(64px)까지 얕아져 플레이어(20px)가 닫힌 문을 밖에서 밀면 남는 안쪽 폭을 다
    파고들어 결국 못 쓰게 됐다. (ⓑ) 트리거 모양·`buildingFootprintRects`(어둠 구멍)가 Roofs 처마 칸을
    그대로 포함.
  - **수정** (`TiledMapTestScene.js`, 코드만 — tmx/맵 변경 없음):
    - `_buildTriggerZonesFromFadeLayers`: 정적 트리거 모양 = **Walls 타일 ∪ (Walls bounding box 안쪽)Roofs
      타일**. 벽 bbox 밖 지붕 = 처마 → 제외. 애니메이션 문 칸(`tileset.getTileData().animation`)은 Walls가
      덮고 있어도 무조건 구멍. 벽이 없는 건물(Cave 등)은 지붕 전체를 그대로 씀.
    - `_addDoorInteriorTriggerZones` **삭제**. 대신 `_buildDoorZones`가 문마다 `doorwayRect`(애니메이션
      칸 풋프린트, 바깥면은 `_deriveDoorHitboxRects` 앞까지 clip / 안쪽면은 반 타일 확장) + `outwardVec`
      (문 4면 중 벽 없는 면) + `doorCenter` + `groupNameLower`를 계산해 `doorZones[]`에 저장.
    - `update()`: `doorZones` 순회 → 플레이어 바디가 `doorwayRect`에 겹치고, 문이 열림/여는중/닫는중이면
      바로, 완전히 닫혔으면 `(player - doorCenter)·outwardVec < 0`(문 안쪽)일 때만 `currentActiveRoofs`에
      그룹 추가. → 닫힌 문을 밖에서 미는 경우 제외(2026-08-27 버그 재발 방지), 집 안에서 문에 붙어도 유지.
    - `_buildGroupFadeLayerMap` / `_footprintRectsFromRawLayers`: footprint(어둠 구멍)도 Roofs를 "지붕
      아닌 레이어의 bounding box"로 클리핑. 헬퍼 `_rawLayersBoundingBox`, `_tileLayerDatasBoundingBox` 추가.
  - **검증**: `npx oxlint` / `node --check` 통과. Python으로 tmx 6채 지오메트리 시뮬 — 처마 칸
    `isShapeFilled=False`(want False), 내부 `True`, 문 칸은 doorwayRect로 커버 확인. 헤드리스 Chrome:
    플레이어를 House1 문 안쪽(1840,300)에 스폰 → `_fadeGroupLayers("house1", true)` 호출 + `roof-active:
    [house1]` HUD 확인(구 버전은 여기서 트리거 안 됨). **한계**: 헤드리스에서 Phaser 게임 루프가 몇
    프레임만 진행돼 페이드/어둠 tween 완료(=시각)는 확인 못 함 → 사용자 실플레이 필요.
  - **관련 파일**: `Frontend/src/game/scenes/TiledMapTestScene.js`, `PROJECT_STATUS.md`.

- **2026-08-31 (untitled.tmx 대규모 재re-export — 타일셋 43→63, 레이어 그룹 재편, House Roofs 추가, 문 96×64, Roads 발전 기획)**:
  사용자 요청으로 `?map=tiled`가 로드하는 맵을 최신 `untitled.tmx`로 갱신(같은 경로 `public/maps/village.json`으로
  재export, `config.js`/씬 로더 변경 없음). 주요 변경:
  - **타일셋 43→63개**: 신규 20개(Cyberpunk City 3종, Fantasy Farm의 Crops/fence/flowers/stones/decor_plants/
    bushes/farm_tile, Modular Village Houses의 tiles-*-32x32 9종, SIMPLE CITY 32X32, tiles-door-32x32).
    `src/game/tiledTilesetManifest.js`에 20줄 추가. `public/tilesets/`는 tmx가 참조하는 63개 전체를 원본에서
    재복사(사용자가 "다수 수정"이라 했으므로 신규만이 아니라 전부). **Windows 대소문자 무시 FS 충돌**: Mixel
    `Bushes`(→`Bushes.png`)와 Fantasy Farm `bushes`가 소문자로 겹쳐 후자를 `farm_bushes`로 매핑(매니페스트
    파일 상단에 주석). 복사/매니페스트 생성은 스크래치패드의 `sync.py`로 수행.
  - **레이어 그룹 재편**: 기존 평면 `Tile Layer 1~5`가 `BaseGround`/`Water` 최상위 + `Roads`(`Roads1~3`)/
    `House1`~`House6`/`Mountain`/`Forest`/`Cave`/`Graveyard`(`W1`/`W2`)/`Plaza`(`Ground`/`Structure`/`Exterior1`/
    `Exterior2`) 그룹으로 나뉨. **`TiledMapTestScene.js` 코드 변경 불필요** — `_buildGroupFadeLayerMap`이
    그룹명 소문자 + 자식 leaf 이름 `/(roof|wall|door)/i` 규칙으로 자동 처리하므로 House1~6이 전부 자동으로
    벽/문/지붕 페이드 + 어둠 오버레이 대상이 됨(House1/House2로 이미 검증된 경로). `Graveyard`/`Roads`/
    `Plaza`는 roof/wall/door 이름이 없어 페이드 대상 아님(항상 표시).
  - **House 그룹에 `Roofs` 타일 레이어 재추가**(2026-08-25 #1에서 삭제됐던 것): 이름에 "roof"가 있어
    `Walls`/`Doors`와 동일하게 자동 hideOnEnter + footprint 대상. 코드 변경 없음.
  - **문(Doors) 타일이 96×64 블록으로 변경**: 각 문이 가로 3칸×세로 2칸 `tiles-door-32x32` 블록이며,
    **가운데 세로 열(2칸)만** Tile Animation Editor 애니메이션이 authored, 좌/우 문틀은 정지 타일.
    `_buildDoorZones`의 `collectAnimatedCells()`가 애니메이션 타일만 `cells`로 잡고 `_deriveDoorHitboxRects()`도
    그 bounding box(=가운데 열)로만 충돌을 유도하므로, **문 열기 시 Collision 해제는 가운데 애니메이션
    타일뿐**이고 좌/우 문틀은 `CollisionLayer`가 상시 담당. 사용자가 유의를 당부한 지점인데 기존 로직이
    이미 이 요구를 만족함 — 코드 변경 없음(정적 분석으로 확인, 6채 실플레이 검증은 대기).
  - **Roads 발전(기금) 기획 문서화**: `PROJECT_STATUS.md` "게임 기획 개요"에 도로 발전 단계 추가 —
    최초 `Roads1` → 기금 1단계 `Roads1+Roads2` → 2단계 `Roads3` 단독 → 3단계 `Roads4` → 4단계 `Roads5`
    (`Roads4`/`Roads5`는 추후 tmx 추가 예정). `Mountain` 그룹의 `Road`는 무관. 현재는 맵 구현 단계라
    기능 미구현, 세 레이어 전부 그대로 표시됨.
  - **관련 파일**: `Frontend/src/game/tiledTilesetManifest.js`, `Frontend/public/maps/village.json`(재export,
    130×120 불변, 4.2MB), `Frontend/public/tilesets/*.png`(63개), `PROJECT_STATUS.md`. 백업:
    `c:\PersonalProject\village.json.bak-20260831`.
  - **검증**: `npx oxlint src/` 통과, `node --check` 통과, `npm run dev` + `curl` 맵 JSON/신규 타일셋 PNG
    전부 200, 헤드리스 Chrome(`--virtual-time-budget`) 스크린샷 정상 렌더 + 콘솔에 "타일셋 매핑 없음"
    경고 0 + Phaser 에러 0 + 60fps. **남은 것**: 사용자 실플레이로 House1~6 페이드/어둠, 96×64 문 개폐
    시 가운데만 충돌 해제, `Roofs` 숨김, `Roads` 겹침 시각 확인.

- **2026-08-27 (untitled.tmx 재re-export — House2 신설 + Darkness 레이어 삭제 완료)**: 위 어둠 오버레이
  전환 직후, 사용자가 Tiled에서 마무리 작업 후 "`?map=tiled` 맵을 `untitled.tmx` 기준으로 최신화"를 요청.
  `tiled.exe --export-map json`으로 재export(백업은 스크래치패드 `village_backup.json`). 이전 `village.json`
  (2026-08-25 export)과 diff한 결과:
  - **`House2` 그룹 신설** — House1과 똑같은 구조 convention(`WInteriors`/`Rugs`/`Interiors`/`WInteriors2`/
    `Walls`(116칸)/`Doors`(4칸, 4프레임 애니메이션)/`DoorObject` 오브젝트). footprint 10×12=120칸, bbox
    world x[1600,1920] y[576,960]. 문은 (54,55 × 28,29) 2×2, 남쪽 벽, 옆칸 CollisionLayer 정밀 사각형
    {y16 h16}까지 House1과 동일. **코드 변경 없이 자동 처리됨** — 노드 시뮬레이션으로 확인: 벽 페이드
    트리거 존, 문 안쪽 ¾ 트리거 존(interior=north 자동 판정), 어둠 오버레이 구멍(12 rects), 문 개폐
    상호작용 전부 House1과 동일하게 동작. **이제 집이 2개라 어둠 오버레이의 "다른 집이 안 삐져나온다"를
    실제로 검증 가능** → **사용자가 재export 후 직접 플레이로 "잘 된다" 확인(2026-08-27)** — 어둠 오버레이
    (씬 전체 Rectangle + 반전 geometry mask), 다중 건물(House1/House2), 문 안쪽 ¾ 트리거, 벽 페이드가
    실제 렌더링·플레이에서 정상 동작함이 확인됨(이전 항목들의 "미검증" 해소).
  - **`House1/Darkness`, `Cave/Darkness` 타일 레이어 삭제됨** — 위 어둠 오버레이 전환의 마이그레이션
    완료. 코드는 이미 이 레이어들이 없어도(있어도) 동작하게 되어 있음.
  - `CollisionLayer` 1000→1065칸(+65, House2 벽). `Stair`/`StairStraight`/House1 `DoorObject`의 오브젝트
    좌표가 소수점 → 정수로 스냅(예: StairStraight `3425,671 64x33` → `3424,672 64x32`) - 순수 정리, 동작
    영향 없음.
  - **타일셋 43개 전부 firstgid/이름/순서 동일** → `public/tilesets/*.png` 재복사 불필요.
  - 검증: 노드로 JSON 파싱 OK, 레이어 구조 diff, House2 footprint/문/충돌 시뮬레이션, `npm run dev` +
    curl로 `/maps/village.json` 200 확인. 파일 2244247→2352585 bytes(Darkness 2장 빠졌지만 House2 그룹
    6장이 더 커서 순증).
- **2026-08-27 (어둠(Darkness)을 건물별 타일 레이어 → 씬 전체 오버레이 + 반전 마스크로 전환)**: 사용자가
  "Darkness가 타일 레이어라, 집이 여러 개 쌓이면 한 집의 Darkness보다 depth(렌더 순서)가 높은 다른 House
  그룹 레이어가 있을 때 그 집이 어둠 위로 삐져나온다"고 지적. 원인: [TiledMapTestScene.js] line ~228에서
  Roof/Wall/Door/Darkness/WInteriors가 전부 같은 depth `STRUCTURE_ALWAYS_ON_TOP_DEPTH`(1_000_000)라,
  depth 동률이면 Phaser는 디스플레이 리스트 추가 순서(= `this.map.layers` = Tiled 레이어 순서)로 그림 →
  Tiled에서 아래쪽에 있는 House의 Wall/Roof가 위쪽 House의 Darkness보다 나중에 추가돼 어둠 위로 그려짐.
  지금 House1 하나일 때 내부가 안 어두운 건 depth가 아니라 Darkness 타일 레이어에 자기 footprint(110칸)
  모양 구멍이 뚫려 있어서였고, 집이 늘면 그 전제가 깨짐.
  - **선택지 논의**(사용자에게 A~D 제시): A 씬 전체 오버레이 + 현재 건물만 구멍, B Darkness 전용 상위 depth
    밴드, C 런타임 depth 승격, D 구멍 책임을 depth로 이전. 사용자가 **A** 선택.
  - **결정 사항**(사용자): 구멍 범위 = footprint 전체(지금과 동일) / 어둠 진하기 = 완전 불투명(alpha 1) /
    어두워지는 건물 판정 = roof|wall 레이어 있는 모든 그룹 자동 / 구멍 방식 = 반전 geometry mask(`invertAlpha`).
  - **구현**: ① 상수 `DARKNESS_DEPTH = STRUCTURE_ALWAYS_ON_TOP_DEPTH + 1`, `DARKNESS_FADE_MS = 300`.
    ② create()에서 맵 전체를 덮는 `this.darknessOverlay`(Rectangle, 0x000000, origin 0,0, depth
    DARKNESS_DEPTH, alpha 0) + `this.darknessMaskGraphics`(`this.make.graphics`, 디스플레이 리스트에 안
    올라감) → `createGeometryMask()` + `mask.invertAlpha = true` → `darknessOverlay.setMask(mask)`.
    `uiCamera.ignore(darknessOverlay)`. doorPromptText depth를 `DARKNESS_DEPTH + 1`로 올림(어둠 위).
    ③ `_buildGroupFadeLayerMap`이 roof/wall 있는 그룹마다 `_footprintRectsFromRawLayers()`(raw 그룹 자식
    타일레이어 data flat 배열의 채워진 칸 합집합 → 행-런 사각형, darkness 레이어 제외)로
    `this.buildingFootprintRects` 채움. ④ `_refreshDarknessOverlay()` 신설: `confirmedActiveRoofs`(디바운스
    통과한 "안에 들어와 있는" 건물들)의 footprint 사각형을 마스크에 다시 그리고, 활성 건물 있으면 오버레이
    alpha→1, 없으면 →0 트윈(목표 alpha 같으면 트윈 재시작 안 함, 페이드 아웃 중엔 마스크 안 지워서 구멍
    유지). `_fadeGroupLayers` 끝에서 호출. ⑤ `_fadeGroupLayers`에서 showOnEnter(darkness 타일 alpha) 로직
    제거, `showOnEnterLayersByGroupName` 맵 삭제. ⑥ 레이어 루프에서 `/darkness/i` 레이어는
    `setVisible(false)` 후 skip(마이그레이션 중 Tiled에 남아 있어도 무시). depth 정규식에서 darkness 제거.
  - **검증**: `node --check`/`oxlint`/`vite build` 통과. 노드 시뮬레이션으로 footprint 사각형 확인 —
    House1 = 11 rects, 110칸(= 기존 Darkness 구멍과 동일), Cave = 24 rects 370칸(동굴 모양대로, 반전
    마스크라 비직사각형도 정확). **geometry mask + Rectangle 실제 렌더링 / 페이드 체감은 미검증(사용자
    확인 필요)** — 안 되면 Rectangle을 Graphics 오버레이로 교체가 첫 번째 대안.
  - **사용자가 할 일**: Tiled에서 각 House/Cave 그룹의 `Darkness` 자식 레이어 삭제 → `village.json` 재export.
    (코드는 Darkness 레이어가 남아 있어도 안 깨지게 해둠.) 재export 후 `village.json`에서 어둠 레이어당
    ~15000타일 빠져 파일도 가벼워짐.
  - **한계**: ㄱ자 건물도 행-런 마스크라 정확히 커버됨. 오버레이가 활성 건물 A→B로 즉시 전환될 때 마스크가
    스냅(건물 인접 + 디바운스 내 통과 시에만, 매우 드묾). Darkness 레이어를 아직 안 지운 상태로도 정상 동작.
- **2026-08-27 (문 밖에서 밀기만 해도 내부가 드러나던 버그 수정 — 문 칸은 충돌 영역을 뺀 "안쪽 ¾"만 트리거)**:
  사용자가 "Shift 달리기 중 들어가면 안 될 작은 곳에 들어가거나, 문 밖에서 비비는데 집 내부가 보인다"고
  보고 — 이 중 후자만 수정 요청. (하루에 시도 3번, 아래 순서대로.)
  - **원인**: 2026-08-24에 `Doors`를 hideOnEnter 대상(`/(roof|wall|door)/i`)에 넣으면서
    `_buildTriggerZonesFromFadeLayers()`가 만드는 "건물 안에 들어옴" 트리거 존이 문 스프라이트 풋프린트
    (House1 기준 2×2칸=64×64px)까지 포함하게 됐는데, 문의 실제 충돌은 `_deriveDoorHitboxRects()`가 이웃
    벽에서 유도한 ~16px 얇은 띠(House1은 문 남쪽 끝 y[336,352])뿐이라, 닫힌 문을 바깥에서 밀면 플레이어
    바디(20×20)가 문 타일 칸 안쪽으로 ~20px 파고들어(히트박스 y=336에서 막혀 바디 y[316,336])
    `ROOF_TRIGGER_ZONE_PADDING=-4`로 4px 줄인 트리거 존과도 겹쳐 페이드가 발동했다(문을 열지 않았는데
    지붕/벽이 사라져 내부가 보임).
  - **1차(되돌림)**: 트리거 존 "모양"에서 door 레이어를 통째로 제외. → 사용자 지적: 문 칸(2칸 깊이)이
    트리거 존의 구멍이 되어, 문을 통과해 **문간에 서 있는 동안** 다시 "바깥" 판정돼 내부가 도로 가려짐.
  - **2차(되돌림)**: `_addDoorInteriorTriggerZones()` 신설 + 닫힌 문 히트박스 선에서 플레이어 몸길이
    (24px)만큼 물러난 지점부터만 존 생성(밖에서 밀어도 안 걸리게). → 사용자 지적: 이번엔 반대로 집
    "안에서" 닫힌 문에 붙어 서면(바디 y[316,336], 존은 y[284,312]) 존을 벗어나 밖 판정이 됨.
  - **3차(최종)**: `_addDoorInteriorTriggerZones()`는 유지하되, 존의 바깥 경계를 "몸길이만큼 물러난
    지점"이 아니라 **닫힌 문이 물리적으로 막는 영역(히트박스 사각형) 바로 앞**으로 바꿈 = 문 풋프린트에서
    충돌 영역(House1은 남쪽 ¼)을 뺀 **안쪽 ¾**(상수 `DOOR_TRIGGER_COLLISION_MARGIN=2`px 여유). 근거:
    밖에서든 안에서든 닫힌 문에 붙어 서면 둘 다 바디가 이 존 안까지 들어오므로 내부가 보이고, 못 서는
    곳(충돌 영역)만 트리거에서 빠진다. "밖에서 밀면 내부가 보임"은 사용자가 수용 — 애초에 벽(Walls)
    트리거 존도 Walls가 solid-fill이라 House1 남쪽 벽 어디든 밖에서 붙기만 해도 이미 내부가 보이는
    상태였고(노드 실측 확인), 문만 더 엄격하게 잡을 이유가 없었다. 안쪽 방향 판정은 그대로(4면 중
    정확히 한 면만 shape 타일로 막힌 쪽 = 안쪽, House1은 북), 안쪽 면은 메인 벽 존과 확실히 겹치도록
    반 타일 확장.
  - 관련 파일: `Frontend/src/game/scenes/TiledMapTestScene.js` (상수 `DOOR_TRIGGER_COLLISION_MARGIN`
    신설, 클래스 docblock, `_buildTriggerZonesFromFadeLayers` 리팩터(`isShapeFilled` 헬퍼) +
    `_addDoorInteriorTriggerZones` 신설). 검증: `node --check`/`oxlint`/`vite build` 통과 + 노드
    시뮬레이션(House1 문 존 `x[1732,1788] y[272,334]` → 안/밖에서 닫힌 문에 붙음·문간·통과 전부 검출,
    문에서 1타일 이상 떨어진 바깥은 불검출, 전이 구간은 wall+door 존 동시 검출로 깜빡임 없음).
    **Playwright/실제 플레이 체감 검증은 미실시(사용자 확인 필요)**.
  - 한계: 코너 문(막힌 면이 0개나 2개 이상)은 안쪽 존을 건너뜀 — 현재 맵엔 House1 문 1개뿐이라 해당
    없음. 문 풋프린트가 전부 충돌 영역이면(예: 벽 없이 단독 문 → 폴백으로 문 전체 차단) 존 안 생김(그
    경우 문에 설 일 자체가 없음). roof/wall 없이 door만 있는 그룹은 메인 존이 아예 안 생기지만 맵 작성
    실수.
  - **Shift 달리기 터널링(첫 번째 증상, 미수정)** — 원인 분석만 기록: Arcade Physics는 매 프레임
    `속도×Δt`만큼 이동 후 겹침을 밀어내는 이산 방식이라 스윕 충돌이 없다. 걷기 `MOVE_SPEED=220`은
    60fps에서 스텝당 ~3.7px지만 `RUN_MOVE_SPEED=450`은 ~7.5px(프레임 드랍 시 더 큼). 전체 타일 충돌
    (32px)은 안 뚫리지만, `_buildPreciseTileHitboxZones`가 만든 얇은 존(Tile Collision Editor 사각형,
    난간/선반 등 4~8px)이나 문 히트박스(~16px)는 한 스텝에 통과하거나(터널링), 겹치더라도 파고든 깊이가
    커서 분리 벡터가 플레이어를 옆 틈새/구석으로 밀어낸다. 대각선 달리기가 코너 이음새에서 특히 잘 뚫림.
    대응 방향: 달리기 속도 하향 / `body.setMaxVelocity` / 얇은 precise 존 최소 두께 보장 / arcade `fps`
    상향(120) / 스윕 방식 이동. — 착수는 미정.
- **2026-08-25 (untitled.tmx 재re-export #2 — 데이터만 갱신, 코드 변경 없음)**: 바로 아래 항목(같은 날
  첫 번째 재export) 이후에도 사용자가 Tiled에서 계속 작업 중이라 `untitled.tmx` mtime이 다시 갱신됨을
  확인, 동일한 "맵 최신화" 요청을 재수행. 레이어 구조 diff 결과 이번엔 `House1/Darkness`의 채워진 칸
  수만 15510→15490으로 소폭 줄어든 것 외에 구조 변화 없음(Darkness는 트리거 존 모양 계산에 쓰이지
  않는 순수 시각 오버레이라 코드 영향 없음) - 타일셋 PNG 43개도 전부 원본과 동일해 재복사 없음.
  Playwright로 콘솔 에러 0개, 맵 정상 로드만 스모크 테스트로 확인.
- **2026-08-25 (untitled.tmx 재re-export — House1 인테리어 확장 + WInteriors2 대응)**: 사용자가
  전날(2026-08-24) 세션 이후 Tiled에서 House1 인테리어를 계속 작업했고(가구/러그 추가, mtime 확인 결과
  `untitled.tmx`가 마지막 export 이후로도 갱신돼 있었음), 이번엔 "`?map=tiled`가 로드하는 맵을
  `untitled.tmx` 기준으로 다시 최신화해달라"는 동일한 요청을 재수행. `tiled.exe --export-map json`으로
  재export 후 이전 `village.json`과 레이어 구조를 diff해서 확인한 결과, House1 그룹에 세 가지 구조적
  변화가 있었다: ① `WInteriors`가 `WInteriors`(그대로 유지, 내용은 가구 몇 개로 축소)와
  `WInteriors2`(신규 - 벽 라인을 따라 놓인 가구/장식, 그리고 **문 위치의 "안쪽에서 본 문" 애니메이션
  타일(gid 3051/3046, col54·55/row10)이 여기로 이동**)로 분리됨. ② `Rugs`(신규, 러그 장식 - "Interiors"
  와 동일하게 항상 보이는 일반 레이어라 코드 변경 불필요) 추가. ③ `Roofs` 레이어가 완전히 삭제됨(House1은
  이제 hideOnEnter 대상이 `Walls`/`Doors` 둘뿐 - 지붕 없는 실내 오픈형 건물로 재설계된 것으로 추정,
  사용자가 의도한 변경이라고 판단해 별도 조치 없이 그대로 반영). **문제**: `_buildDoorZones()`와
  create()의 always-on-top depth 배정 로직 둘 다 WInteriors 레이어를 `/^winteriors?$/i`(정확히
  "WInterior"/"WInteriors"만) 정규식으로 찾고 있어서, 문의 안쪽 애니메이션 타일이 `WInteriors2`로
  옮겨간 순간 `interiorCells`가 빈 배열이 되어 어제 만든 "문 열고 닫을 때 안쪽 그림도 같이
  애니메이션"기능이 조용히(에러 없이) 죽는 상황이었다. **수정**: 두 정규식을 `/^winteriors?\d*$/i`로
  확장해 숫자 접미사가 붙은 레이어(`WInteriors2`, `WInteriors3`, ...)도 동일하게 처리되도록 일반화 -
  이름 패턴 기반 자동 처리라는 기존 설계를 그대로 유지하면서 확장(하드코딩 없이 향후 `WInteriors3`가
  생겨도 코드 변경 불필요). 타일셋 PNG 43개는 이번엔 원본과 대조해도 전부 최신 상태라 재복사 없음(문
  관련 애니메이션 타일이 속한 타일셋 자체는 안 바뀌고 그 타일을 담는 레이어만 재배치된 경우라 그림
  파일 자체는 그대로임). **검증**: Playwright로 (a) `interiorCells`가 정확히 `House1/WInteriors2`
  레이어의 col54·55/row10에서 2칸 매칭됨, (b) 유도된 문 히트박스가 여전히 `{x:1728,y:336,w:64,h:16}`로
  동일함(Roofs 삭제가 Walls 기반 유도 로직에 영향 없음을 확인), (c) `hideOnEnterLayersByGroupName`의
  house1 항목이 `["House1/Walls","House1/Doors"]`로 줄어든 것 확인(Roofs 삭제 반영), (d) 문 열기 →
  집 내부 진입까지 전 과정에서 콘솔 에러 0개, `WInteriors`/`WInteriors2`/`Rugs` 전부 alpha 1(안 사라짐)
  유지, Doors/Walls는 alpha 0으로 정상 페이드. 스크린샷으로 침대/테이블/의자/러그/장식품이 들어간
  훨씬 풍부해진 House1 내부를 육안으로도 확인. 관련 파일: `Frontend/src/game/scenes/TiledMapTestScene.js`
  (create()의 depth 배정 블록, `_buildDoorZones()`의 `winteriorTileLayers` 필터). **교훈**: 문서 안내대로
  "이미 쓰던 타일셋을 다시 고쳤다"뿐 아니라 "이미 쓰던 레이어 구조 자체가 재편됐다"도 재export 후 항상
  diff로 확인해야 할 위험 신호 - 이번처럼 이름 패턴 매칭 정규식이 새 레이어 이름과 정확히 안 맞으면
  콘솔 경고 없이 조용히 기능이 죽는다(문 애니메이션은 에러를 던지지 않고 그냥 `interiorCells.length===0`
  이 되어 아무 일도 안 일어날 뿐이라 육안 확인 없이는 알아채기 어려움).
- **2026-08-24 (`PROJECT_STATUS.md` 토큰 예산 초과분 트리밍)**: 위 항목들을 연달아 추가하면서
  `PROJECT_STATUS.md`가 632줄까지 늘어나 단일 `Read` 한도(약 25,000토큰)를 넘겼고, 사용자가 "한도
  초과되지 않도록 필요없는 부분 분량 줄여줘, 대신 필요한 부분이 누락되면 절대 안 돼"라고 요청. 문서
  자체 규칙(토큰 예산 관리 섹션)에 따라 "게임 기획 개요"(설계 스펙, 트리밍 제외 대상)는 손대지 않고
  나머지 섹션만 압축 — 압축 전 원문이 이미 이 아카이브에 남아있는 경우에만 인라인 서술을 줄이고 링크로
  대체하는 방식으로, 정보 손실 없이 진행했다. 압축한 곳: ① "겪었던 버그 1~6" 요약 — 이미 이 아카이브
  "상세 버그 진단 기록"에 원문이 있어 각 버그를 원인→해결→교훈 한 줄로 압축. ② "구현 스펙 원문" 1번
  (충돌 두 메커니즘)·8번(문 개폐) — `setCollisionFromCollisionGroup` 버그(2026-07-22 항목)와 문 개폐
  2026-08-24 확장(바로 아래 항목)의 히스토리 서술이 이미 아카이브에 있어, 스펙 쪽은 "현재 최종 동작"만
  남기고 "왜 이렇게 됐는지"는 아카이브 링크로 대체. ③ "🚧 진행 중" 섹션의 지붕/벽 페이드·Y-정렬
  설명 — "구현 스펙 원문" 2~6번과 완전히 중복돼 있어 스펙 쪽을 가리키는 한 줄로 교체. ④ "확인 필요"
  섹션 — 이미 "확인 필요 없음"이라고 스스로 적어둔 `CollisionObjects` 항목을 삭제, "문 벽 페이드"와
  "문 개폐" 두 항목이 사실상 같은 내용을 중복 서술하고 있어 하나로 병합, `Mountain` 그룹 항목의
  재export 히스토리를 축약. ⑤ "그 외 환경 이슈"/"검증 방법"/"실전 주의사항" — 문장을 더 압축된
  표현으로 재작성(정보 삭제 없이 표현만 축약). ⑥ 파일 상단 "마지막 갱신" 헤더의 2026-08-09~08-11
  히스토리 나열을 "아카이브 참고" 한 줄로 축약. ⑦ "최근 변경" 목록에서 같은 날(2026-08-24) 기획 추가
  항목 3개를 1개로 병합(전문은 이 아카이브에 각각 남아있음). **결과**: 632줄 → 562줄(단일 `Read`로
  트렁케이션 경고 없이 전체 확인됨). **검증**: `wc -l -c`로 줄/바이트 수 추적 + `Read` 도구가 더 이상
  "Truncated: PARTIAL view"를 반환하지 않는 것을 확인.
- **2026-08-24 (퀘스트 시스템/조작법 UI/채집물 판매·구매처 매핑/NPC 최초 만남 처리 추가)**: 사용자가
  이어서 4가지를 추가 요청. ① **퀘스트 시스템** — 1) 촌장에게 인사, 2) 채집 직업 퀘스트 4종(2-1 곡괭이
  구매→광질→판매, 2-2 도끼 구매→벌채→판매, 2-3 낚싯대 구매→낚시→판매, 2-4 괭이 구매→씨앗 구매→
  농사→판매), 3) 마을 활동 퀘스트 2종(3-1 청소, 3-2 인테리어 구매). **같은 대단원 번호(예: 2-1~2-4)는
  병렬 퀘스트로 동시에 노출**된다고 확정(순서 강제 없음). 퀘스트 목록 자체는 확정본이 아니라 이후
  자유롭게 수정/추가/삭제 가능하다고 사용자가 강조. ② **조작법 UI** — 화면 좌측(맵/인게임 화면 바깥)에
  조작법 상시 표시, 구체 UI는 미정. ③ **채집물 판매처/재료 구매처 매핑** — 광석→대장장이 판매,
  목재→목수 판매, 물고기·농산물→음식점 상인 판매, 씨앗→일반 상인 구매, 인테리어→목수 구매(장비
  최초구매/강화는 대장장이 담당, 위 항목과 일관). ④ **NPC 최초 만남 처리** — "NPC 기억 및 프롬프트
  구조" 섹션의 프롬프트 블록 1~5 중 플레이어와 처음 만나는 NPC는 3(최근 대화)·4(검색된 기억)·5(성찰)
  블록이 전부 비게 되므로, 이 경우 "이번이 첫 만남"이라는 사실을 시스템이 명시적으로 프롬프트에
  주입해야 한다고 확정(빈 블록을 그냥 두면 LLM이 없는 과거를 지어내는 환각 위험) — 구체 구현 방법은
  미정. `PROJECT_STATUS.md`에는 ①②③을 "추가 기획 아이디어" 리스트에, ④를 "NPC 기억 및 프롬프트 구조"
  섹션에 직접 삽입(관련 섹션에 있는 게 더 발견하기 쉬워서). **검증**: 설계 문서 추가만이라 코드/런타임
  검증 대상 없음. **참고**: 이 시점에 `PROJECT_STATUS.md`가 632줄(단일 Read 25,000토큰 한도를 이미
  넘김)까지 늘어났음 — "게임 기획 개요" 섹션은 트리밍 대상이 아니므로 이번 추가 자체는 정상이지만,
  다음 세션이 파일을 열 때 Truncated 경고를 볼 수 있으니 "확인 필요"/"진행 중" 등 트리밍 가능한
  다른 섹션을 정리할 시점인지 점검할 것(사용자에게 트리밍 필요 여부는 아직 확인받지 않음).
- **2026-08-24 (곡괭이/도끼/괭이/낚싯대 최초 구매처를 대장장이 NPC로 확정)**: 바로 아래 항목("낚시/농사
  …신규 기획 아이디어 추가")을 적을 때 낚시/농사 도구(괭이/낚싯대)를 "NPC에게서 구매 가능"이라고만
  적고 어떤 NPC인지는 비워뒀는데, 사용자가 이어서 "곡괭이/도끼는 문서에 구매 후 사용인지 바로 사용인지
  적혀 있냐"고 질문. 확인해보니 곡괭이/도끼는 업그레이드 문맥(대장장이에게 강화)에서만 등장할 뿐 최초
  획득 경로가 아예 안 적혀 있었음(빠뜨린 게 아니라 원 요청에 없던 디테일). `AskUserQuestion`으로
  "기본 지급 / NPC 구매 필요 / 아직 미정" 중 선택을 물었고, 사용자가 **"곡괭이, 도끼, 낚싯대, 괭이
  모두 대장장이 NPC에게 구매 가능하도록 하자"**로 확정 — 즉 4종 채집 도구를 별도 NPC 없이 대장장이
  한 명이 판매(최초 구매)+강화(업그레이드)를 모두 담당하는 구조로 정리됨. `PROJECT_STATUS.md`의
  "낚시/농사" 불릿을 이에 맞게 수정(괭이/낚싯대 전용 문구 → 곡괭이/도끼/괭이/낚싯대 4종 전부 대장장이
  구매로 통합, "어떤 NPC인지 미정" 문구 삭제). **검증**: 설계 문서 수정만이라 코드/런타임 검증 대상 없음.
- **2026-08-24 (낚시/농사/장비 강화/인테리어/평판/마을 발전/야간 이벤트 — 신규 기획 아이디어 추가)**:
  사용자가 "지금 당장 구현할 건 아니고, 나중을 위해 기록만 해두고 싶다"며 아래 6가지 아이디어를 요청.
  코드 변경 없이 `PROJECT_STATUS.md`의 "게임 기획 개요" 섹션 끝(이벤트 및 World Event Manager 다음)에
  "추가 기획 아이디어" 신규 서브섹션으로 정리해 넣었다. ① 낚시/농사 신규 채집 활동 — 괭이/낚싯대를
  NPC에게서 구매(어떤 NPC인지는 미정). ② 장비 강화 — 곡괭이/낚싯대/도끼/괭이를 대장장이에게 "현재
  장비+돈+특정 광석"으로 가져가면 한 단계씩만 순차 업그레이드(예: 돌 곡괭이+1000G+철광석10개→철
  곡괭이, 단계 스킵 불가). ③ 장비 등급 효과 — 곡괭이는 등급이 오를수록 캘 수 있는 광석 종류가
  늘어남(드롭 풀과 곡괭이 단계가 맞물림), 괭이/낚싯대/도끼는 수확량+채집 속도가 증가하는 방식으로
  효과가 다름. ④ 집 인테리어 구매 — 목수 NPC에게 구매(돈의 신규 사용처), 초기엔 침대만 존재. ⑤ 평판
  확장 — 선행으로 평판 증가 가능하지만, **평판 수치가 회복되어도 과거 범죄 사실(예: 살인 이력) 자체는
  NPC 기억/소문에서 사라지면 안 됨**(기존 Fact/Rumor 분리 저장 구조 재사용 예정). ⑥ 마을 청소+발전 —
  쓰레기 오브젝트에 E 상호작용 시 인벤토리에 쓰레기 추가, 공용 쓰레기통 상호작용 시 쓰레기만 선택적
  제거(다른 아이템/장비는 영향 없어야 함) + 평판 상승. 플레이어 기부 기금이 임계값을 넘을 때마다
  마을 인프라(전봇대, 도로 등) 추가. ⑦ 밤 랜덤 이벤트 — 수상한 NPC 등장, 전투로 제압 시 포상금+명성
  상승(패배 가능 여부/패배 시 처분은 미정). **검증**: 설계 문서 추가만이라 코드/런타임 검증 대상 없음
  — 다음 착수 세션이 담당 NPC, 광석/작물 카탈로그, 기금 임계값 등 빈 디테일을 사용자와 먼저 확정할 것.
- **2026-08-24 (문(Doors)도 벽처럼 페이드 + WInteriors 안쪽 문 타일 애니메이션 연동 + 문 충돌을 벽
  두께만큼 얇게 유도)**: 사용자가 House1에서 문을 열고 집 안으로 들어가 보니 Wall/Roof는 안에 들어가면
  투명해지는데 **문(Doors)만 벽에 그대로 남아있어서 어색하다**고 지적. 동시에 `WInteriors` 레이어의
  문 위치에 문을 위에서 내려다본 모습을 형상화한 애니메이션 타일이 별도로 authored되어 있다는 것도
  알려주며, 이걸 문 상태와 연동시켜 "벽에서 문만 안 사라지는" 어색함 대신 "밖에서 보이는 문은 사라지고
  안에서 보이는 문(WInteriors)이 대신 애니메이션되는" 방식으로 바꿔달라고 요청. 마지막으로, 집 내부에서
  문을 닫으면 문 칸 전체(House1 기준 2×2칸=64×64px)가 그대로 막히는데 옆 벽은 실제로 타일 절반(16px)만
  두꺼운 얇은 판이라 문턱만 두꺼워 보인다며, 충돌도 벽만큼 얇게 만들어달라고 요청. **원인/설계**:
  `_buildGroupFadeLayerMap()`의 hideOnEnter 정규식이 `/(roof|wall)/i`라서 "Doors"(문)는 애초에 대상이
  아니었음 - 정규식에 `door`를 추가해 `Doors` 타일 레이어도 Wall/Roof와 함께 자동으로 hideOnEnter 대상이
  되도록 함(그룹 이름 기반 자동 처리라는 기존 설계를 그대로 재사용, 코드 흐름 변경 최소화). WInteriors
  연동은 `_buildDoorZones()`가 기존에 "Doors" 레이어에서만 애니메이션 타일을 찾던 것을 "WInteriors"
  레이어에서도 찾도록 확장해(`collectAnimatedCells()`로 공통화) `interiorCells`로 별도 보관 -
  `_updateDoors()`가 매 프레임 `cells`(바깥, 충돌 대상)와 `interiorCells`(안쪽, 순수 시각)를 항상 같은
  프레임 인덱스로 동시에 `putTileAt()` - House1 문에서는 `WInteriors`의 col54/row10, col55/row10 두 칸
  (gid 3051/3046, `TopDownHouse_FloorsAndWalls` 타일셋, 각 4프레임 dur120)이 매칭됨. 충돌은
  이전처럼 문 타일 자체에 `setCollision()`을 거는 방식(타일 "전체"만 막을 수 있음)을 버리고, 신설한
  `_deriveDoorHitboxRects(minCol, maxCol, minRow, maxRow)`가 문과 맞닿은 `CollisionLayer` 이웃 타일
  (좌/우 또는 상/하)에서 Tile Collision Editor로 그려둔 실제 벽 두께 사각형을 찾아 그 두께 그대로 문
  너비/높이에 맞게 늘린 정적 존(`doorHitboxZoneGroup`)을 만드는 방식으로 교체 - 손으로 두께를
  지정하지 않고 이웃 벽 데이터에서 유도한다(버그 5 "유도 가능한 건 데이터에서 유도한다" 원칙 재사용).
  House1 문의 경우 좌/우 이웃(row10, col53/col56)에서 `collision` 타일셋의 gid 5950(로컬 사각형
  x=0,y=16,w=32,h=16 - 타일 절반 높이의 하단 절반 스트립)을 찾아, 문 칸 2열 전체 너비로 늘린
  `{x:1728, y:336, w:64, h:16}` 사각형 하나가 만들어짐(문 위쪽 행인 row9은 애초에 이웃 벽 데이터가
  없어 사각형이 안 생김 - 시각적으로도 문틀/장식일 뿐 실제 벽 라인이 아니었던 행이라 자연스러움). 문이
  열리면 이 존들의 `body.enable=false`로 충돌만 끄고, 닫히면 다시 켠다. **검증**: Playwright로 (a)
  `hideOnEnterLayersByGroupName`에 `House1/Doors`가 실제로 포함됨, (b) `interiorCells` 2칸이 정확한
  좌표(col54/55, row10)로 매칭됨, (c) 유도된 히트박스가 정확히 `{x:1728,y:336,w:64,h:16}`(문 칸 전체
  64×64가 아니라 벽과 동일한 16px 두께)임, (d) 바깥에서 문이 닫혀있을 때 Doors/Walls/WInteriors alpha가
  모두 1(보임)이고 히트박스 `enable=true`, (e) E키로 열면 `state="open"`, 히트박스 `enable=false`로
  전환됨, (f) 집 내부로 들어가면 `confirmedActiveRoofs=["house1"]`와 함께 Doors/Walls/Roofs alpha가
  모두 0(사라짐)인 반면 WInteriors alpha는 그대로 1(안 사라짐), (g) 내부에서 다시 E키로 닫으면
  `state="closed"`이면서 히트박스가 다시 `enable=true`로 복귀 - 여기까지 전부 실측 확인. 스크린샷으로도
  바깥에서 열림 상태일 때 문 위치의 debug 충돌 박스가 사라지고, 내부에서 문이 닫힌 채로 서 있을 때
  WInteriors의 "안쪽에서 본 문" 그림이 벽 사이 빈 공간에 그대로 남아있는 것을 육안으로도 확인. 실제
  E키 입력은 `page.click("canvas")`로 포커스를 먼저 준 뒤에만 Phaser의 `keydown-E` 리스너가 반응함을
  확인(Playwright 테스트 특성일 뿐 실제 사용자 플레이와는 무관 - 페이지 클릭은 자연스럽게 일어남).
  관련 파일: `Frontend/src/game/scenes/TiledMapTestScene.js`(`_buildGroupFadeLayerMap`,
  `_buildDoorZones`, `_deriveDoorHitboxRects`, `_updateDoors`). 검증에 쓴 임시 디버그 훅
  (`window.__tiledScene = this`)과 Playwright 스크립트는 세션이 끝나며 코드에서 제거함(스크래치패드에도
  영구 보관하지 않음 - 필요하면 동일 패턴으로 새로 작성).
- **2026-08-24 (untitled.tmx → village.json 재export + TopDownHouse_FloorsAndWalls 타일셋 재동기화)**:
  사용자가 "`?map=tiled`가 로드하는 맵을 `village.json`이 아니라 최신 작업 파일인
  `c:\PersonalProject\untitled.tmx` 기준으로 최신화해달라(타일 수정 사항도 반영)"고 요청. `tiled.exe
  --export-map json untitled.tmx Frontend/public/maps/village.json` CLI로 재export(맵 크기는 그대로
  130×120, 타일셋도 43개로 동일 - `mapData.js`/`world_layout.py` 좌표 동기화는 이번엔 불필요). 이어서
  `untitled.tmx`가 참조하는 43개 타일셋 원본(`c:\PersonalProject\Tilesets\...`)을 전부 SHA-256 해시로
  `public/tilesets/`의 기존 사본과 대조하는 스크립트를 실행(2026-08-11 항목과 동일한 방식) - 1개
  (`TopDownHouse_FloorsAndWalls`)만 원본과 달라 갱신됨, 그 외 42개는 이미 최신 상태였음. **검증**:
  재export된 JSON의 레이어 구조(`House1`/`Mountain`/`Forest`/`Cave` 그룹, 43개 타일셋)를 파싱해
  확인했고, 바로 아래 항목(문 관련 수정) 검증 과정에서 Playwright로 새 맵이 정상 로드되고 House1이
  실제 건물 그래픽으로 렌더링되는 것까지 함께 확인됨. 참고: `TopDownHouse_FloorsAndWalls.png` 원본이
  499px 높이(32px 배수인 480/512가 아님)라 Phaser가 "Image tile area not tile size multiple" 경고를
  콘솔에 남기는데, 이건 하단에 쓰이지 않는 여분 패딩이 있다는 정보성 경고일 뿐 실제 타일 그리드(15행
  ×32px=480px 이내)와 렌더링에는 영향이 없음을 확인(문 스프라이트 자체는 스크린샷상 정상 표시됨) -
  사용자에게 확인한 결과 편집 편의를 위해 캔버스를 일부러 넉넉하게 키운 것이었음(의도치 않은 변경
  아님)이 확인되어 **해결됨**. `tilecount`/`columns`가 명시적으로 선언돼 있어 Tiled/Phaser 둘 다
  이미지 높이가 아니라 그 값으로 타일을 자르므로, 여백을 얼마나 늘려도 타일 그리드에는 영향 없음.
- **2026-08-11 (그림판으로 수정한 타일셋 원본이 웹에 반영 안 되던 문제 → public/tilesets/ 전체
  재동기화)**: 바로 아래 항목(가로반전 더블도어)을 마친 뒤 사용자가 스크린샷 두 장을 첨부하며 "Tiled(2번째
  사진 - 수정된 지붕/벽/문 모습)에서는 그림판으로 고친 타일셋이 잘 보이는데, 웹(1번째 사진 - 예전
  주황 물결무늬 지붕/다른 창문/문이 비어 보임)에는 반영이 안 된다"고 재보고. 원인은 명확했다:
  `Frontend/public/tilesets/*.png`는 `C:\PersonalProject\Tilesets\...`의 원본 PNG를 최초 1회 복사해둔
  **스냅샷 사본**이라(심볼릭 링크가 아님), Tiled가 원본을 다시 읽어 반영하는 것과 달리 웹은 사용자가
  그림판으로 원본을 다시 저장해도 자동으로 갱신되지 않는다 - 지금까지는 "새 타일셋이 추가됐을 때만"
  수동으로 복사해왔지, "이미 매핑된 타일셋의 그림 내용 자체가 나중에 다시 수정되는" 경우는 다루지
  않았던 워크플로 빈틈이었다. **수정**: 특정 파일을 사용자에게 물어보는 대신, `village.json`의
  `tilesets[]` 전체를 순회하며 각 타일셋의 원본 경로(맵 JSON 기준 상대경로)를 해석해
  `public/tilesets/`의 대응 사본과 바이트 단위로 비교 → 다르면 덮어쓰는 일회성 동기화 스크립트를
  실행(매니페스트 파싱은 `tiledTilesetManifest.js`를 정규식으로 직접 읽어 처리 - ESM `export const`라
  `require()`가 안 먹힘). 43개 중 4개(`house1`, `house2`, `house3`, `collision`)가 원본과 달라 갱신됨
  - `house1`/`house2`/`house3`는 사용자가 그림판으로 수정한 건물 파사드/지붕/문 관련 타일셋(예상대로),
  `collision`은 왜 달랐는지 원인은 특정 안 했지만 원본이 항상 진실 소스이므로 그대로 덮어써도 무해함
  (순수 충돌 판정용이라 항상 숨김 처리됨, 시각적 영향 없음). **검증**: Playwright 스크린샷으로 웹
  렌더링이 사용자가 보내준 두 번째 스크린샷(수정된 모습: 격자무늬 지붕, 아치형 창문, 티얼색 밑단,
  중앙 더블도어)과 일치함을 확인, CORS 관련 콘솔 에러(백엔드 미기동 - `127.0.0.1:8000` 연결 실패)는
  이 세션과 무관한 기존 이슈라 무시. **교훈/워크플로 개선**: 사용자가 "이미 쓰고 있는 타일셋의 그림
  내용을 나중에 다시 고치는" 경우는 새 타일셋 추가 때와 달리 매니페스트에 이미 키가 있어서 콘솔
  경고도 안 뜨고 조용히 안 반영된다 - 앞으로 사용자가 "그림판/포토샵 등으로 기존 타일셋을 고쳤다"고
  하면 새 파일 여부와 무관하게 이 동기화 스크립트(또는 최소한 해당 파일 하나)부터 재실행할 것.
- **2026-08-11 (House1 문 왼쪽 칸 빈 프레임 문제 진단 + houseDoors 가로반전으로 대칭 더블도어 완성)**:
  바로 아래 항목("문 개폐 애니메이션 상호작용 구현")에서 만든 문을 사용자가 실제로 열어보니, 오른쪽
  2칸(`houseDoors` 타일셋)은 정상 애니메이션되는데 **왼쪽 2칸(`house1` 타일셋)은 열리는 도중 타일이
  그냥 사라져버린다**고 재보고. `house1.png`/`houseDoors.png`를 PowerShell(`System.Drawing.Bitmap`)로
  직접 각 프레임 타일 좌표만큼 잘라서(8배 확대) 눈으로 대조한 결과, 왼쪽 칸의 "열리는" 후속 프레임으로
  authored된 `house1` 타일 id 45/46/47(및 52/53/54)이 **전부 완전히 빈 칸(미사용 슬롯)** 이었음을
  확인 - 코드 버그가 아니라 그 위치에 애초에 그림이 없는 것이었다(닫힘 프레임인 id30/37 자체는 정상
  그림). 반면 `houseDoors`는 6개 row(0~5)가 각각 "문 하나"를 색상만 다르게(살구/빨강/... 벽돌 테두리)
  완전히 갖춘 스탠드얼론 문 스프라이트(위/아래 2칸, 4프레임 스윙 애니메이션 전부 실제 그림 있음)임을
  각 row의 4프레임을 이어붙여 확인 - "왼쪽 반쪽 + 오른쪽 반쪽" 짝이 아니라 문 하나가 통째로 반복된
  구조였다. 사용자에게 ① 왼쪽 칸을 애니메이션 없는 정적 장식으로 되돌리거나 ② `houseDoors`의 같은
  타일을 가로 반전(flip)해서 좌우 대칭 더블도어로 만드는 두 방향을 제안했고, 사용자가 "다른 색상
  말고 같은 색상 세트에 가로반전"을 선택 - Tiled GUI에서 직접 왼쪽 칸을 `houseDoors` id3(위)/id10
  (아래) 타일로 교체하고 가로 반전 플래그를 걸어 저장.
  ① `untitled.tmx`를 재export해 `village.json` 갱신, `Doors` 레이어의 raw gid를 직접 대조해 왼쪽
  두 칸이 오른쪽과 동일한 bare gid(9234/9241)에 `FLIPPED_HORIZONTALLY_FLAG`(0x80000000)만 얹힌 값으로
  바뀐 것을 확인. ② 코드 쪽은 수정이 필요 없었다 - Phaser의 Tiled 파서가 flip 비트를 gid에서 분리해
  `Tile.flipX`로 따로 저장하고 `Tile.index`는 항상 순수 인덱스만 갖도록 파싱하며(`ParseTileLayers.js`
  확인), `_updateDoors()`의 `layer.putTileAt(gid, col, row)`는 인자가 숫자(Tile 인스턴스가 아님)일 때
  기존 Tile 객체의 `.index`만 갱신하고 나머지 속성(`flipX` 포함)은 그대로 두는 것을 Phaser 소스
  (`PutTileAt.js`)로 직접 확인했다 - 즉 애니메이션 프레임을 넘기는 동안에도 반전 상태가 저절로 유지됨.
  **검증**: Playwright로 (a) 왼쪽 두 칸이 이제 `houseDoors` 타일셋(gid 9234/9241)에 `flipX:true`로
  잡히고 오른쪽과 완전히 동일한 프레임 시퀀스(9234→9233→...→9231)를 따라가는 것, (b) opening 중간
  프레임에서도 좌우 모두 정확히 같은 프레임으로 동기화되는 것, (c) open 완료 시 4칸 전부
  `collides:false`, 다시 닫으면 전부 `collides:true`로 정상 토글되는 것까지 확인. 추가로 줌 3배
  스크린샷으로 (d) 닫힘 상태가 손잡이가 마주보는 대칭 더블도어로 보이는 것, (e) 열림 상태에서 양쪽
  문이 동시에 좌우 대칭으로 스윙해 열리고 내부가 드러나는 것까지 육안으로 확인함(스크린샷은 세션
  스크래치패드에 저장, 사라졌을 수 있음 - 필요하면 동일 방식으로 재촬영).
  참고로 이 라운드에서 Tiled 스크립팅 API(`tiled --evaluate`)로 tmx를 직접 자동 편집하는 방법도
  시도했으나(사용자가 결국 직접 Tiled GUI로 수정을 완료해 불필요해짐), `tiled.open()`은 headless
  `--evaluate` 모드에서 "Editor not available" 오류가 남을 확인(UI 에디터가 필요한 API라 커맨드라인
  전용 모드에서는 안 됨 - 대신 `tiled.mapFormat()`/`tiled.tilesetFormats` 같은 포맷 객체의
  `read()`/`write()`를 써야 하는 것으로 추정, 실제 사용까지는 검증 못 함). **교훈**: 앞으로 tmx를
  코드로 직접 자동 편집해야 할 일이 생기면 `tiled.open()`이 아니라 포맷 객체 경로부터 확인할 것.
- **2026-08-11 (문 개폐 애니메이션 상호작용 구현 + 첫 번째 실제 건물 House1 통합)**: 사용자가 Tiled에서
  집 하나(그룹 레이어 `House1` - 기존 Cave와 동일한 `Interiors`/`WInteriors`/`Walls`/`Roofs`/`Darkness`
  구성에 `Doors` 타일 레이어 + `DoorObject` 오브젝트 레이어를 추가)를 직접 만들고, "상호작용 키로 문을
  열고 닫을 수 있게 해달라(잠금은 이번엔 보류)"고 요청. 사전 설계 논의(이전 세션)에서 사용자가 두 가지
  핵심 우려를 정확히 짚었다: ① Tiled Tile Animation Editor로 애니메이션을 만들면 물 흐르는 연출처럼
  자동으로 무한 루프되는 것 아니냐 → 데이터(프레임 목록)만 재사용하고 재생은 코드가 직접 제어하면
  해결됨. ② 판정 존과 충돌 범위를 하나의 사각형으로 겸하면, 닫혀있을 때 그 사각형 자체가 벽이 되어
  "안에 들어가야" 뜨는 열기 프롬프트를 영원히 못 띄우는 모순이 생김 → 판정 존(넉넉한 크기, 손으로 그림)과
  충돌 범위(문 타일의 실제 칸, 타일 데이터에서 자동 유도)를 분리해서 해결. 이번 세션에서 그대로 구현.
  ① `untitled.tmx`(mtime 2026-08-11 01:25)를 재export해 `village.json` 교체(1838935→최신바이트,
  130x120 유지, 타일셋 43개로 증가 - 신규 `houseDoors`). `houseDoors.png`를
  `Tilesets/building houses/builed houses/`에서 `public/tilesets/`로 복사하고
  `tiledTilesetManifest.js`에 매핑 추가. 사용자가 이미 각 문 타일 칸(2x2, 4칸)마다 Tiled Tile Animation
  Editor로 4프레임 애니메이션(120ms×4, index 0 = 맵에 배치된 원본 = 닫힘, 마지막 = 열림)을
  `house1`/`houseDoors` 두 타일셋에 나눠 만들어둔 상태였음(사용자가 이미 사전 안내대로 준비해놓음).
  `DoorObject` 오브젝트 레이어의 사각형 1개(문 타일 footprint보다 위/아래로 여유 있게 그려짐 - 정확히
  의도한 "판정 존 > 충돌 범위" 구조)도 확인.
  ② `TiledMapTestScene.js`에 문 시스템 신설(계단(`stairZones`)과 동일한 패턴 - 물리 바디 없는 순수
  데이터 존 + `update()` 직접 사각형 검사, `physics.add.overlap()` 미사용):
  `_buildDoorZones()` - 리프 이름에 "door"가 들어간 타일 레이어(`Doors`)에서 애니메이션 프레임이 있는
  칸만 수집하고, 리프 이름에 "door"가 들어간 오브젝트 레이어(`DoorObject`)의 사각형마다 그 사각형
  안에 중심이 들어오는 문 타일 칸들을 묶어 문 하나로 구성(여러 문이 같은 "Doors" 레이어를 공유해도
  사각형별로 자동 분리됨). 초기 상태는 closed, 각 칸의 Tile 인스턴스에 직접 `setCollision(true)`.
  `_findDoorZoneForPlayer()` - 계단과 동일한 사각형 겹침 판정. `_updateDoors(delta)` - opening/closing
  상태인 문만 Tiled가 authored한 프레임 duration을 그대로 따라가며 `layer.putTileAt()`으로 프레임을
  진행시키고, 완전히 열렸을 때만 충돌 해제·완전히 닫혔을 때만 충돌 재적용(중간에 바꾸면 그 칸에 서 있는
  플레이어가 어색하게 밀려날 수 있어서 전이 완료 시점에만 토글). `_handleDoorInteractKey()` - 문 존
  안에 있고 전환 중이 아닐 때만 상태 토글. 상호작용 키는 처음엔 `update()`에서 `Phaser.Input.Keyboard.
  JustDown()`으로 폴링했으나, 이미 `MainScene.js`가 NPC 상호작용에 쓰고 있던 `this.input.keyboard.on
  ("keydown-E", ...)` 이벤트 리스너 패턴으로 통일(아래 버그 참고).
  **버그 발견 및 수정 2건**: (a) `Tileset.getTileData(tileIndex)`는 인자로 **gid(전역 인덱스)** 를 받아
  내부적으로 `firstgid`를 빼는데, 이미 로컬 id로 변환해둔 값을 넘겨서 이중으로 차감되어 항상
  `undefined`를 반환 → 문이 하나도 안 잡힘(`doorZones.length === 0`). `tile.index`(gid)를 그대로
  넘기도록 수정. (b) `JustDown()` 폴링 방식이 Playwright 자동화 키 입력에서 간헐적으로 눌림을 놓침
  (동일한 `page.keyboard.press("e")` 호출인데도 재현 안 되게 실패/성공이 갈림 - 물리 서브스텝/렌더
  프레임 불일치로 overlap 콜백이 한 프레임씩 밀리는 것을 실측했던 계단 버그와 같은 계열의 "폴링 타이밍
  불안정" 문제로 추정). `keydown-E` 이벤트 리스너 방식으로 교체한 뒤에는 반복 재현 테스트(닫힘→열림→
  닫힘→열림)가 전부 안정적으로 통과함.
  **검증**: 로컬 Chrome(Playwright, `ms-playwright/chromium-1228`의 사전 설치된 바이너리를
  `executablePath`로 직접 지정 - npx 캐시의 playwright 패키지 버전과 자동 설치된 브라우저 리비전이
  달라 기본 `chromium.launch()`가 실행 파일을 못 찾는 문제 회피)로 (a) `doorZones` 1개, 칸 4개(2x2)
  정확히 인식, (b) 판정 존 안에서만 "[E] 문 열기" 프롬프트 표시/그 밖에서는 숨김, (c) 닫힘 상태에서
  실제 물리 이동(W 홀드)으로 문 칸 진입 시도 시 타일 경계에서 정확히 막힘(위치가 문 하단 경계
  근처에서 멈춤), (d) E키로 열기 시작 시 `state`가 즉시 `opening`으로 전환, 프레임 duration(120ms×4=
  480ms) 경과 후 `open`으로 확정되며 4칸 전부 `collides:false`로 전환, (e) 열린 상태에서 실제 물리
  이동으로 문을 통과해 건물 내부까지 걸어 들어가는 것 확인, (f) 다시 E로 닫으면 `closed` +
  4칸 전부 `collides:true`로 복원, (g) 열기→닫기→열기 반복도 안정적으로 재현, (h) 회귀 없음 - 계단
  존 5개(`Stair` 1 + `StairStraight` 4), `House1`/`Cave` 둘 다 hideOnEnter/showOnEnter 그룹으로
  정상 자동 등록, 콘솔 경고/에러 0건까지 확인. 검증에 쓴 `window.__doorDebugScene` 임시 훅은 확인 후
  코드에서 제거.
  잠금(locked) 로직은 이번 라운드에서 의도적으로 보류(사용자 요청) - 문 존 데이터 구조상 `locked`
  필드 하나와 판정 분기만 나중에 얹으면 되도록 자리를 남겨둠.
- **2026-08-09 (기본/계단 속도 재조정)**: 사용자가 바로 아래 항목에서 정한 속도가 전반적으로 빠르다고
  느껴 "기본 220, 계단 150으로 줄여달라, 달리기는 그대로"라고 요청. `TiledMapTestScene.js`의
  `MOVE_SPEED`(300→220), `STAIR_MOVE_SPEED`(200→150) 두 상수만 변경(`RUN_MOVE_SPEED=450`은 그대로,
  로직 변경 없음). 로직 자체는 직전 항목에서 이미 Playwright로 검증된 것과 동일해 숫자만 바뀐 것이라
  재검증은 생략함(문법/lint만 확인).
- **2026-08-09 (이동 속도 체계 정리 - 기본/계단/달리기 3단으로 분리)**: 사용자가 "이동속도 기본
  300으로, 계단 오를 때는 200, Shift 누르면 달리기로 450"이라고 구체적인 수치와 함께 요청. 기존에는
  `MOVE_SPEED = 450`(평소 이동) 하나만 있고 계단은 그 배수(`STAIR_MOVE_SPEED_MULTIPLIER = 0.6`→270)로
  파생시켰는데, 이번 요청은 세 값이 서로 독립적이라(계단 200은 평소 300의 배수가 아님) 계단 속도를
  고정 상수 `STAIR_MOVE_SPEED = 200`으로 바꾸고, `RUN_MOVE_SPEED = 450`을 신설, `MOVE_SPEED`는
  450→300으로 낮춤. Shift 키를 `this.keys`에 추가(`addKeys("W,S,A,D,SHIFT")`)하고, `update()`의 속도
  선택 로직을 "계단 위면 무조건 STAIR_MOVE_SPEED(Shift를 눌러도 계단에서는 못 뛰게 함, 계단을 뛰어
  오르는 연출은 요청 범위 밖이라고 판단) → 계단이 아니면 Shift 여부로 RUN_MOVE_SPEED/MOVE_SPEED 중
  선택"으로 재작성. **검증**: 로컬 Chrome을 붙인 Playwright로 (a) 평지에서 D만 눌렀을 때 정확히
  `(300,0)`, D+Shift일 때 `(450,0)`, (b) `Stair`(대각선) 존에서 D만 눌렀을 때 크기 200짜리 대각선
  `(178.9,-89.4)` = 정규화된 (2,-1)×200, D+Shift를 눌러도 완전히 동일한 값(달리기가 무시됨), (c)
  `StairStraight` 존에서 W만 눌렀을 때 `(0,-200)`, W+Shift도 동일값(달리기 무시)까지 전부 정확히
  일치함을 확인. 검증에 쓴 `window.__stairDebugScene` 임시 훅은 확인 후 제거.

- **2026-08-09 (StairStraight 추가 - 세로/가로 계단은 대각선 스냅 없이 감속만)**: 바로 아래 항목에서
  대각선 계단(`Stair`)을 구현한 직후, 사용자가 "계단 방향이 세로인 곳도 있는데 거긴 대각선 로직은 빼고
  속도 감속만 남기고 싶다"고 요청 + 새 레이어를 만들지, 이름은 뭘로 할지 질문. 세로/가로로 곧게 뻗은
  계단은 W/A/S/D 입력이 이미 그림과 정확히 일치하니 대각선 스냅이 오히려 방해가 된다고 판단해, 별도
  오브젝트 레이어 `StairStraight`(감속만, 스냅 없음)를 신설하고 기존 `Stair`(대각선 스냅 + 감속)는
  그대로 유지하도록 제안 → 승인받아 구현. ① `untitled.tmx`(mtime 20:03, 재최신)를 재export해
  `village.json` 교체(1837327→1838935바이트, 구조는 동일, 최상위에 `StairStraight` 오브젝트 레이어
  추가됨 - 사각형 4개, 전부 커스텀 프로퍼티 없음: (3424.5,671,64x33), (3424.5,479,63.5x33),
  (3425.5,384,61.5x32), (3487.5,256,63.5x32)). ② `TiledMapTestScene.js` 수정: `_buildStairZones()`가
  이제 리프 레이어 이름에 "straight"가 들어있는지로 각 존에 `snap: boolean` 플래그를 매김("Stair" →
  `snap:true` + 기존과 동일한 dirX/dirY 방향 데이터, "StairStraight" → `snap:false` + `direction:null`,
  방향 스냅을 안 하니 방향 데이터 자체가 불필요함). `_findStairDirectionForPlayer()`를
  `_findStairZoneForPlayer()`로 이름 변경하고 반환값을 방향 벡터 대신 존 전체({snap, direction})로
  바꿈. `update()`는 존이 있으면(snap 여부 무관) 항상 감속을 적용하고, `snap`이 true일 때만 추가로
  입력을 대각선으로 강제하도록 분기. **검증**: 로컬 Chrome을 붙인 Playwright로 (a) `stairZones` 배열에
  `Stair` 1개(snap:true, direction:{dx:2,dy:-1})와 `StairStraight` 4개(snap:false, direction:null)가
  정확히 반영됨, (b) `Stair` 존에서는 D만 눌러도 W만 눌러도 동일하게 대각선 `(241.5,-120.7)`로 스냅됨
  (기존 동작 회귀 없음), (c) `StairStraight` 존에서는 W만 누르면 순수 수직 `(0,-270)`, D만 누르면 순수
  수평 `(270,0)`으로 - 방향은 안 바뀌고 속도만 0.6배(270=450×0.6)로 줄어드는 것을 정확히 확인. 검증에
  쓴 `window.__stairDebugScene` 임시 훅은 확인 후 제거.
- **2026-08-09 (계단 오브젝트 레이어 추가 + 대각선 스냅 이동 기능 구현)**: 사용자가 스크린샷으로 중앙
  계단 부분을 지적 - CollisionLayer가 32x32 등 사각형 단위로만 막혀있어서 계단을 오를 때 "덜컹거리며
  끊기는" 느낌이 들고, 계단 그림 자체도 오르는 느낌이 안 산다고 보고. 여러 라운드 논의 끝에 최종
  방향 확정: CollisionLayer 정밀도를 더 올리는 대신(가진 부분 사각형 해상도가 16x16/16x32/32x32뿐이라
  계단의 실제 x:y=2:1 완만한 비율을 못 따라감), 계단 위에서는 **입력 자체를 계단 기울기의 대각선으로
  강제 스냅**하는 방식을 채택 - 우측(D) 또는 위(W) 입력 시 오른쪽 위 2:1 대각선으로, 좌측(A) 또는
  아래(S) 입력 시 반대로 왼쪽 아래 대각선으로 이동하고, 계단 위에서는 이동 속도를 0.6배로 감속.
  ① `untitled.tmx`(mtime 19:31, 기존 `village.json`보다 최신)를 `tiled.exe --export-map json`으로
  재export해 `Frontend/public/maps/village.json` 교체(1836716→1837327바이트, 130x120/타일셋 42개 등
  구조는 그대로, 최상위에 사용자가 새로 그린 `Stair`라는 오브젝트 레이어가 추가됨 - 사각형 오브젝트
  1개, 커스텀 프로퍼티 없음, 좌표 (2144.33, 2079.67), 크기 64x64.33). ② `TiledMapTestScene.js`에
  `_buildStairZones()`(리프 이름에 "stair"가 들어간 오브젝트 레이어의 사각형들을 순수 데이터
  `{x0,y0,x1,y1,direction}`로 모음 - dirX/dirY 커스텀 프로퍼티가 있으면 그 값을, 없으면 기본값
  `STAIR_ASCEND_DIRECTION_DEFAULT = {dx:2, dy:-1}`을 씀, 계단마다 다른 각도/방향도 코드 변경 없이
  지원됨)와 `_findStairDirectionForPlayer()`(플레이어 바디와 사각형 대 사각형 직접 검사)를 추가하고,
  `update()`에서 이 존 위에 있을 때 raw 입력의 부호가 계단의 전진/후진 축과 맞으면 완전한 대각선
  속도로 덮어쓰도록 수정(`STAIR_MOVE_SPEED_MULTIPLIER = 0.6`로 감속도 함께 적용). **버그 발견 및
  수정**: 처음엔 Roof 트리거와 동일한 `physics.add.overlap()` 콜백 패턴으로 구현했으나, Playwright로
  프레임별 값을 로깅해보니 Arcade Physics의 물리 서브스텝이 렌더 프레임과 항상 1:1로 맞물리지 않아서
  overlap 콜백이 매 프레임이 아니라 **한 프레임씩 걸러 호출**되는 것을 발견(로그: `dx:2,dy:-1` →
  `null` → `dx:2,dy:-1` → `null` ... 정확히 교대). Roof 트리거는 페이드가 몇 프레임 밀려도 안 보이니
  무해했지만, 매 프레임 속도를 직접 정해야 하는 계단은 그 프레임마다 원래 속도로 되돌아가 버벅였다.
  overlap 이벤트 의존을 완전히 버리고 `update()`마다 직접 사각형 대 사각형 검사를 하는 방식으로
  교체해 해결(물리 바디 자체가 필요 없어져 `stairZoneGroup`도 제거하고 순수 데이터 배열로 단순화).
  **검증**: 로컬 Chrome을 붙인 Playwright로 (a) 계단 존 위에서 D만 누르면 속도가 정확히
  `(241.5, -120.7)`(= 정규화된 (2,-1) × 270 = 450×0.6, 계산값과 부동소수점까지 정확히 일치), W만
  눌러도 동일한 대각선, A/S만 누르면 정확히 반대 부호의 대각선이 되는 것, (b) 존 밖에서는 D만 눌렀을 때
  순수 수평 `(450, 0)`으로 평소와 동일하게 동작하는 것(계단 로직이 존 밖으로 새지 않음), (c) 존 안에서
  D를 계속 눌러 8프레임 연속 샘플링한 결과 `(241,-121)`이 흔들림 없이 유지되다가(수정 전엔 매 프레임
  교대로 깨졌던 것과 대조) 존을 실제로 빠져나간 시점에만 자연스럽게 `(450,0)`으로 전환됨을 확인. 검증에
  쓴 `window.__stairDebugScene` 임시 훅과 디버그 `console.log`는 확인 후 코드에서 제거함.
- **2026-08-06 (이동 속도/카메라 줌/시작 좌표 조정 + 디버그 HUD가 줌에 같이 축소되던 버그 수정)**:
  사용자가 "맵이 넓어서 이동이 오래 걸린다(이동 속도 증가), 타일이 더 작게 보이게 시야를 넓혀달라(줌 아웃),
  첫 접속 시작 위치를 pos:(2100,2140)으로 해달라"고 요청. `src/game/scenes/TiledMapTestScene.js` 수정:
  ① `MOVE_SPEED` 220→450, ② `CAMERA_ZOOM` 상수 신설 후 `cameras.main.setZoom()`에 적용(처음 0.6으로
  넣었다가 사용자가 "0.8로 고쳐달라"고 재요청해 0.8로 조정), ③ 플레이어 스폰 좌표를 `(300,300)`→
  `(2100,2140)`으로 변경.
  이후 사용자가 "줌 아웃하니 좌상단 pos/fps 디버그 텍스트도 같이 작아지고 화면 구석이 아니라 중앙 쪽으로
  밀린 것처럼 보인다, 이거 왜 이러냐"고 재보고. **원인**: `debugText`는 `setScrollFactor(0)`로 카메라
  스크롤(이동)에는 안 끌려가게 해뒀지만, Phaser 카메라의 `zoom`은 scrollFactor와 무관하게 그 카메라가
  그리는 모든 오브젝트에 그대로 곱해지는 변환이라, 메인 카메라를 줌 아웃하면 화면 좌표 `(8,8)`도 줌
  배율만큼 축소된 위치로 그려지고 폰트 크기도 함께 줄어든다(맵의 일부가 아닌 순수 UI인데도 맵과 같은
  카메라를 공유해서 생긴 문제 — "벽 뒤에 가려진다"는 것도 사실은 같은 원인: 다른 오브젝트들과 같은
  월드 depth 공간에서 줌/스크롤을 공유하다 보니 위치 계산이 어긋나 보인 것). **수정**: `create()` 끝부분에
  zoom=1로 고정한 `this.uiCamera`(`this.cameras.add(...)`)를 별도로 추가하고, 지금까지 만들어진 월드
  오브젝트 전체(`this.children.list` 스냅샷)를 이 UI 카메라가 그리지 않도록 `ignore()` 처리, 반대로
  `debugText`는 메인(줌 적용) 카메라 쪽에서 `ignore()`해서 UI 카메라에서만 그려지게 분리 — 디버그 텍스트가
  줌/스크롤에 전혀 영향받지 않고 항상 실제 화면 좌상단 `(8,8)`에 12px 그대로 표시됨. 향후 HUD 요소를
  추가할 때도 같은 방식(월드는 메인 카메라, UI는 uiCamera)을 따를 것.
- **2026-08-06 (네 번째 맵 재export - 맵 크기 축소 + Y-정렬 메커니즘 Forest 전용에서 범용으로 일반화)**:
  사용자가 `untitled.tmx`에서 맵 크기를 150x150→130x120으로 줄이고, "나무뿐 아니라 가운데에 있는
  석상/비석 타일에도 Y-정렬을 쓰고 싶은데 가능한지" 질문. ① `untitled.tmx`(mtime 01:54)를 재export해
  `village.json` 교체(2425774→1836716바이트, 맵 크기 축소로 전체적으로 작아짐 - 타일셋 42개는 변동
  없음, Forest 나무 총합도 4040→3660칸으로 줄어듦(맵 밖으로 밀려난 부분이 잘려나간 것으로 추정), Cave/
  Mountain 등 다른 그룹 구조는 그대로). 맵에는 아직 석상/비석 전용 레이어가 없음(타일셋 어디에도 관련
  커스텀 속성 없음, `Tile Layer 2~5`는 `Ruins`/`TX Props` 등 여러 데코 타일셋이 뒤섞인 범용 데코
  레이어라 특정 오브젝트만 집어낼 수 없었음) - 사용자 질문을 "지금 당장 있는 석상 타일을 찾아 처리"가
  아니라 "앞으로 그런 콘텐츠를 추가할 때 코드 변경 없이 되게 해달라"는 의미로 해석해 메커니즘을
  일반화하는 방향으로 진행. ② `TiledMapTestScene.js` 리팩터: 기존에 `/^forest\/tree\d+$/i` 정규식으로
  Forest 그룹의 나무 레이어만 하드코딩 판별하던 것을, 새 메서드 `_isYSortLayerName(fullName)`으로
  분리해 두 조건 중 하나만 맞아도 Y-정렬 대상이 되도록 확장: ① 기존 Forest/Tree1~12 규칙(하위 호환,
  이미 있는 맵을 다시 손볼 필요 없게 유지) ② **리프 타일 레이어 이름에 "ysort"가 부분 문자열로 들어간
  임의의 레이어**(신규 - 그룹 소속 여부 무관, "roof"/"wall"/"darkness" 이름 매칭과 같은 패턴). 관련
  메서드/필드도 Forest 전용 이름에서 범용 이름으로 개명: `_buildForestMergedOccupancy`→
  `_buildYSortMergedOccupancy`, `_buildForestColumnRunDepths`→`_buildYSortColumnRunDepths`,
  `_renderForestTreeLayerVisuals`→`_renderYSortLayerVisuals`, `_treeTileFrameCache`→
  `_ySortTileFrameCache`(프레임 캐시 키 접두사도 `tree-tile-`→`ysort-tile-`). 클래스/상수 docblock도
  전부 "Forest 나무" 전용 설명에서 "Y-정렬 대상 오브젝트(나무, 석상, 비석 등)" 일반 설명으로 갱신.
  충돌(밑둥/받침대)은 이 리팩터와 무관하게 계속 `CollisionLayer`(①번 메커니즘)가 담당 - 사용자가
  Tiled에서 새 오브젝트 밑에도 똑같이 `collides:true` 타일을 놓으면 됨. **사용법**: 석상/비석 타일을
  담을 새 타일 레이어를 만들고 이름에 "ysort"만 포함시키면(예: "StatueYSort") 코드 변경 없이 바로
  Y-정렬 대상이 됨. **검증**: Playwright로 (a) 맵 크기 130x120(4160x3840px)이 그대로 로드됨, (b) Forest
  이미지 오브젝트 개수가 새 합계(3660개)와 정확히 일치(리팩터로 인한 개수 변화 없음), (c) 맵에서 가장
  긴 세로 연결 구간(열 127, 행 0~40, 41칸)에 걸친 나무 타일 117개가 여전히 정확히 동일한 depth(1312)
  하나로 묶임(리팩터 후 회귀 없음), (d) `_isYSortLayerName()`을 직접 호출해 "Forest/Tree3"(레거시,
  true), "Statues/StatueYSort"·"Graveyard/GravestoneYsort"·최상위 "YSort"(신규 규칙, 전부 true),
  "Mountain/MountainFloor"·"CollisionLayer"·"Cave/Interiors"(전부 false)까지 8가지 케이스로 매칭 로직
  자체를 검증, (e) CollisionLayer 타일 플래그(전체-차단 타일 collides=true, 정밀 사각형 타일
  collides=false, `preciseHitboxZoneGroup` 762개 존)도 리팩터 후 회귀 없이 정상 확인. 검증에 쓴
  `window.__debugScene` 임시 훅은 확인 후 제거.

- **2026-08-06 (세 번째 맵 재export + Tree1~12 전체 확장/CollisionLayer 대량 추가분 검증)**: 사용자가
  `untitled.tmx`에 이번엔 `Tree1`~`Tree12` 전체 레이어에 나무를 추가(직전 재export 대비 Forest 총
  필드 수 약 2000→4040개, 특히 Tree5~12도 이번에 처음 큰 폭으로 늘어남 - 예: Tree7 81→373, Tree5
  113→432)하고 `CollisionLayer`도 대폭 추가(407→935칸)한 뒤 다시 "Y-정렬/CollisionLayer 추가분이 잘
  작동하는지 확인해달라"고 요청. ① `untitled.tmx`(mtime 01:37)를 재export해 `village.json` 교체
  (2417070→2425774바이트). 타일셋이 39→42개로 늘어 눈(snow) 테마 신규 3종(`TX Plant Snow`,
  `SnowHighTilesSheet`, `SnowBasicTiles`)의 PNG를 원본 에셋 폴더에서 `public/tilesets/`로 복사하고
  `tiledTilesetManifest.js`에 매핑 추가(기존 관행 그대로) - Forest 나무 중 일부가 이 `TX Plant Snow`
  타일셋도 섞어 쓰기 시작함(`exterior`/`TX Plant`에 이어 세 번째 나무 타일셋). ② Y-정렬 검증:
  Playwright로 (a) 변환된 나무 이미지 오브젝트 개수가 새 합계(4040개, 텍스처 키 `exterior`+`TX_Plant`+
  `TX_Plant_Snow` 전부 정상 로드, 콘솔 경고 없음)와 정확히 일치, (b) 맵 전체에서 가장 긴 세로 연결
  구간(열 137, 행 6~50, 45칸짜리 - 나무가 빽빽한 원래 숲 구역 안에 있음)에 걸친 나무 타일 127개가 전부
  정확히 동일한 depth(1632 = (마지막 행+1)×32) 하나로 묶임을 확인, (c) 플레이어를 그 구간 중간에 두면
  depth가 더 낮아(뒤에 가려짐) 구간 바로 아래로 내려가면 depth가 더 높아짐(앞으로 나옴)을 확인 - 지금까지
  나온 가장 긴 연결 구간에서도 컬럼 런 depth 로직이 정확히 작동함(회귀 없음). ③ CollisionLayer 대량
  추가분 검증: 새 935칸을 뜯어봐도 여전히 기존과 동일한 10종 타일(전체-차단용 gid 5828 + Tile Collision
  Editor 사각형이 있는 9종)만 쓰이고 있어 CollisionLayer 정밀 히트박스 수정 로직이 코드 변경 없이 그대로
  적용됨을 확인. Playwright로 (a) 새 영역의 전체-차단 타일은 `tile.collides===true` 유지, 사각형이
  있는 타일은 `tile.collides===false`로 정확히 꺼져 있음, (b) `preciseHitboxZoneGroup`(753개 존)에서
  strip형(로컬 (0,0,16,32))과 정사각형(로컬 (8,8,16,16)) 타일 각각의 실제 정적 존 좌표를 직접 조회해
  Tiled 원본 사각형 좌표와 픽셀 단위로 정확히 일치함을 확인(이 방식이 실제 걷기 시뮬레이션보다 더
  신뢰도 높음을 이번에 재확인 - 사각형 폭이 16px 이하로 좁은 타일은 플레이어 바디 폭(20px)보다 좁아서
  "덮이지 않은 절반만 통과하는지"를 걷기로 테스트하면 바디가 항상 사각형 경계에 걸치는 위양성이 남,
  좌표 직접 대조가 이런 경우엔 더 정확한 검증 방법), (c) 전체-차단 타일 하나에는 실제 물리 이동으로
  타일 상단 경계에서 정확히 멈추는 것까지 실측 확인 - 새로 대폭 늘어난 CollisionLayer 타일도 전부
  의도대로 작동. 검증에 쓴 `window.__debugScene` 임시 훅은 확인 후 제거.

- **2026-07-27 (두 번째 맵 재export + Forest 확장/CollisionLayer 추가분 검증)**: 사용자가 `untitled.tmx`에
  나무를 `Tree1`~`Tree4`에 대량 추가(기존에는 지도 우측 하단 한 구역에만 몰려있던 숲이 이제 row 7~129,
  col 92~149에 걸쳐 훨씬 넓게 흩어짐 - 각 레이어 필드 수 Tree1 158→360, Tree2 164→357, Tree3 121→297,
  Tree4 105→295)하고 `CollisionLayer`도 추가(262→407칸)한 뒤 "Y-정렬이랑 CollisionLayer 추가분이 잘
  작동하는지 확인해달라"고 요청. ① `untitled.tmx`(mtime 00:53)를 같은 CLI로 재export해 `village.json`
  교체(2343545→2417070바이트, 타일셋은 여전히 39개로 변동 없음 - 신규 타일셋 없어 매니페스트 수정 불필요,
  다만 새로 늘어난 나무 일부가 기존 `exterior` 대신 `TX Plant` 타일셋을 섞어 씀이 확인됨, 이미 매니페스트에
  있어 별도 조치 불필요). ② Y-정렬 검증: Playwright로 (a) 변환된 나무 이미지 오브젝트 개수가 정확히 새
  Tree1~12 합계(1993개, 텍스처 키 `exterior`+`TX_Plant` 둘 다 정상 로드)와 일치, (b) 새로 넓게 흩어진
  영역에서 고른 11행짜리 세로 연결 구간(열 96, 행 8~18)에 걸친 나무 타일 18개가 전부 정확히 동일한
  depth(608 = `_buildForestColumnRunDepths`가 계산하는 (마지막 행+1)×32) 하나로 묶임을 확인,
  (c) 플레이어를 그 구간 중간(y=508)에 두면 depth 520으로 나무보다 낮아(뒤에 가려짐) 구간 바로 아래
  (y=658)로 내려가면 depth 670으로 나무보다 높아짐(앞으로 나옴)을 확인 - 나무가 훨씬 넓게 퍼진 뒤에도
  Y-정렬 로직이 그대로 정확히 작동함(기존 로직 변경 없음, 회귀 없음). ③ CollisionLayer 추가분 검증:
  새로 늘어난 145칸을 뜯어보니 기존과 동일하게 10종 타일(전체-차단용 gid 5828 + Tile Collision Editor
  사각형이 있는 9종)만 반복 사용되고 있어 바로 위 항목(CollisionLayer 정밀 히트박스 수정)의 일반 로직이
  코드 변경 없이 그대로 적용됨을 확인. Playwright로 (a) 새 영역의 전체-차단 타일(gid 5828, 사각형 없음)은
  `tile.collides===true` 유지, (b) 사각형이 있는 타일(gid 5840/5844)은 `tile.collides===false`로 정확히
  꺼져 있고 `preciseHitboxZoneGroup`(369개 존)이 그 사각형을 담당, (c) 실제 물리 이동으로 사각형 타일의
  덮인 절반은 사각형 상단 경계에서, 덮이지 않은 절반은 통과해 그 바로 아래(같은 열의 다음 전체-차단
  타일) 경계에서 정확히 멈추는 것까지 실측 확인 - 새로 추가된 CollisionLayer 타일도 전부 의도대로 작동.
  검증에 쓴 `window.__debugScene` 임시 훅은 확인 후 제거.

- **2026-07-27 (CollisionLayer가 Tile Collision Editor 사각형을 무시하고 타일 전체를 막던 버그 수정)**:
  바로 아래 항목("Forest 밑둥 충돌 방식 교체")에서 CollisionLayer 방식으로 바꾼 직후, 사용자가 "CollisionLayer도
  Cave의 Interior처럼 Tile Collision Editor로 충돌 범위를 잘라둔 건데 지금은 타일 한 칸씩 그대로 막힌다"고
  재보고. 실제로 `collision` 타일셋을 뜯어보니 CollisionLayer에 쓰인 타일 10종 중 9종이 `collides:true`
  속성과 **동시에** Tile Collision Editor 사각형(예: gid 5836은 로컬 (16,0) 기준 16x16 사각형)을 둘 다
  갖고 있었다 - 즉 사용자는 이미 Interiors와 같은 방식으로 부분 차단 타일을 만들어뒀는데, 코드가
  `layer.setCollisionByProperty({collides:true})`로 그 타일들을 통째로 전체-타일(32x32) 충돌로 켜버려서
  `_buildPreciseTileHitboxZones`가 만든 정확한 사각형이 무의미해지고 있었다(버그 2022-07-22 항목에서
  Interiors에 겪었던 것과 정확히 같은 버그가 CollisionLayer에도 있었던 것 - 그때는 `collides:true`
  속성이 없는 타일이라 문제가 안 됐을 뿐). **수정**(`TiledMapTestScene.js` 레이어 생성 루프): 여전히
  `setCollisionByProperty({collides:true})`로 전체-타일 충돌을 먼저 켜지만, 그 직후 레이어의 모든 타일을
  훑어 `tile.getCollisionGroup().objects`가 비어있지 않은 타일 인덱스만 모아 `layer.setCollision([그
  인덱스들], false)`로 방금 켠 전체-타일 충돌을 다시 끈다 - 그 타일들의 실제 충돌은 바로 아래
  `_buildPreciseTileHitboxZones`가 만드는 정확한 사각형 존이 담당한다. `collides:true`이면서 Tile
  Collision Editor 사각형이 없는 타일(예: gid 5828, CollisionLayer의 기본 전체 차단 타일, 이번에 262칸
  중 105칸)은 로직 변경 없이 그대로 전체 타일이 막힌다 - Interiors 등 다른 모든 레이어에도 동일하게
  적용되는 일반 로직으로 작성했으므로 CollisionLayer만의 특수 분기는 아니다. **검증**: Playwright로
  (a) Tile Collision Editor 사각형이 없는 타일(row10,col10, gid 5828)은 여전히 정확히 타일 상단 경계
  (y=320)에서 막히는 것(회귀 없음), (b) 사각형이 있는 타일(row111,col119, gid 5836, 로컬 (16,0)~(32,16))
  에서 사각형이 덮는 절반(x=3830)으로 걸어 들어가면 사각형 상단 경계(y=3552)에서 정확히 막히는 것,
  (c) 같은 타일에서 사각형이 안 덮는 나머지 절반(x=3812)으로 걸어 들어가면 예전엔 막혔던 지점을 그대로
  통과해 타일 범위를 완전히 벗어나는 것(수정 확인)까지 실측 확인. 검증에 쓴
  `window.__collisionDebugScene` 임시 훅은 확인 후 제거.

- **2026-07-27 (맵 재export + Forest 밑둥 충돌 방식을 자동 계산 → CollisionLayer 수동 배치로 교체)**:
  사용자 요청 두 가지를 한 세션에서 처리. ① `untitled.tmx`(가장 최신 편집본, mtime 23:45)를
  `tiled.exe --export-map json`으로 재export해 `Frontend/public/maps/village.json` 교체
  (1384863→2343545바이트). 타일셋이 34→39개로 늘어 신규 5개(`32x32 first tileset`, `HighTilesSheet`,
  `BasicTiles`, `DarkerBasicTiles`, `DarkerHighTilesSheet`)의 PNG를 원본 에셋 폴더에서
  `public/tilesets/`로 복사하고 `tiledTilesetManifest.js`에 매핑 추가(기존 관행 그대로). 최상위에
  `Mountain`이라는 새 그룹(`Walls` + `House/Interior`)이 추가된 것도 확인했으나 이번 요청 범위 밖이라
  코드/문서 반영은 다음 세션으로 미룸(위 "확인 필요" 참고). ② 사용자가 "Forest 나무 밑둥 히트박스를
  코드가 알아서 계산하게 하지 말고, Cave 벽면처럼 최상위 `CollisionLayer`의 `collides:true` 타일로
  충돌 범위를 잡아달라 - 밑둥 위치에 CollisionLayer 타일을 이미 직접 넣어놨다"고 요청. 2026-07-24에
  네 차례 재작성을 거친 알파 채널 분석 기반 자동 히트박스 계산 로직 전체
  (`_buildForestBaseHitboxes`/`_mergeOverlappingRects`/`_buildForestOpaqueMask`/
  `_computeForestBaseFootprint`, 관련 상수 `TREE_BASE_HITBOX_HEIGHT`/`TREE_BASE_HITBOX_MIN_WIDTH`/
  `TREE_PIXEL_ALPHA_THRESHOLD`/`TREE_BASE_FOOTPRINT_BAND_PX`/`TREE_BASE_HITBOX_MERGE_GAP_PX`,
  `treeBaseHitboxGroup`과 그 콜라이더 등록)를 `TiledMapTestScene.js`에서 전부 삭제. `CollisionLayer`는
  이미 최상위(그룹 밖) 레이어라 기존 map-wide 처리 루프(`setCollisionByProperty({collides:true})` +
  콜라이더 등록)가 별도 코드 변경 없이 그대로 적용됨 - Forest 전용 코드는 이제 시각화(개별 이미지 변환
  + Y-정렬용 depth 계산)만 담당하고 충돌에는 관여하지 않는다. **검증**: Playwright로 (a)
  `treeBaseHitboxGroup`이 더 이상 생성되지 않음, (b) `CollisionLayer`가 여전히 항상 숨김(`visible:false`)
  이면서 일반 `tileLayers`에 포함돼 플레이어 콜라이더가 정상 등록됨, (c) Forest 타일 이미지 오브젝트
  1232개(시각 변환 로직 변경 없음)까지 확인, (d) 사용자가 숲 영역 안에 새로 배치한 CollisionLayer 타일
  (159칸) 중 하나(row 111, col 119) 바로 위에서 실제 물리 이동(S키)으로 남쪽으로 걸어 들어가면 타일
  상단 경계(y=3552)에 정확히 막히는 것을 실측 확인. 검증에 쓴 `window.__forestDebugScene` 임시 훅은
  확인 후 제거.

- **2026-07-24 (나무 밑둥 히트박스 - 병합 대신 대표 사각형 선택으로 교체)**: 바로 아래 항목("병합
  후처리")에서 만든 바운딩 박스 병합 결과를 사용자가 실제로 보고 "나는 그냥 개수를 줄이라는 게 아니라
  크기를 줄이라는 거였다 - 붙어있는 걸 다 합치다 보니 한 줄로 나와서, 나무 그루터기 사이사이로 지나
  다니고 싶은데 옆에 붙어있는 나무 사이로 못 지나다니게 됐다"고 재보고. 정확한 진단: 그룹의 바운딩
  박스(합집합)를 쓰면 얇은 조각(옆 칸에 살짝 겹친 픽셀만 있는 부분)까지 폭에 포함되면서 옆 나무 쪽으로
  히트박스가 넓어져, 원래 다닐 수 있어야 할 나무 사이 틈까지 막아버렸다. 사용자가 "나무 하나당 히트박스
  ~4개 중 나머지 3개(양옆 작은 것들)는 버리고 밑둥 가운데 딱 하나만 남기자"고 구체적으로 제안. `_mergeOverlappingRects`
  를 수정: Union-Find로 그룹(연결 요소)을 묶는 것까지는 동일하지만, 그룹의 바운딩 박스를 계산하는 대신
  **그 그룹에서 면적이 가장 큰 사각형 하나만 남기고 나머지는 버리도록** 변경(가장 넓은 사각형이 대체로
  그루터기/뿌리가 가장 뚜렷하게 그려진, 밑둥을 가장 잘 대표하는 조각이므로 자연스럽게 "가운데 하나"에
  해당함). **검증**: Playwright로 (a) 개수는 그대로 83개 유지, (b) 가장 큰 10개 사각형 전부 정확히
  32x16px(=타일 하나 크기, 병합 이전 최대 256x76px였던 것과 대조)로 폭이 더 이상 옆으로 부풀려지지
  않음을 확인, (c) 확대 스크린샷으로 나무들 사이사이에 지나다닐 수 있는 틈이 다시 뚜렷이 보이는 것과
  각 히트박스가 정확히 하나의 트렁크/그루터기 위치에 딱 맞게 놓인 것을 육안 확인, (d) x=4400 지점에서
  남쪽으로 걸었을 때 이전엔 부풀려진 박스 때문에 y=3430에서 멈췄던 것이 이제 y=3974까지 자연스럽게
  더 들어갈 수 있게 된 것(=더 이상 실제보다 넓게 막고 있지 않음)까지 확인. 검증에 쓴
  `window.__forestDebugScene` 임시 훅은 확인 후 제거.

- **2026-07-24 (나무 밑둥 히트박스 개수 축소 - 병합 후처리)**: 레이어별 독립 판정으로 되돌린 직후,
  사용자가 스크린샷으로 "히트박스가 다시 너무 많아졌고, 막히면 안 되어 보이는 부분에도 히트박스가
  생겼다"고 재보고. 조사 결과 판정 로직 자체는 정상이었다(직접 확인한 "얇은" 히트박스들도 전부 실제
  타일 데이터가 있는 자리였고, 성분 크기가 1인 두 칸을 빼면 나머지는 전부 정상적인 밑둥 후보였음) -
  근본 원인은 "레이어별 독립 판정"과 "합친 격자 판정" 둘 다 이 특정 그림체(나무들이 빈틈없이 서로
  겹쳐 그려져 있어 인접한 나무끼리도 픽셀이 거의 항상 맞닿음)에서는 판정 결과 자체를 조율하는 것만으로
  두 요구사항(가려진 그루터기도 막히게 + 이상한 곳은 안 막히게)을 동시에 만족시킬 수 없다는 것이었다
  (픽셀 인접성 검사까지 추가해봤지만 결국 merged 방식과 거의 같은 결과로 수렴 - 이 시도는 폐기).
  사용자가 대안으로 "판정은 그대로 두되, 밑둥 하나에 조각조각 나뉘어 생기는 여러 개의 작은 히트박스를
  하나로 합쳐서 개수만 줄이자"는 아이디어를 제시해서 그 방향으로 처리: `_buildForestBaseHitboxes`가
  칸별로 계산한 히트박스 사각형을 곧바로 만들지 않고 배열에 모아뒀다가, 새로 만든
  `_mergeOverlappingRects()`가 서로 닿아있거나 겹치는 사각형들을 하나의 바운딩 박스로 합친 뒤에 실제
  정적 존을 생성하도록 변경(TREE_BASE_HITBOX_MERGE_GAP_PX=12px 이내면 같은 밑둥으로 간주). **버그와
  수정**: 처음 구현한 병합 로직(반복적으로 두 사각형을 그때그때 합쳐가며 다음 비교에 그 합쳐진 박스를
  다시 사용)이 "대각선으로 떨어진 두 사각형을 합친 바운딩 박스가 원래 둘 중 누구와도 안 가까웠던
  제3의 사각형까지 우연히 가까워진 것처럼 끌어들이는" 연쇄 오류를 일으켜, 화면을 거의 가로지르는 긴
  막대 모양의 잘못된 히트박스가 생겼다(Playwright 스크린샷으로 발견). Union-Find로 교체해 "이어지는지"
  판정은 항상 원본(안 부풀려진) 사각형끼리만 비교하고, 바운딩 박스는 그룹이 다 정해진 뒤 마지막에 한
  번만 계산하도록 수정. **검증**: 269→83개로 줄었고(1차 버그 있던 버전은 34개까지 줄었으나 그 긴 막대
  버그 때문에 폐기), Playwright로 (a) 가장 큰 10개 사각형이 전부 합리적인 크기(최대 256x76px, 화면을
  가로지르는 이상 크기 없음)인 것, (b) 가장 넓은 사각형(352x16px)을 직접 확대 스크린샷으로 확인해
  실제로 하나로 이어진 나무줄(clearing 경계를 따라 빈틈없이 붙어있는 나무들)이라 정당한 병합임을 육안
  확인, (c) 여전히 x=3900 근처 "가려진 그루터기" 지점에서 18px 만에 정확히 막히는 것(레이어별 독립
  판정 결과는 안 바뀌었음을 재확인)까지 검증. 검증에 쓴 `window.__forestDebugScene` 임시 훅은 확인 후
  제거.

- **2026-07-24 (나무 밑둥 히트박스 판정 방식 재교정)**: 사용자가 depth 그룹핑 수정 직후 "히트박스가 좀
  이상해졌다"고 재보고. 처음엔 코드(히트박스 로직 자체는 그 수정에서 안 건드림)와 Playwright 자동 테스트
  (개수·위치·오버레이 스크린샷 전부 이전과 동일)로는 회귀를 못 찾았으나, 사용자가 스크린샷을 추가로
  제공("막혀야 할 곳(특히 앞의 나무에 가려져 안 보이는 그루터기들)이 안 막혀있고, 뜬금없는 데에
  히트박스가 있다")한 뒤에야 진짜 원인을 발견: 이건 이번 세션이 아니라 **바로 전전 항목("밑둥 히트박스
  재작성")에서 도입한 merged-occupancy 방식 자체의 결함**이었다 - "같은 나무가 아래로 계속 이어지는 것"과
  "다른 나무가 우연히 같은 칸 바로 아래에 겹쳐 그려진 것"을 구분하지 못해서, 실제로는 독립된 나무의 진짜
  밑둥인데 다른 레이어의 나무가 바로 아래(화면상 앞쪽)에 겹쳐 있다는 이유만으로 "아직 수관 중간"이라고
  잘못 판정해 히트박스를 생략하고 있었다(빽빽하게 겹친 숲일수록 이 오탐이 흔함 - 자동 테스트에서 우연히
  겹치지 않는 지점만 확인해서 못 잡았던 것). **수정**: `_buildForestBaseHitboxes`가 다시 각 레이어
  (Tree1..12) 자신의 배치만 독립적으로 보고 "바로 아래 칸이 비어있는지" 판정하도록 되돌림(레이어끼리는
  안 겹치는 나무만 담는 슬롯이므로, 레이어 하나의 배치 안에서 비어있다는 건 다른 나무 유무와 무관하게
  진짜 밑둥) - 여러 레이어가 우연히 같은 칸을 밑둥으로 잡을 때만 `processedCells` Set으로 중복 히트박스를
  막는다. `_buildForestMergedOccupancy()`는 폐기하지 않고 depth 그룹핑(바로 위 항목)에는 그대로 계속
  사용(그쪽은 "다른 나무와 겹쳐도 시각적으로 하나처럼 보이면 같이 Y-정렬" 하려는 목적이라 merged 방식이
  맞음 - 이번에 문제였던 건 히트박스 쪽에만 merged를 썼던 것). **검증**: Playwright로 (a) 히트박스
  60→269개로 증가(레이어별 독립 판정이라 원래(초기 구현, merged 도입 전) 299개에 근접, 레이어 간
  우연한 중복만 dedupe됨), (b) 이전엔 x=3900 부근에서 위쪽으로 664px를 전혀 안 막히고 그냥 통과했던
  지점이 이제 18px 만에 막히는 것으로 실제 회귀 재현 후 수정 확인, (c) 확대 오버레이 스크린샷으로
  사용자가 지적한 "그루터기가 안 보이는" 조밀한 군집 구간 전반에 히트박스가 촘촘히 채워진 것을 육안
  확인(일부는 눈에 보이는 뿌리/그루터기 그래픽이 없는 둥근 수풀 타일 위에도 히트박스가 있는데, 이
  타일셋 자체가 뿌리 그래픽 없는 수풀도 섞어 쓰므로 정상). 검증에 쓴 `window.__forestDebugScene` 임시
  훅은 확인 후 제거.

- **2026-07-24 (나무 depth 그룹핑 교정)**: 사용자가 스크린샷으로 "나무에서 타일의 y축 위치에 따라
  같은 나무임에도 레이어가 갈라져서 이상하게 표현된다"고 보고(플레이어가 나무 캐노피 한가운데에 노랗게
  비치는 것처럼 보이는 스크린샷). 원인: `_renderForestTreeLayerVisuals`가 타일 하나하나에 자기 자신의
  y좌표로 depth를 줬는데, 나무 한 그루가 여러 행(타일)에 걸쳐 있으면 플레이어가 그 행 범위 "중간"의
  y좌표에 있을 때 위쪽 타일들은 플레이어 뒤로, 아래쪽 타일들은 플레이어 앞으로 개별적으로 정렬되면서
  나무 하나가 위/아래로 쪼개져 보였음. 1차 시도로 8방향 플러드 필(서로 붙어있는 칸을 전부 하나의
  덩어리로 묶어 덩어리 전체가 가장 아래 행 기준 depth 하나를 공유)을 구현했으나, Playwright로 확인해보니
  이 맵의 Forest는 나무들이 서로 빈틈없이 옆으로 이어진 하나의 큰 덩어리라 8방향 연결로는 숲 전체
  (타일 1232개)가 통째로 하나의 컴포넌트가 되어버려(`distinctDepthValues === 1`) 숲 전체가 플레이어와
  절대 앞뒤가 안 바뀌는 하나의 판처럼 굳어버리는 더 나쁜 결과가 나옴 - 즉시 폐기. **최종 수정**:
  가로(옆 나무)로는 절대 묶지 않고, 정확히 같은 열(column)에서 세로로 끊기지 않고 이어진 구간만
  `_buildForestColumnRunDepths()`로 묶어 그 구간의 가장 아래 행 기준 depth 하나를 공유하게 함(레이어
  대신 이 값을 `_renderForestTreeLayerVisuals`가 그대로 사용). 이러면 플레이어가 겹치는 한 열 안에서는
  더 이상 갈라지지 않으면서도, 옆 열(다른 나무/다른 지점)은 독립적으로 자기 Y-정렬을 유지해 숲 전체가
  얼어붙지 않는다. **검증**: Playwright로 (a) 특정 열(x=4112)의 타일 10개가 전부 동일 depth(3552)를
  공유하는 것, (b) 숲 전체 기준 distinctDepthValues=10(권장 방식으로 재계산한 여러 열의 서로 다른
  실제 바닥 행과 일치)까지 수치로 확인, (c) 그 열의 세로 범위 한가운데(y=3450)에 플레이어를 두면
  전체 나무가 쪼개짐 없이 플레이어를 완전히 가리는 것과, 범위 아래(y=3600)로 내려가면 플레이어가
  완전히 앞으로 나오는 것을 스크린샷으로 육안 확인(수정 전 스크린샷과 비교해 갈라짐이 사라짐).
  히트박스 로직은 변경하지 않았고 개수(60개)도 그대로임을 재확인. 검증에 쓴 `window.__forestDebugScene`
  임시 훅은 확인 후 제거.

- **2026-07-24 (밑둥 히트박스 재작성)**: 바로 아래 항목에서 만든 나무 밑둥 히트박스를 사용자가 실제로
  보고 "히트박스가 좀 이상한데 타일 확인하고 그거에 맞출 수는 없어?"라고 재요청. Arcade Physics
  `world.createDebugGraphic()`으로 히트박스를 시각화해 원인을 직접 확인한 결과 두 가지 문제를 발견:
  ① **판정 로직 버그** - "바로 아래 칸이 비어있는 타일"을 레이어 하나만 보고 판정했는데, Tree1~12는
  겹치는 나무를 그리기 위한 슬롯이라 나무 하나의 실루엣이 여러 레이어에 걸쳐 있는 경우가 흔했다. 그래서
  특정 레이어가 이 칸에서 우연히 멈췄을 뿐 실제로는 다른 레이어의 타일이 바로 아래에 이어지는 수관
  중간 지점을 "밑둥"으로 잘못 판정한 경우가 많았음 - Python으로 재계산한 결과 히트박스 299개 중 211개가
  이런 오탐이었다(스크린샷에서도 히트박스가 나무 캐노피 한가운데 떠 있는 게 명확히 보였음). ② **고정
  40x20 크기가 실제 그림과 무관** - 진짜 밑둥이어도 트렁크가 보이는 타일도 있고 잎이 낮게 늘어져 아래쪽에
  투명한 여백이 많은 타일도 있어서, 타일 grid 경계에 고정된 크기를 쓰면 실제 나무 그림과 어긋났음.
  **수정**: `_convertForestTreeLayerToObjects`를 시각화 전용 `_renderForestTreeLayerVisuals`와 충돌 전용
  `_buildForestBaseHitboxes`로 분리. `_buildForestMergedOccupancy()`가 Tree1~12 전부를 합친 점유 격자를
  먼저 만들고, 그 합친 격자 기준으로만 "바로 아래 칸이 비었는가"를 판정해 문제 ①을 해결. 문제 ②는
  `_computeForestBaseFootprint()`가 해당 칸에 실제로 그려지는 타일 이미지를 오프스크린 캔버스에 그려
  `getImageData()`로 알파 채널을 직접 읽어서: 그 칸의 불투명 픽셀 중 가장 아래 행을 "땅에 닿는 줄"로 삼고,
  그 아래쪽 10px 밴드에서 가로 폭을 구해 히트박스 폭/중심 x좌표로 쓰도록 구현(같은 gid 조합은 캐싱).
  결과: 히트박스 299→60개(Python으로 재계산한 "진짜 밑둥 칸" 67개와 거의 일치, 나머지는 완전 투명한
  타일이라 정당하게 제외된 것으로 추정), 세로 두께는 20→16px(`TREE_BASE_HITBOX_HEIGHT`), 폭은 고정값
  대신 실제 픽셀 폭(최소 10px 보장, `TREE_BASE_HITBOX_MIN_WIDTH`). **검증**: Playwright + 디버그
  그래픽 오버레이 스크린샷으로 히트박스가 각 나무의 실제 뿌리/그루터기 그림 위치에 정확히 겹치는 것을
  육안 확인, 물리 이동(S키)으로 캐릭터가 정확히 새 히트박스 경계(발밑 y좌표 = 존 상단)에서 멈추는 것도
  재확인. 검증에 쓴 `window.__forestDebugScene` 임시 훅은 확인 후 제거.

- **2026-07-24**: 사용자 요청 3가지를 한 세션에서 처리. ① `untitled.tmx`(가장 최신 편집본, mtime 00:37)를
  `tiled.exe --export-map json`으로 재export해 `Frontend/public/maps/village.json`을 교체(2183269바이트).
  새로 `Forest`라는 그룹 레이어(`Cave`와 같은 레벨)가 생겼고 그 안에 `Tree1`~`Tree12` 타일 레이어 12개가
  있음을 확인(전부 150x150, 지도 오른쪽 아래 한 구역(대략 row 103~125, col 105~149)에 몰려있는 하나의
  큰 숲 지역이며, 나무끼리 겹쳐 그릴 수 있게 겹치지 않는 나무들끼리 12개 레이어로 나눠 그린 것으로
  타일셋은 전부 `exterior`). 타일셋이 34개로 늘면서 새 `town_corner`(560타일)가 추가돼 있었는데
  `tiledTilesetManifest.js`에 매핑이 없어 콘솔 경고가 떴던 것도 기존 관행대로 PNG를
  `public/tilesets/`에 복사하고 매니페스트에 추가해 해결. ② Forest의 Tree1~12를 일반 `createLayer()`로
  그리지 않고 `_convertForestTreeLayerToObjects()`(`TiledMapTestScene.js`)로 타일 하나하나를 개별
  Phaser Image 오브젝트로 변환하도록 재작성 - 일반 타일 레이어는 depth가 레이어 단위로 고정이라
  캐릭터가 나무 수관 앞/뒤로 자연스럽게 오갈 수 없어서, 각 타일에 자신의 월드 y좌표(타일 하단)를
  그대로 depth로 주고 플레이어도 매 프레임 y좌표 기반으로 depth를 갱신하는 표준 Y-정렬을 새로 도입함
  (`update()`). 기존에 지붕/벽/어둠류에 쓰던 고정 depth 상수(`PLAYER_DEPTH + 10` = 20)는 이제 y좌표
  기반 depth(0~4800 범위)와 겹치므로 `STRUCTURE_ALWAYS_ON_TOP_DEPTH = 1000000`으로 훨씬 큰 값으로
  교체(항상 캐릭터보다 위 유지). 타일 텍스처는 `map.addTilesetImage()`가 만든 `Tileset` 오브젝트의
  `getTileTextureCoordinates()`로 원본 이미지 내 좌표를 얻어 `Texture.add()`로 개별 프레임을 즉석에서
  잘라 캐싱(`_getOrCreateTileFrameKey`). ③ 변환된 나무 오브젝트의 충돌은 타일 전체가 아니라 밑둥에만
  두도록, 같은 레이어에서 "바로 아래 칸이 비어있는 타일"(그 나무 덩어리의 시각적 바닥 경계)에만
  40x20px 정적 히트박스를 타일 하단 가운데에 배치(`treeBaseHitboxGroup`) - 위쪽 수관 타일은 충돌 없이
  통과 가능. 이 레이어들은 실제로 여러 나무가 붙어있는 큰 덩어리라 개별 나무를 기하학적으로 분리하긴
  어려웠지만, "아래 칸이 비었는가"라는 타일 데이터 기반 규칙만으로 밑둥 판정이 정확히 나옴(버그 5/6에서
  익힌 "손으로 그린 지오메트리 대신 타일 데이터에서 직접 유도" 원칙을 그대로 적용).
  **검증**: Playwright로 (a) 변환된 나무 오브젝트 1232개(타일 레이어로는 0개 생성, `anyTilemapLayerCreated:
  false`) 및 밑둥 히트박스 299개(전부 40x20) 확인, (b) `displayList.depthSort()` 후 리스트 인덱스 비교로
  플레이어가 나무와 같은 칸에 겹칠 때 depth 3356 < 타일 depth 3360이라 타일이 실제로 나중(위)에 그려짐을
  확인 + 플레이어 depth를 강제로 999999로 올리면 순서가 뒤집히는 것까지 확인(=depth가 실제로 그리기
  순서를 통제함을 증명), (c) 실제 물리 이동(S키)으로 나무 기둥이 있는 칸 위쪽에서 남쪽으로 걸어 들어가면
  수관 타일 4개(폭 ~130px)는 그냥 통과하고 밑둥 히트박스 경계(정확히 몸통 반높이만큼)에서 멈추는 것을
  실측 확인. 검증에 쓴 `window.__forestDebugScene` 임시 훅은 확인 후 제거함.

- **2026-07-22**: `untitled.tmx` → `village.json` 재export(1325929바이트). 타일셋 32→34개 증가 —
  신규 `town_doortransparent`(문 그래픽으로 추정) PNG를 `public/tilesets/`로 복사하고
  `tiledTilesetManifest.js`에 매핑 추가. `town_multi_v002`가 목록에 두 번 나오는데 같은 이미지를
  가리키는 별개 타일셋 정의라 매니페스트 매칭엔 문제 없음(무해). Cave 자체의 Roof/Wall 유니온 타일
  수(293)·트리거 존(22)·정밀 히트박스 타일 수(11) 전부 변동 없어 이번 편집은 Cave 바깥(새 건물 준비용
  에셋 추가 등)이었던 것으로 보임. Playwright로 콘솔 경고/에러 없음(신규 타일셋 로드 정상)까지 확인.

- **2026-07-22**: 사용자가 "캐릭터랑 WInteriors가 겹치면 WInteriors가 위에 보이도록 해달라"고 요청.
  원인: Phaser는 씬에 나중에 추가된 오브젝트를 위에 그리는데(depth 기본값이 전부 0이라 추가 순서로
  결정됨), 플레이어가 모든 타일 레이어보다 나중에 생성돼서 depth를 안 주면 항상 맨 위에 그려지고
  있었음 - WInteriors뿐 아니라 Roofs/Walls/Darkness도 같은 문제를 안고 있어서 그대로 두면 "지붕이
  불투명한데 캐릭터가 그 위로 보이는" 등 앞뒤가 안 맞는 상태였음(사용자는 WInteriors만 얘기했지만
  같은 원인이라 넷 다 같이 고침). `PLAYER_DEPTH = 10` 상수를 추가해 플레이어에 부여하고, 이름에
  "roof"/"wall"/"darkness"가 들어가거나 정확히 "winteriors"인 레이어는 `PLAYER_DEPTH + 10`(=20)을
  줘서 항상 캐릭터보다 위에 그려지게 함(`Interiors`, `Tile Layer 1~5` 등은 depth 0 그대로 캐릭터
  아래). Playwright로 depth 값(player=10, Interiors=0, WInteriors/Walls/Roofs/Darkness=20) 확인 +
  실제 WInteriors 타일 위치로 캐릭터를 이동시켜 스크린샷 비교(depth를 임시로 100으로 올리면 캐릭터가
  보이고, 원래 depth(10)에서는 구조물에 가려 안 보이는 것)로 시각적으로도 검증.
- **2026-07-22**: `untitled.tmx` → `village.json` 재export(1325221바이트, 구조/레이어/타일셋 개수는
  동일하나 Cave의 Roof+Wall 유니온 타일 수가 408→293으로 줄어듦 — 사용자가 건물 모양을 직접 다시
  손본 것으로 보임). 코드 변경 없이 지도만 갱신했고, Playwright로 트리거 존(22개)·정밀 히트박스 존(11개,
  변동 없음)·Darkness 초기 alpha 0·CollisionLayer 항상 숨김이 전부 그대로 정상 재구성되는 것과 콘솔
  경고/에러 없음을 확인. 타일 기반 자동 생성 방식 덕분에 모양이 바뀌어도 코드 쪽 손볼 것 없이 그대로
  반영됨(사용자에게 전에 안내한 "그냥 지도만 주면 된다"는 워크플로가 실제로 그대로 성립함을 재확인).
- **2026-07-22**: 사용자가 "Interiors 충돌이 그려둔 히트박스 모양이 아니라 타일 하나 통째로(32x32)
  막히는 것 같다"고 보고 — 정확한 진단이었음. `layer.setCollisionFromCollisionGroup(true)`는 Arcade
  Physics 특성상 "이 타일에 충돌 판정이 있다/없다"만 반영하고 타일 전체를 사각형으로 막아버려서, Tile
  Collision Editor로 타일 일부만 덮게 그려둔 히트박스가 무시되고 있었다. `_buildPreciseTileHitboxZones`
  (`TiledMapTestScene.js`)로 교체: 각 타일의 `tile.getCollisionGroup().objects`에서 실제 그려진
  사각형의 로컬 좌표/크기를 읽어 `tile.pixelX/pixelY`를 더해 월드 좌표로 변환한 뒤, 그 크기 그대로
  정적 물리 존(`preciseHitboxZoneGroup`)을 만들어 플레이어와 충돌시키도록 변경(`setCollisionByProperty`
  로 처리하는 `CollisionLayer`의 "타일 전체 막기"는 의도된 동작이라 그대로 둠). Python으로 샘플 타일
  (col29,row13, gid 1457)의 실제 그려진 사각형(로컬 x=3,y=3.5,w=24.125,h=24.375)을 확인 → 월드 좌표
  기준 예상 경계(931)를 계산한 뒤, Playwright로 왼쪽에서 실제 물리 이동으로 밀어붙여 정확히 x=921
  (931 - 바디 반폭 10)에서 멎는 것을 확인해 픽셀 단위로 정확히 일치함을 검증. 이 맵에 실제로 배치된
  히트박스 타일은 총 11개(Interiors)뿐임도 확인(타일셋 자체엔 히트박스 정의가 279개 있지만 대부분
  이 맵에는 안 쓰임).
- **2026-07-22**: `untitled.tmx` → `village.json` 재export(1324181바이트, 타일셋 32개로 증가 —
  `town_dark`, `collision` 신규. 두 PNG를 `c:\PersonalProject\`에서 `Frontend/public/tilesets/`로
  복사하고 `tiledTilesetManifest.js`에 매핑 추가). 사용자가 Cave 그룹에 새 레이어 3개를 추가하고
  기능을 요청: ① `Darkness`(기본 숨김, Cave 진입 트리거 활성 시 나타나 바깥을 어둡게 덮음 — 기존
  Roof/Wall과 정반대 방향의 페이드), ② `WInteriors`(이름에 "wall"이 없어 자동으로 페이드 대상에서
  제외됨 — 안에 들어가도 투명해지면 안 되는 벽 전용, 코드 변경 없이 이미 요구사항 충족), ③ 최상위
  `CollisionLayer`(항상 숨김 유지해야 하는 순수 충돌 판정 레이어, `collides:true` 타일 전용). 추가로
  `Interiors`의 일부 타일에 Tiled Tile Collision Editor로 그려둔 히트박스를 활성화해달라는 요청 →
  `layer.setCollisionFromCollisionGroup(true)` 호출 추가. `TiledMapTestScene.js` 대대적 리팩터:
  `fadeLayersByGroupName` 하나였던 것을 `hideOnEnterLayersByGroupName`(roof/wall)과
  `showOnEnterLayersByGroupName`(darkness, 반대 방향)로 분리, `_fadeGroupLayers`가 `targetAlpha` 대신
  `isEntering` boolean을 받아 두 방향을 동시 처리하도록 변경. 트리거 존은 여전히 hideOnEnter(지붕+벽)
  타일 합집합에서만 생성(Darkness는 맵 전체에 가깝게 넓어서 존 모양에서 제외). Playwright로 초기
  상태(Darkness alpha 0/CollisionLayer 항상 숨김/WInteriors alpha 1 고정) + 진입·이탈 시 각 레이어
  alpha 전환 + 샘플 Interiors 타일 5개의 `tile.collides === true` 전부 확인.
- **2026-07-21**: `untitled.tmx`를 다시 재export해 `village.json` 교체(889895바이트, 이전 631777바이트
  보다 커짐). tmx→json 방향 재확인(사용자가 처음엔 반대 방향으로 물었으나, `untitled.tmx`가 마지막
  export(22:12)보다 최신(23:51)임을 발견해 먼저 확인 후 원래 방향인 tmx→json으로 진행 — 반대로 갔으면
  사용자가 그 사이 한 최신 편집이 날아갈 뻔했음). 구조 변화 확인: Cave 그룹 안 `Triggers` 오브젝트
  레이어가 삭제됨(안내드린 대로, 코드에서 안 쓰므로 문제 없음), 최상위에 새 `CollisionObjects`
  오브젝트그룹이 추가됨(collision 테스트용으로 보이나 현재 오브젝트 0개, 코드에서 아직 안 씀 —
  사용자가 채워 넣으면 그때 연동 필요). Cave의 Roofs/Walls 타일 데이터 자체는 안 바뀌어서 지붕/벽
  페이드 커버리지 재검증(408개 유니온 타일, 구멍 0개)도 그대로 통과.
- **2026-07-21**: 사용자가 "여전히 벽에 딱 붙으면 트리거 발동된다"고 재보고(버그 6에서 +2px로 줄인
  뒤에도 재현). 원인은 Arcade Physics가 속도만큼 먼저 이동시킨 뒤 충돌을 보정하는 방식이라 정지
  상태에서도 프레임당 몇 px씩 벽으로 파고들었다 밀려나는 게 반복될 수 있어서(220px/s 기준 프레임당
  최대 ~4px), +2px 여유로는 부족했던 것. `ROOF_TRIGGER_ZONE_PADDING`을 -4(안쪽으로 4px 축소)로
  전환. Python으로 -8까지도 타일 중심 좌표 커버리지 구멍 0개 확인, Playwright로 벽에 6초간 실제
  물리 충돌로 눌러붙어 있어도 트리거 0회·정상 진입은 여전히 잘 되는 것 확인. 상세: 위 "버그 6"
  하단 "추가" 참고. 그리고 향후 여러 건물 추가 워크플로 관련 Q&A: 트리거 오브젝트는 더 이상
  전혀 필요 없고, 그룹 레이어 이름만 건물마다 겹치지 않게 + 지붕/벽 자식 레이어 이름에 "roof"/"wall"
  포함하면 자동으로 동작함을 안내함(코드/맵 변경 없음, 문서화 목적).

- **2026-07-21**: 사용자가 "여전히 깜빡이면서 반투명하게 보인다, 벽에 붙어도 반투명해지는데 더 좁게
  설정하거나 폴리곤으로 다시 그려야 하나?"라고 재보고. 진단 결과 코드 로직 버그가 아니라 트리거 존이
  실제 지붕/벽 범위보다 너무 넓었던 것(패딩 8px가 버그 5의 타일 기반 전환 이후로는 불필요해졌는데도
  그대로 남아 건물 "바깥"까지 트리거 영역을 넓힘)이 원인으로 결론냄. `ROOF_TRIGGER_ZONE_PADDING`을
  8→2로 축소하고, `currentActiveRoofs`(raw)를 바로 페이드에 쓰지 않고 `confirmedActiveRoofs`+
  `pendingTransitions`로 4프레임 연속 유지돼야 커밋하는 디바운스를 추가. 폴리곤으로 손수 재작업하는
  방향은 버그 2/5 재발 여지가 있어 권장하지 않는다고 답변. 상세: 위 "버그 6" 참고.
- **2026-07-21**: 사용자 피드백 — "roof-active는 깜빡이긴 하는데 실제로 투명해지긴 한다, 근데 반투명
  정도라 못 느꼈다. 문으로 들어가면 별도 내부 맵으로 순간이동하는 게 아니라 그냥 내부로 들어가는
  거라 아예 완전히 투명해져야 인테리어가 보인다. 그리고 Cave의 Wall도 같이 투명해졌으면 좋겠다"는
  요청. 확인해보니 fade 타겟 alpha는 원래도 0/1(완전 투명/불투명)이었어서 "반투명"은 실제로는 지난
  라운드 수정 전 코드가 열려있던 탭에서 본 것으로 추정(위 항목 참고). 이번엔 기능 확장: `Walls` 타일
  레이어도 `Roofs`와 함께 페이드 대상에 포함시킴. 다만 `Walls`가 `Roofs`보다 아래로 3줄(약 96px) 더
  뻗어있는 것을 실측 확인해서, 트리거 존을 `Roofs` 타일만이 아니라 `Roofs`+`Walls`의 **합집합**에서
  생성하도록 재작성(`_buildTriggerZonesFromFadeLayers`, 이전 `_buildRoofTriggerZonesFromRoofTiles`를
  대체) — 안 그러면 벽만 있고 지붕은 없는 영역이 트리거 커버리지 밖에 남을 뻔했음.
  `roofLayersByGroupName`→`fadeLayersByGroupName`, `_buildGroupRoofMap`→`_buildGroupFadeLayerMap`,
  `_fadeRoof`→`_fadeGroupLayers`로 이름도 실제 역할(지붕+벽)에 맞게 정리. Python으로 합집합 타일
  408개 전부 커버(구멍 0개) 확인 + Playwright로 지붕·벽 alpha가 각각 정확히 0/1로 전환되는 것,
  벽만 있는 확장 영역(로우 30~32)에서도 정상 트리거되는 것, 경계 왕복 스트레스 테스트에서 alpha가
  0에 고정되고 tween이 쌓이지 않는 것까지 재검증함.
- **2026-07-21**: 사용자가 다시 수정한 `untitled.tmx`(22:10 mtime, 직전 export인 21:46보다 최신)를
  같은 방식(`tiled.exe --export-map json`, tmx→json 방향)으로 재export해 `village.json` 교체. 구조
  동일(150x150, 레이어 6개, 타일셋 30개, `Cave` 그룹). 트리거는 이제 `RoofTrigger` 오브젝트가 아니라
  `Roofs` 타일에서 직접 생성되므로(바로 아래 항목의 버그 5 수정) 오브젝트 쪽이 뭐가 바뀌었든 영향 없음.
  같은 날 있었던 "여전히 깜빡인다"는 재보고에 대해, 코드는 이미 버그 4/5로 수정된 상태라 Playwright로
  이 새 맵에 대해서도 재검증(커버리지 276/276 타일, alpha tween 1↔0, 경계에서 40회 왕복 이동 스트레스
  테스트까지 깜빡임 0회·동시 tween 최대 1개)했고 전부 통과함. 재보고 시점은 버그 4/5 수정 **직후**라
  브라우저 탭이 그 수정 전 코드로 이미 열려 있었을 가능성이 높음 — 아래 "Vite HMR 한계" 참고,
  `Phaser.Game`은 마운트 시 한 번만 생성되므로 씬 코드가 바뀌면 하드 리프레시(Ctrl+F5)가 필요하다.
  **다음에도 같은 보고가 오면 가장 먼저 "하드 리프레시를 했는지"부터 확인할 것.**
- **2026-07-21**: 사용자가 "맵을 새로 바꾸고 트리거 사각형 사이 틈도 없앴는데 여전히 지붕이 깜빡인다"고
  보고. Playwright로 씬 내부(`window.__roofDebugScene` 임시 훅, 조사 후 제거)를 직접 조회해 진단한 결과
  두 가지 실제 버그 발견 및 수정: (버그 4) 그룹 자식 레이어 이름이 Phaser 내부에서 `"Cave/Roofs"`처럼
  평탄화되는데 `_buildGroupRoofMap`이 raw 이름("Roofs")을 저장해서 `getLayer()`가 항상 `null`을 반환 →
  지붕 alpha 페이드가 **한 번도 실행된 적이 없었음**; (버그 5) `RoofTrigger` 오브젝트 15개가 지붕 타일
  276칸 중 33칸(맨 위 2줄)을 아예 못 덮는 진짜 구멍이 있었음(사용자가 고친 "사각형 사이 틈"과는 다른
  문제). 해결책으로 손으로 그린 `RoofTrigger` 오브젝트 의존을 완전히 제거하고, 지붕 타일 레이어의 실제
  채워진 칸에서 직접 트리거 존을 생성하도록 `TiledMapTestScene.js`를 재작성
  (`_buildRoofTriggerZonesFromRoofTiles`). Python으로 커버리지 100% 확인 + Playwright로 alpha tween과
  전체 스윕 깜빡임 0회 실측 검증. 상세: 위 "버그 4", "버그 5" 참고.
- **2026-07-21**: `c:\PersonalProject\untitled.tmx`(Tiled 소스, `village.json`보다 최신 수정본)를
  `tiled.exe --export-map json`으로 재export하여 `Frontend/public/maps/village.json`을 교체
  (사용자 확인: tmx→json 방향, Tiled 편집 흐름과 동일). 재검증 결과 150x150, 레이어 6개(최상위)·
  타일셋 30개, `Cave` 그룹(Interiors/Walls/Roofs) + `Triggers` 오브젝트 레이어 안 `RoofTrigger`/`Cave`
  객체 15개 그대로 유지됨 (버그 1의 이름 일치 상태 보존 확인).
- **2026-07-21**: `TiledMapTestScene.js`의 지붕(Roof) 트리거 판정을 수동 사각형 교차 검사에서 정식
  Arcade Physics 정적 존 + `physics.add.overlap`으로 재작성하고, `currentActiveRoofs`/
  `previousActiveRoofs` Set-diff로 깜빡임 수정 (사용자가 보고한 "roof-active 깜빡임 + 지붕이 투명해지지
  않음" 버그 대응, 원인은 인접 RoofTrigger 사각형 사이 ~1.7~3.1px 실측 틈). `ROOF_TRIGGER_ZONE_PADDING = 8`
  유지. 정적 검증(oxlint/dev-server/`node -c`)만 통과, **브라우저 육안 검증 미완료** (위 "버그 2" 참고).
- **2026-07-21**: `Frontend/public/maps/village.json`을 사용자가 그룹 레이어명을 `Mine→Cave`로 고친
  새 버전(632KB, 150x150, 레이어 6개·타일셋 30개)으로 교체. 1차 시도에서 `Write` 도구 결과가 잘려
  손실이 났던 것을, 세션 JSONL 트랜스크립트에서 원본 pasted 텍스트를 추출해 정확히 복구 (위 "버그 3" 참고).
- **2026-07-21**: `PROJECT_STATUS.md` 최초 생성 + 이후 두 차례 compact 요약분 반영 (Tiled 맵 통합 작업
  전반, Mine/Cave 이름 불일치 버그, 이번 항목들).
