# Village Simulation Backend

FastAPI + SQLAlchemy + ChromaDB + LLM 기반 가상 마을 NPC 시뮬레이션 백엔드.
기획 문서(GDD)에 정의된 "생성형 에이전트" 아키텍처(기억 스트림 -> 성찰 -> 계획/반응)에 더해
장비/전투, 채집-판매 경제, 결혼식/장례식 자동 트리거, 숨겨진 시설(도박장/암시장) 등을 구현한다.

## 스택

- **API**: FastAPI, Pydantic (요청/응답 + LLM JSON 출력 검증)
- **Relational DB**: SQLAlchemy ORM. 기본값은 SQLite(`village.db`, 설치 없이 즉시 실행), `DATABASE_URL`을
  MySQL 접속 문자열로 바꾸면 그대로 MySQL을 사용한다.
- **Vector DB**: ChromaDB (로컬 퍼시스턴트 클라이언트, `chroma_data/`에 저장)
- **LLM**: OpenAI 호환 API. 대사(`/chat`) 전용 클라이언트와 GM(성찰/루틴/엿듣기) 전용 클라이언트가 분리되어
  있어 로컬 언센서드 모델을 대사용으로만 붙이는 것도 가능하다 (`.env`의 `DIALOGUE_*` 항목 참고).
  키가 없으면 모든 LLM 호출이 **결정론적 폴백**으로 대체되어 키 없이도 전체 스택이 정상 동작한다.

## 실행 방법

```bash
python -m venv venv
./venv/Scripts/activate        # Windows
# source venv/bin/activate     # macOS/Linux

pip install -r requirements.txt
cp .env.example .env           # 필요 시 OPENAI_API_KEY, DATABASE_URL 등 수정

uvicorn app.main:app --reload --port 8000
```

최초 기동 시 `lifespan` 훅에서 테이블 생성 + 기본 시드 데이터(유저 1명, NPC 7명: 촌장/상인/대장장이/의사/
경찰/술집 주인/목수, 세계 상태, 폴백 루틴)를 자동으로 채운다. `GET /health` 로 상태를 확인할 수 있다.

## MySQL로 전환하기

```
pip install pymysql cryptography   # requirements.txt에 이미 포함됨
# .env
DATABASE_URL=mysql+pymysql://root:password@localhost:3306/village_db
```

MySQL 서버에 `village_db` 데이터베이스를 미리 만들어 두면 나머지는 SQLAlchemy가 처리한다.

---

## 🛠 NPC 성격/게임 밸런스 조정하기

### 1. NPC 성격/직업/비밀/집·일터 위치 (서버 재시작 필요)

`app/world_layout.py`의 `NPC_SEED` 리스트를 수정한다. 각 항목의 `personality`(성격 서술),
`secret`(숨겨진 비밀 - 예: "사실 오크다"), `core_traits`(콤마 구분 태그, 소문 왜곡 확률에 영향:
`gossipy`=40%, `honest`=5%, 그 외 15%)를 바꾸면 된다. **이미 생성된 NPC에는 반영되지 않으므로**
`village.db`를 지우고 서버를 재시작해야 한다 (기존 대화 기록/기억도 함께 초기화됨에 유의).

### 2. NPC 성격을 서버 안 끄고 즉시 바꾸기

```bash
curl -X PATCH http://127.0.0.1:8000/npc/{id}/state \
  -H "Content-Type: application/json" \
  -d '{"personality": "...", "secret": "...", "core_traits": "gossipy,greedy", "job": "..."}'
```

`prompt_builder.build_identity_block()`이 이 값을 그대로 참조하므로 **다음 대화부터 즉시 반영**된다.

### 3. 게임 밸런스 수치 (서버 안 끄고 실시간 조정)

`GameConfig` 테이블(싱글턴)을 통해 아래 값들을 런타임에 바로 바꿀 수 있다. 재시작 불필요.

```bash
curl http://127.0.0.1:8000/config                      # 현재 값 조회
curl -X PATCH http://127.0.0.1:8000/config \
  -H "Content-Type: application/json" \
  -d '{"minutes_per_real_second": 5, "event_fire_chance": 0.1}'
```

| 필드 | 기본값 | 의미 |
| --- | --- | --- |
| `minutes_per_real_second` | 3 | 현실 1초당 게임 내 경과 분 |
| `days_per_season` | 5 | 이 일수마다 계절이 순환(봄→여름→가을→겨울) |
| `hunger_decay_per_hour` / `fatigue_decay_per_hour` | 3.0 / 2.5 | 게임 내 1시간마다 자연 감소량 (100→0) |
| `event_fire_chance` | 0.05 | 매일 밤 화재가 랜덤 발생할 확률 (결혼식/장례식은 랜덤이 아님, 아래 참고) |
| `wedding_affection_threshold` | 85.0 | NPC-NPC 호감도가 이 값을 넘으면 결혼식 자동 발생 |
| `npc_illness_chance` / `npc_illness_recovery_chance` | 0.03 / 0.3 | 매일 밤 감기 발병/회복 확률 |
| `encounter_dialogue_chance` | 0.25 | NPC끼리 마주쳤을 때 실제 LLM 대사가 생성될 확률 (그 외엔 💬 이모지만) |
| `gambling_win_chance` | 0.5 | 도박장 베팅 승률 |
| `reputation_danger_threshold` / `reputation_warning_threshold` | 25 / 45 | 이 평판 이하로 떨어지면 NPC들이 경계/무장 태세(⚔ 아이콘)로 전환 |
| `speakeasy_familiarity_requirement` | 50.0 | 도박장/암시장(숨겨진 시설) 입장에 필요한 최소 친밀도 |

### 4. 아이템/가격/전투력 조정

`app/item_catalog.py`의 `ITEM_CATALOG` 딕셔너리를 직접 수정한다. 아이템마다:
- `price`, `sold_at`(판매 시설 키 목록) — 상점 진열
- `category`: `food`/`drink`/`medicine`/`material`/`tool`/`weapon`/`gift`
- `hunger_restore`, `hp_restore`, `intoxication_add` — 소비 효과
- `tool_for`: `"forest"` 또는 `"mine"` — 채집 도구 판정
- `damage_min`/`damage_max` — 무기 장착 시 전투 피해량 (맨손은 파일 하단 `UNARMED_DAMAGE_MIN/MAX`)
- `buys_at`, `sell_price` — 채집 재료를 되팔 수 있는 시설과 가격

`GATHER_CONFIG` 딕셔너리에서 채집 소요 시간(`minutes_min/max`), 성공 확률, 피로도 소모량을 조정한다.

전투 관련 상수(경찰 반격 피해량, 공격/사망 시 평판 페널티)는 `app/routers/combat.py` 상단
`REPUTATION_PENALTY_*`, `POLICE_RETALIATION_DAMAGE_*` 를 직접 수정한다.

### 5. 맵 좌표 조정

`app/world_layout.py`의 `TILE_SIZE`/`MAP_COLS`/`MAP_ROWS`/`BUILDINGS_ANCHOR`/`OPEN_MARKERS`/
`HOME_TILES`/`PLAYER_HOME_TILE`. **프론트엔드 `Frontend/src/game/map/mapData.js`와 반드시 값을
동일하게 유지**해야 한다 — 자세한 절차는 `../Frontend/README.md`의 "실제 맵으로 교체하기" 참고.

---

## 주요 아키텍처 매핑

| 기능 | 구현 위치 |
| --- | --- |
| 기억 스트림 + Recency/Importance/Relevance 스코어링 | `app/services/memory_service.py`, `app/utils/scoring.py` |
| 5블록 프롬프트 구조 (자아/상태/최근대화/기억/성찰) | `app/services/prompt_builder.py` |
| LLM 호출(GM/대사 클라이언트 분리) + JSON 검증 + 폴백 | `app/services/llm_service.py` |
| 성찰 + 팩트 크로스체크 | `app/services/reflection_service.py` |
| 루틴(JSON 시간표) 생성 + 폴백 루틴 (광장/술집 경유로 마주침 유도) | `app/services/routine_service.py` |
| 소문 전파(원본/왜곡 분리, 중복 방지, 확률적 왜곡) | `app/services/rumor_service.py` |
| World Event Manager (화재=랜덤, 결혼식=호감도 임계, 장례식=목격 기반) | `app/services/world_event_manager.py` |
| 관계 매트릭스(친밀도=우정/호감도=연애/신뢰도/존중도/긴장도) | `app/models/relationship.py` |
| 장비(도구/무기) + 채집(재료만, 시간 소요) + 판매(지정 NPC) | `app/item_catalog.py`, `app/routers/shop.py` |
| 전투(무기별 피해량, 목격자 기반 소문/장례식, 경찰 반격) | `app/routers/combat.py` |
| 숨겨진 시설(도박장/암시장 - 친밀도+야간 조건부 건물 변신) | `app/routers/facility.py`, `world_layout.HIDDEN_FACILITY_HOSTS` |
| NPC-NPC 자동 마주침(이모지/원샷 대사, 결혼식 트리거 포함) | `app/routers/encounter.py` |
| 런타임 조정 가능한 게임 밸런스 | `app/models/game_config.py`, `GET/PATCH /config` |
| 기절(Pass-out) 시스템 | `POST /world/passout` |
| 마을 좌표 배치 (프론트엔드와 값 공유) | `app/world_layout.py` |

## API 개요

- `GET /health` - 상태 확인
- `GET /world/state`, `POST /world/advance`, `POST /world/sleep`, `POST /world/passout`
- `GET /npc`, `GET /npc/{id}`, `GET /npc/{id}/routine`, `PATCH /npc/{id}/state`, `GET /npc/{id}/relationship`
- `GET /user/{id}`, `PATCH /user/{id}/state`, `GET /user/{id}/inventory`, `POST /user/{id}/equip`,
  `POST /user/{id}/tick`(패시브 허기/기력 감소)
- `POST /chat`, `POST /chat/gift` - NPC와의 대화/선물 (5블록 프롬프트 -> LLM -> `NPCAction` 검증 -> 폴백)
- `POST /eavesdrop` - 엿듣기 (두 NPC 대화 1회 생성)
- `POST /npc-encounter/resolve` - NPC끼리 우연한 마주침 (관계성에 따라 멈춰서 대화할지 그냥 지나칠지 판정)
- `GET /shop/{facility_key}/items`, `POST /shop/buy`, `POST /shop/sell`, `POST /shop/use`, `POST /gather`
- `GET /facility/{key}/access`, `GET /facility/host/{building_key}/reveal`, `POST /facility/gamble`
- `POST /npc/{id}/attack` - 전투 (목격자 기반 소문/장례식, 경찰 목격 시 반격)
- `POST /event/trigger`, `GET /event/active`, `POST /event/{id}/resolve` - 이벤트 수동 트리거/조회
- `POST /rumor/spread`, `POST /rumor/{id}/propagate/{npc_id}`, `GET /rumor/npc/{id}/known`
- `GET /config`, `PATCH /config` - 게임 밸런스 런타임 조정

전체 스키마는 서버 기동 후 `http://127.0.0.1:8000/docs` 에서 확인 가능하다 (Swagger UI).

## 알려진 단순화 지점 (다음 확장 포인트)

- **애니메이션 미연동**: `NPCAction.animation_state`/`movement_x`/`movement_y`는 이미 생성/전달되지만
  프론트엔드가 아직 재생하지 않는다. 자세한 내용은 `../Frontend/README.md` 참고.
- 딴청 피우기(벤치 앉기 등 Aggro 감소) 연출 없음.
- NPC 사망 후 직업 계승(공석을 다른 NPC가 메꾸는 시스템) 없음.
- 상권 경쟁 시스템(`app/models/world.py`의 `Shop` 테이블)은 정의만 되어 있고 실제로 가격을 변동시키는
  로직은 연결되어 있지 않다 (현재 아이템 가격은 `item_catalog.py`에 고정).
- ChromaDB는 기본 임베딩 함수를 사용한다 (최초 호출 시 관련 모델을 내려받으므로 첫 실행에는 인터넷
  연결이 필요할 수 있다). 운영 환경에서는 OpenAI 임베딩 등으로 교체 권장.
- 실제 아트/Tiled 맵은 아직 적용되지 않았다 (프론트엔드는 절차적 placeholder 사용 중).
