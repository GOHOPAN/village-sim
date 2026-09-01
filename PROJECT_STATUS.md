# PROJECT_STATUS — Village Simulation (Frontend + Backend)

> 이 파일의 목적: 채팅방이 길어져 `/compact` 되거나 새로 `clear` 된 뒤에도, Claude(나)가 이 프로젝트의
> 전체 그림을 처음부터 다시 파악할 필요 없이 이어서 작업할 수 있도록 하는 현황 요약본이다.
> 마지막 갱신: 2026-08-31 — untitled.tmx 재re-export + **실내/실외 판정을 `Floors` 타일 레이어 하나로
> 대폭 단순화**. 각 건물 그룹(House1~6, Cave)에 사용자가 만든 `Floors` 레이어의 채워진 칸에 플레이어가
> 들어오면 실내 판정 → Roofs/Walls/Doors 투명 + 어둠. 지붕/벽/문 교집합·처마 클리핑·문 동적 판정 등
> 복잡한 로직은 전부 삭제. 문 열기/닫기 애니메이션·충돌은 그대로. 63 타일셋 불변. **헤드리스로 트리거
> 토글([house1]↔[])은 확인, 페이드/어둠 시각 완료는 사용자 플레이 확인 대기.**
> 최근 변경 이력은 아래 "최근 변경" 섹션, 전체는 `CHANGELOG_ARCHIVE.md` "변경 이력"/"목차" 참고
> (git 커밋 이력이 없어 날짜 기준으로 작성됨).
>
> **주의**: 이 파일은 스냅샷이다. 이어가기 전에 "확인 필요" 항목처럼 실제 파일 상태를 먼저 확인할 것.
>
> **상태 파일 2개**: `PROJECT_STATUS.md`(이 파일 — 지금 상태 스냅샷, 매 세션 처음부터 끝까지 전체 읽기,
> 약 25,000토큰/470~480줄 이내 유지가 목표, "Truncated" 뜨면 `offset` 늘려 끝까지 + 트리밍 신호) /
> [`CHANGELOG_ARCHIVE.md`](CHANGELOG_ARCHIVE.md)(과거 이력 전체, append-only — 전체 읽지 말고 맨 위
> "읽는 요령"+"목차" 본 뒤 `Grep`으로 필요한 부분만).

## 한 줄 요약

React + Phaser 3 프론트엔드와 FastAPI + LLM 백엔드로 만드는 2D 마을 시뮬레이션 게임.
"생성형 에이전트"(기억 스트림 → 성찰 → 계획/반응) 방식으로 NPC들이 자율적으로 살아가고,
플레이어는 대화/은신/전투/채집/상점/도박 등으로 마을에 개입한다.

---

## 게임 기획 개요 (최종 목표)

> 이 섹션은 "지금 코드가 어디까지 구현됐는가"가 아니라, **이 프로젝트가 최종적으로 어떤 게임을 만들려는
> 것인지에 대한 게임 디자인 스펙(기획 목표)**이다. 구현 진행 상황/미구현 목록은 아래 Frontend/Backend
> 섹션, "확인 필요", "변경 이력(Changelog)"을 참고할 것 — 이 섹션과 실제 코드가 다르다면 코드가 아니라
> 이 문서(기획)가 아직 구현 전인 것일 수 있으니 혼동하지 말 것.

### 핵심 컨셉
Stanford Generative Agents(Smallville 논문)/AI Town에서 영감을 받았으나, 그 둘처럼 "구경하는 마을"이
아니라 **유저의 자유 입력(대화/행동/범죄/거짓 소문 등)이 NPC의 관계·소문·루틴·치안·경제에 실제로
파급되어 마을 전체가 유기적으로 반응하는 인터랙티브 시뮬레이션**을 최종 목표로 한다. 유저-NPC 대화는
선택지(멀티초이스) 방식이 아니라 TRPG처럼 텍스트/행동을 자유롭게 직접 입력하는 방식으로 확정됨(뜬금없는
입력도 그대로 반영되어 그에 맞는 반응이 나오는 것이 의도된 재미 요소).

### 데이터베이스
- **Relational DB** (설계 목표: MySQL, 현재 구현: SQLite — `DATABASE_URL`로 전환 가능): 유저/NPC 스탯,
  인벤토리, 소문 ID, 호감도 등 수치/정형 데이터
- **Vector DB (ChromaDB)**: NPC의 에피소드 기억, 성찰 결과 등 비정형 텍스트 데이터
  - 기억 관리: 이벤트가 발생하거나 유저의 상호작용이 일어날 때, 그 상황과 유사한 기억 상위 10개를
    중요도 점수로 선정해 LLM에 입력
  - 중요 기억 선별 기준: **Recency, Importance, Relevance** →
    `(최근성 점수 × 가중치) + (중요도 점수 × 가중치) + (연관성 점수 × 가중치)`

### 기술 스택 (설계 목표 — 실제 구현 버전/디테일은 아래 Frontend/Backend 섹션이 최신 정보)
- Backend: Python, FastAPI, Pydantic, SQLAlchemy
- Frontend: React + Phaser 3
- LLM: GPT-4o-mini(API) / Llama-3-8B-Instruct-abliterated / Hermes-2-Pro-Llama-3(로컬, 무검열) — 로직·
  성찰·게임마스터용과 NPC 감정 연기용을 분리해 하이브리드로 쓸 계획(상용 LLM이 결국 다 "착해지는"
  성선설 버그를 프롬프트 면책 조항만으로는 완전히 못 막는다는 결론에서 나온 방침)
- Map: Tiled / Character: Universal LPC Spritesheet Character Generator

### 조작 & 연출
- 조작: WASD(이동), E 또는 마우스 클릭(상호작용 — 타겟팅 우선순위 로직: NPC > 퀘스트 아이템 > 일반 사물)
- 시간 시스템: 시간 넘기기(스킵) 기능 존재. 실제 진행 비율은 이미 Frontend 코드(TimeSystem)에 구현되어
  있으므로 이 설계 문서에는 별도로 확정 비율을 명시하지 않는다(코드가 최신 기준).
- 대화 연출: 이모지 말풍선 기본 활용, 트위닝(Tweening) 애니메이션 적용
- 시야/은신(Stealth): 맵 곳곳에 `HIDDEN=TRUE` 속성의 수풀 타일 배치. 유저 진입 시 `phaser-raycaster`
  플러그인으로 NPC 시야각(광선투사) 검사 → NPC 시야 밖이면 은신 성공(엿듣기 아이콘 활성화), 걸리면 은신 실패
- 최적화: 유저 시야 거리 밖의 NPC는 LLM 호출을 생략하고 수학적 확률 연산으로만 친밀도 업데이트

### 엔티티 상태 변수
- **유저**: 피로도, 허기, 체력(피로도와 별개, 피통, 숨겨짐), 평판, 위생, 취기, 은신도, 자산/인벤토리
- **NPC**: 피로도, 허기, 체력(피로도와 별개, 피통, 숨겨짐), 자산/인벤토리, 취기, 친밀도, 호감도,
  긴장도(일시적, 장기적으로 높으면 친밀도와 호감도에 영향), 기분, 병(가벼운)
  > **존중도(위계)는 도입하지 않기로 확정.** 반말/존댓말 톤을 구분하는 스탯인데, 시스템이 너무
  > 복잡해질 것으로 판단해 의도적으로 제외함(다음 세션이 "왜 없지?" 하고 다시 추가하지 않도록 기록).
- **세계**: 시간, 날짜(계절), 날씨, 상권, **치안도**

### 경제(상권) 시스템
마을 전체 단위의 물가 변동(풍년/흉년 등)은 두지 않는다(작은 마을 규모상 불필요하다고 판단해 폐기).
대신 **상점별 유저 누적 소비액 기반의 개별 가격 변동**을 사용한다:
- 유저가 특정 상점(A)에서 소비를 많이 하면 → A는 장사가 잘돼 거만해지고 가격을 인상(예: +20%), NPC
  대사도 "우리 집 아니면 어디서 먹겠어?" 식으로 건방지게 바뀜
- 반대로 손님이 없는 경쟁 상점(B)은 절박해져 가격을 인하(예: -30%)하고, 유저가 지나가면 먼저
  호객 행위를 함
- 백엔드는 가게별 "유저 누적 소비액" 하나만 추적하면 되는 단순한 구조라 구현 부담이 크지 않음
- 이 메커니즘 때문에 **상점/식당은 경쟁 구도를 위해 각각 최소 2개 이상 필요**함(아래 "필수 시설" 참고)
- (구현 상태: Backend `Shop` 테이블 스키마는 이미 있으나 실제 가격 변동 로직은 아직 미연결 — 아래
  Backend "알려진 단순화 지점" 참고)

### 치안도 시스템
마을의 치안 상태는 **오직 유저의 평판/위협도에만 연동**된다 — "치안이 나빠지면 원래 선량하던 NPC가
갑자기 소매치기가 되어버리는" 모순을 막기 위해, 마을 자체의 독립적인 치안 변수 대신 유저 평판에
종속시키는 방식으로 확정.
- 1단계(평화): NPC는 맨손으로 다니고 유저에게 친근하게 인사
- 2단계(경계 — 절도/폭행 적발 시): NPC들이 유저를 슬슬 피하고, 밤이 되면 일찍 귀가해 문을 잠금(상호작용 불가)
- 3단계(공포/무장 — 살인 발생 시): 평범한 NPC 스프라이트가 쇠스랑/몽둥이/식칼을 든 모습으로 교체, 밤에는
  혼자 다니지 않고 2~3명씩 무리 지어 순찰, 유저가 다가가면 적대적인 텍스트("더 오지 마!")를 출력

### 필요 NPC
- **초기 설계 인원**: 촌장, 상인, 대장장이, 의사, 경찰, 술집 주인
- **추후 추가 가능 인원**: 요리사(2인 이상), 목수/나무꾼(**평소엔 나무를 베어 팔고, 화재 이벤트 발생
  시 집 수리를 하러 감** — 항상 명확한 생업이 있는 것으로 확정, "평소엔 백수"가 아님), 광부, 경찰
  1인 추가(총 2인), 추가 일반 시민
- 관계성 폭발(N×N)과 LLM 병목 현상을 피하기 위해, 위 초기 인원(6명)으로 먼저 전체 로직을 검증한 뒤
  10명 → 최종 15~20명까지 단계적으로 확장하는 것을 권장(현재 Backend 첫 기동 시드는 유저 1 + NPC
  7명 — 위 Backend 섹션 참고).

### 필수/특수 시설
- **필수 시설**: 술집, 상점(경쟁 상권용 2개 이상), 식당(경쟁 상권용 2개 이상), 대장간, 병원, 묘비,
  경찰서, 숲, 광산
- **특수 시설**: 도박장, 암시장 (밤에만 몰래 운영, 해당 NPC와의 친밀도가 높아야 입장 가능)

### 인지 및 소문 전파 로직
- 정보 획득: 시야 범위(광선투사) 내 사건 목격 또는 타인과의 대화, 엿듣기
- 소문: 소문마다 고유 ID를 부여하고, NPC의 DB에 "이 ID의 소문은 이미 알고 있음"이라는 태그를 달아
  중복 전파를 막음
  - 시스템 프롬프트로 소문 왜곡 제어(성격에 따라, 어느 정도만 왜곡되게)
  - 확률 로직으로 프롬프트를 동적으로 제어(소문 왜곡 여부/강도)
  - 정보의 원본(Fact)과 소문(Rumor)을 태그로 분리 저장(NPC에 따라 소문 진압도 가능)
  - 왜곡 허용 범위는 "인간관계/현실적 사고"까지만 — 판타지/괴물/지구 멸망 같은 세계관 붕괴 소재로
    번지는 것은 시스템 프롬프트로 금지

### 유저발 범죄 시스템
- **NPC 사망은 오직 유저의 공격(전투)으로만 발생**한다. NPC끼리의 다툼이나 자연사로 인한 사망은 없음.
- 목격자가 있는 경우: 목격한 NPC가 패닉에 빠져 도망치고, 다음 날 마을 전체에 "유저가 살인자다"라는
  소문(Fact)이 퍼져 유저는 현상수배 상태가 됨
- 목격자가 없는 경우(완벽한 범죄): 은신 상태로 암살하면 마을은 해당 NPC를 그냥 "실종"으로만 인지함
- 모함 플레이: 유저가 목격자 없이 암살한 뒤, 평소 피해자와 사이가 안 좋았던 다른 NPC에게 "사실 B가
  피 묻은 칼을 들고 가는 걸 봤다"는 거짓 정보를 흘리면, 그 NPC의 성격(의심 많음 등)에 따라 이 거짓
  소문이 진짜처럼 퍼져 무고한 NPC가 살인범으로 몰릴 수 있음(위 "인지 및 소문 전파 로직"을 그대로 재사용)

### NPC 기억 및 프롬프트 구조 (블록 순서 확정)
LLM 호출 시 주입되는 컨텍스트 구조 (충돌 방지를 위해 관계형 DB의 팩트를 최우선 연기 지침으로 설정):
1. **고정된 자아**: 이름, 직업, 성격
2. **현재 상태**: 관계형 DB 기준 현재 호감도/기분/HP 등 — **ChromaDB 기억보다 항상 최우선 적용**
3. **최근 대화 내역 (Short-term Context)**: 방금 전 유저와 나눈 마지막 대사 5~10개(대화 끊김 방지,
   벡터 검색 없이 그대로 삽입)
4. **검색된 기억 (ChromaDB)**: 유저 상호작용/이벤트 발생 시 (최근성×가중치)+(중요도×가중치)+
   (연관성×가중치) 점수 상위 10개 추출
5. **성찰 및 요약**: 과거의 깨달음이나 감정선 요약

> **이 순서(1.자아 → 2.상태 → 3.최근 대화 → 4.검색된 기억 → 5.성찰)가 최종 확정본**이다. 다른 어딘가에
> "3.성찰 → 4.검색된 기억 → 5.최근 대화" 순서로 축약 언급된 내용을 보게 되면 그건 오래된/착오였던
> 버전이니 이 섹션 순서를 따를 것.

> **최초 만남 처리(2026-08-24 추가)**: 플레이어와 해당 NPC가 처음 만나는 경우 위 3(최근 대화)·
> 4(검색된 기억)·5(성찰 및 요약) 블록이 전부 비어있게 된다. 이때 시스템이 "이번이 첫 만남"이라는
> 사실을 명시적으로 프롬프트에 주입해야 한다 — 블록을 그냥 비워두면 LLM이 존재하지 않는 과거 대화·
> 친밀도를 지어내는 환각으로 이어질 수 있기 때문(빈 프롬프트 = 환각 방지 목적). 구체적 구현 방법
> (플래그 필드 vs 고정 문장 삽입 등)은 아직 미정 — 착수 전 확정 필요.

### 성찰 및 루틴 재계획 (핵심 루프)
- 트리거: 유저가 침대에서 잠들 때 실행(하루 1회, 암전으로 로딩을 자연스럽게 은폐)
- 기절 시스템(Pass-out): 유저가 잠을 자지 않고 버틸 경우, 게임 내 새벽(예: 새벽 2시)에 강제 기절.
  암전과 함께 병원/집으로 이동되며 페널티 부과. 이때 강제로 글로벌 성찰/루틴 갱신 로직 실행(유저가
  영원히 안 자서 세계가 멈추는 것을 방지)
- 프롬프트로 제약을 걸어 할루시네이션 제어
- 성찰 팩트체크: LLM이 만든 성찰 결과를 바로 ChromaDB에 저장하지 않고, 관계형 DB의 관계 데이터와
  크로스체크(예: LLM이 "대장장이는 촌장과 친하다"고 지어내도 DB상 친밀도가 -50이면 재요약 요청)
- 루틴 생성: 소문과 성찰로 루틴을 제어. 루틴을 하드코딩하지 않고, 백엔드에서 LLM에게 다음 날 일일
  시간표를 새로 짜라고 지시(JSON 배열: 시간/장소/행동)

### 이벤트 및 World Event Manager
백엔드 매니저는 다음 순서로 세계를 업데이트한다:
1. **환경 이벤트 발생**: 정기/돌발 이벤트 시작 여부 체크
   - **이벤트 풀**: 결혼식, 장례식, 화재, **전염병**(주의: NPC가 사망할 정도로 심하게 만들면 안 되고,
     단순히 "가벼운 병" 상태 정도로만 제한할 것), **방랑 상인**(암시장과 연결되는 인물, 랜덤 확률로
     밤이나 비 오는 날 잠깐 등장했다 사라짐). (마을 장날/축제, 촌장 선거, 공개 재판 등은 논의는 됐으나
     최종 채택하지 않음 — 다음 세션이 임의로 다시 추가하지 않도록 기록)
   - 이벤트 발생 시, 생성된 개별 루틴을 무시하고 '이벤트 전용 시간표'로 강제 오버라이드(덮어쓰기)
2. **기억 브로드캐스팅**: 주변 NPC들에게 주요 사건 알림 (단, `is_dead = True`인 사망 NPC는 브로드캐스트
   및 루틴 생성에서 완전 배제)
3. **비동기 루틴 갱신 (Async LLM)**: FastAPI의 비동기 처리(async/await)로 다수 NPC의 루틴을 동시 생성.
   클라이언트(Phaser) 화면에는 로딩 바(Progress Bar) 표시. 폴백 루틴(Fallback): LLM 에러나 JSON 파싱
   실패 시 게임 프리징을 막기 위해 '기본 생존 시간표(집→일터→집)'를 강제 주입
4. **관계 데이터 업데이트**: 모든 수치를 관계형 DB에 반영 후 다음 날 아침으로 전환

### 추가 기획 아이디어 (2026-08-24 신규, 전부 미구현 — 세부 확정 전 초안)
> 사용자가 "지금 당장 구현할 건 아니고, 나중을 위해 기록만 해두고 싶다"며 추가 요청한 아이디어 묶음.
> 다른 섹션과 달리 담당 NPC/정확한 수치 등 디테일이 비어 있는 부분이 있으니, 실제 착수 전에 사용자와
> 재확인할 것.

- **낚시/농사**: 신규 채집 활동 2종. 곡괭이/도끼/괭이(농사)/낚싯대(낚시) **4종 전부 대장장이 NPC에게서
  최초 구매 가능**(별도 NPC 없이 대장장이가 판매+강화를 모두 담당 — 2026-08-24 확정).
- **장비 강화(대장장이)**: 곡괭이/낚싯대/도끼/괭이 4종 모두 대장장이에게 "현재 보유 장비 + 돈 일부 +
  특정 광석(곡괭이로 Cave에서 채굴한 것)"을 가져가면 한 단계 업그레이드. 예: 돌 곡괭이+1000G+철광석
  10개 → 철 곡괭이. **반드시 한 단계씩 순차 진행**(돌→철→금 …, 단계 스킵 불가 — 철 곡괭이 보유 중이면
  다음은 금 곡괭이만 가능).
- **장비 등급별 효과**: 곡괭이는 등급이 오를수록 캘 수 있는 **광석 종류가 늘어남**(예: 돌 등급까지는
  돌/철만 드롭되다가, 철 등급 이후엔 돌/철/금이 랜덤 드롭 — 드롭 풀과 곡괭이 단계가 서로 맞물려야
  함, 상위 광물은 상위 곡괭이 필수). 괭이/낚싯대/도끼는 종류가 늘어나는 게 아니라 **수확량 증가 +
  채집 속도 증가**로 효과가 다름.
- **집 인테리어 구매(목수 NPC)**: 플레이어 집 내부 인테리어를 목수 NPC에게 구매(돈의 신규 사용처).
  초기 상태는 침대 하나뿐이고, 이후 구매로 하나씩 추가. 위 "필요 NPC"의 나무꾼 겸 목수 NPC를 그대로
  재사용하면 될 것으로 보임.
- **평판 확장(선행으로 증가하되 범죄 이력은 안 지워짐)**: 기존 "치안도 시스템"은 평판 하락(범죄)만
  다뤘는데, 여기에 선행을 통한 평판 **증가** 경로를 추가한다. 단 **평판 수치가 회복돼도 과거 범죄
  사실(예: 살인 이력) 자체는 NPC 기억/소문에서 사라지면 안 됨** — "평판 점수"와 "NPC가 유저를 실제로
  기억하는 내용"을 서로 다른 레이어로 유지해야 한다는 뜻. 위 "인지 및 소문 전파 로직"/"유저발 범죄
  시스템"의 Fact/Rumor 분리 저장 구조를 그대로 재사용하면 될 것으로 보임(범죄 Fact는 평판 점수와
  무관하게 영구 보존).
- **마을 청소 + 발전(기금)**: 두 가지가 묶인 기획.
  - 청소: 맵의 쓰레기 오브젝트에 E로 상호작용 → 인벤토리에 "쓰레기" 아이템 추가. 공용 쓰레기통에
    상호작용 → 인벤토리에 쌓인 쓰레기 전부 제거 + 평판 상승. **쓰레기통 상호작용이 인벤토리의 다른
    아이템/장비까지 지우면 안 됨**(쓰레기만 선택적으로 제거).
  - 발전: 플레이어가 누적 기부한 "마을 기금"이 특정 임계값을 넘을 때마다 마을 인프라(전봇대, 도로
    등)가 하나씩 추가됨 — 기금 누적치 상태값 + 임계값 테이블 설계 필요.
  - **도로(Roads) 발전 단계**(2026-08-31 확정 — 맵에 레이어는 이미 존재하나 기능은 미구현, 현재는 맵
    구현에 집중 중이라 착수 전): Tiled의 `Roads` 그룹 레이어는 `Roads1`~`Roads3` 타일 레이어로
    구성되어 있고 추후 `Roads4`·`Roads5`까지 추가 예정. 마을 기금 단계에 따라 화면에 보이는 도로 타일
    레이어가 아래처럼 바뀐다:
    - 가장 초기 단계: `Roads1`만 표시
    - 기금 1단계: `Roads1` + `Roads2` 동시 표시
    - 기금 2단계: `Roads3` 단독 표시
    - 기금 3단계: `Roads4` 단독 표시
    - 기금 4단계: `Roads5` 단독 표시
    즉 1단계까지는 누적(합집합)이고, 2단계부터는 해당 번호 레이어 하나만 단독으로 보이도록 완전히
    교체된다. **이 규칙은 `Roads` 그룹 내부의 `Roads*` 타일 레이어에만 해당한다 — `Mountain` 그룹
    내부의 `Road` 타일 레이어는 산길이라 기금과 무관하며 항상 표시된다(혼동 금지).**
- **밤 랜덤 이벤트 — 수상한 NPC**: 밤에 확률적으로 "수상한 NPC" 등장. 전투로 제압하면 포상금 + 명성
  상승. **유저가 패배할 수 있는지, 패배 시 페널티/처분이 무엇인지는 아직 미정**(착수 전 결정 필요 —
  다른 전투 페널티 설계와 일관되게 맞출 것).
- **퀘스트 시스템**: 온보딩 겸 튜토리얼용 퀘스트 체인. 1) 촌장에게 인사. 2) 채집 직업 퀘스트 4종 —
  **2-1** 곡괭이 구매→광질→판매(대장장이), **2-2** 도끼 구매→벌채→판매(목수), **2-3** 낚싯대 구매→
  낚시→판매(음식점 상인), **2-4** 괭이 구매→씨앗 구매(일반 상인)→농사→판매(음식점 상인). 3) 마을
  활동 퀘스트 2종 — **3-1** 청소 퀘스트, **3-2** 인테리어 구매 퀘스트. **같은 대단원 번호(예:
  2-1~2-4)는 병렬 퀘스트로 동시에 전부 노출됨**(순서 강제 없이 유저가 원하는 것부터 진행 가능 — 3-1/
  3-2도 같은 원칙이 적용될 것으로 보이나 사용자가 명시적으로 확인한 건 2-1~2-4 사례뿐이니 착수 전
  재확인할 것). **퀘스트 목록/내용은 확정본이 아니라 이후 자유롭게 수정·추가·삭제 가능**함을 사용자가
  명시적으로 강조함.
- **조작법 UI**: 화면 좌측(맵/인게임 화면이 나오는 영역 바깥)에 조작법을 상시 표시. 구체적인 UI
  디자인/구현은 아직 미정, 추후 결정 및 제작 예정.
- **채집물 판매처 / 재료 구매처 매핑**(위 "낚시/농사"·"퀘스트 시스템" 항목의 판매·구매 루프를
  구체화): 광석 → 대장장이에게 판매, 목재 → 목수에게 판매, 물고기·농산물 → 음식점 상인에게 판매,
  씨앗 → 일반 상인에게 구매, 인테리어 → 목수에게 구매(장비 최초 구매/강화는 대장장이 담당 — 위
  "낚시/농사"·"장비 강화" 항목 참고).

---

## 폴더 구조 (최상위)

```
c:\PersonalProject\
├── Frontend\                          # React + Phaser 3 클라이언트 (아래 참고)
├── Backend\                           # FastAPI + SQLAlchemy + ChromaDB 서버 (아래 참고)
├── untitled.tmx / .tiled-project / .tiled-session   # Tiled 맵 에디터로 실제 맵을 그리는 작업 파일
├── tileset_town_multi_v002.png        # 낱개 타일셋 원본 에셋
└── (여러 픽셀아트 에셋 폴더들: Pixel Art Top Down, Top-Down RPG 32x32 by Mixel,
     Top-Down_Retro_Interior, building houses, main-characters-home-free-top-down-pixel-art-asset)
     → Tiled로 실제 맵/캐릭터를 만들 때 쓰는 소스 그래픽 리소스 모음
```

**git 저장소 없음** — Frontend, Backend 둘 다 `git init` 이 안 되어 있다 (`.gitignore`만 존재).
버전 관리가 필요해지면 사용자에게 먼저 확인 후 `git init` 진행할 것.

---

## Frontend (`c:\PersonalProject\Frontend`)

- **스택**: React 19 + Phaser 3.90 (arcade physics) + `phaser-raycaster` + `easystarjs`(A* 경로탐색) + Vite 8
- **실행**: `npm install` → `.env.example`을 `.env`로 복사(`VITE_API_BASE_URL`) → `npm run dev`
  (백엔드가 `http://127.0.0.1:8000`에서 먼저 떠 있어야 함)
- **상세 구조/조작법/커스터마이징 절차는 [Frontend/README.md](Frontend/README.md)에 이미 매우 자세히 정리되어 있음.**
  이 파일에서는 README에 없는 것, 즉 "현재 진행 중이라 아직 문서화 안 된 것" 위주로 기록한다.

### 핵심 구조 요약
- `src/game/scenes/BootScene.js`, `MainScene.js` — 기존 게임 흐름. 색깔 도형 procedural placeholder 텍스처/맵 사용.
- `src/game/map/mapData.js` — 타일/맵 크기, 건물 좌표. **`Backend/app/world_layout.py`와 좌표 1:1 동기화 필수**
  (표는 Frontend/README.md 참고). 어긋나면 NPC 길찾기 실패/시설 위치 어긋남.
- `src/components/` — HUD, ChatBox(대화+선물), Inventory, FacilityModal(상점/채집/도박), EavesdropModal 등 UI.
- `src/game/systems/` — TimeSystem(시계/기절), InteractionSystem(E키 타겟팅), StealthSystem(은신/시야각 판정),
  Pathfinder(A*).

### 🚧 진행 중 (README에 아직 반영 안 됨): 실제 Tiled 맵 통합
- `src/game/scenes/TiledMapTestScene.js` + `src/game/tiledTilesetManifest.js` — 기존 `BootScene →
  MainScene`와 **완전히 분리된 테스트 경로**. `?map=tiled` 쿼리(`src/game/config.js`)로 `public/maps/village.json`
  로드. 지붕+벽 페이드 등 상세 동작은 아래 "구현 스펙 원문" 1~8번이 최신 기준(여기서 중복 서술 안 함).
- **아직 안 된 것**: 이 테스트 씬을 실제 `MainScene`(NPC/전투/은신 등)에 통합. 지금은 두 씬이 별개라
  실제 맵으로 NPC와 상호작용 불가. → **다음 단계**: `MainScene._buildMap()`을 Tiled 로딩으로 교체 +
  `mapData.js` 좌표 상수 + `Backend/app/world_layout.py` 동시 갱신 (Frontend/README.md "1. 실제 맵으로
  교체하기" 섹션이 이 절차).
- `public/maps/village.json`은 **`c:\PersonalProject\untitled.tmx`를 `tiled.exe --export-map json`으로
  재export한 파생 파일** — 직접 편집 금지, 항상 `.tmx` 고친 뒤 재export. 현재 130×120, 타일셋 63개.
  레이어 구성(2026-08-31 기준):
  - 최상위 타일 레이어: `BaseGround`, `Water`, `CollisionLayer`(항상 숨김).
  - `House1`~`House6` 그룹: 각 실제 건물. 자식 = **`Floors`**/`WInteriors`/`Rugs`/`Interiors`/`WInteriors2`/
    `Walls`/`Doors`/`Roofs` 타일 레이어 + `DoorObject` 오브젝트 레이어. **`Floors` = "여기 서 있으면
    실내" 인 칸을 사용자가 직접 칠한 레이어**(문턱 포함, 처마 아래는 안 칠함). 플레이어 발밑이 `Floors`
    칸에 들어오면 그 그룹의 `Walls`/`Doors`/`Roofs`가 투명해지고 주변이 어두워진다(위 "구현 스펙 원문" 4번).
  - `Cave` 그룹: `Floors`/`Interiors`/`WInteriors`/`Walls`/`Roofs`. House와 동일하게 `Floors`로 판정.
  - `Roads` 그룹(`Roads1`~`Roads3`, 마을 기금 발전용 — 위 "게임 기획 개요"), `Graveyard`(`W1`/`W2`),
    `Plaza`(`Ground`/`Structure`/`Exterior1`/`Exterior2` + `Stair` 오브젝트), `Mountain`(`MountainFloor`/
    `Road`/`House`>`Interior` + `StairStraight` 오브젝트): **`Floors` 레이어 없음 → 페이드/어둠 대상
    아님**(항상 표시). Roads는 기능 미구현이라 3개 레이어가 그대로 겹쳐 보임.
  - `Forest`(`Tree1`~`Tree12` Y-정렬).
  - `Darkness` 타일 레이어는 더 이상 없음(어둠은 씬 전체 오버레이).
- **문(Doors) 디자인(2026-08-31)**: 문 타일 = 가로 3칸×세로 2칸(96×64px) 블록, **가운데 세로 열(2칸)만
  애니메이션 authored**, 좌/우 문틀은 정지 타일. `collectAnimatedCells()`가 애니메이션 타일만 문으로 잡고
  `_deriveDoorHitboxRects()`도 그 칸으로만 충돌을 유도 → **문 열기 시 Collision 해제는 가운데 애니메이션
  타일뿐**, 좌/우 문틀은 `CollisionLayer` 상시(사용자 확인 "잘 작동됨"). 문 열기/닫기 애니메이션·상태머신은
  이번 단순화에서 안 건드림.
- **Y-정렬 + 밑둥 충돌**: 규칙은 아래 "구현 스펙 원문" 6번. 밑둥 충돌은 알파 채널 자동 계산을 2026-07-27에
  폐기하고 사람이 Tiled `CollisionLayer`에 직접 `collides:true` 배치(자동 유추 오탐/누락 제거). 히트박스
  재작성 이력(4차)/검증 로그: `CHANGELOG_ARCHIVE.md` 2026-07-24/27 항목.

#### 구현 스펙 원문 (`TiledMapTestScene.js`가 그대로 구현한 요구사항, 향후 다른 그룹/건물에도 동일 적용)
1. 타일 충돌은 두 메커니즘이 공존함:
   ① 최상위 `CollisionLayer`: `collides:true` 타일만 배치 → `setCollisionByProperty({collides:true})`,
      **항상 숨김**(화면에 안 보임, 페이드와 무관). `collides:true`이면서 Tile Collision Editor 사각형도
      함께 그려진 타일은 전체-타일 충돌을 `setCollision([...], false)`로 다시 꺼서 ②와 동일하게 정밀
      사각형만 막는다(2026-07-27 정리 — 배경은 `CHANGELOG_ARCHIVE.md` 2026-07-27 항목). 사각형이 없는
      타일은 그대로 전체가 막힘.
   ② `Interiors` 등 보여야 하는 레이어의 일부 타일은 Tile Collision Editor 사각형 히트박스가 있음 →
      `_buildPreciseTileHitboxZones`가 `tile.getCollisionGroup().objects`의 로컬 좌표를
      `tile.pixelX/pixelY`로 월드 좌표 변환해 `preciseHitboxZoneGroup`에 정적 존으로 등록(폴리곤/타원/
      포인트 미지원, 사각형만). 배경(`setCollisionFromCollisionGroup(true)`가 타일 전체를 막던 문제):
      `CHANGELOG_ARCHIVE.md` 2026-07-22 항목.
2. 그룹 레이어 = 건물/구조물 하나 (예: `House1`, `Cave`). **그룹에 `Floors` 타일 레이어가 있으면 그
   그룹이 "들어가면 실내가 되는 건물"** (`Floors` 없으면 트리거 대상 아님). **그룹 이름은 건물마다 고유**.
3. `_buildGroupFadeLayerMap`이 `Floors` 있는 그룹만 등록한다(그룹명 소문자 키, Phaser 평탄화 이름
   "House1/Floors" 등으로 저장):
   - `floorLayerNameByGroup`: 그룹 → 그 `Floors` 레이어. 트리거 존의 모양이 된다.
   - `hideOnEnterLayersByGroupName`: 그 그룹에서 이름에 "roof"/"wall"/"door"가 들어간 레이어들 → 들어가면
     alpha→0(투명), 나가면 alpha→1. `WInteriors`/`Rugs`/`Interiors`/`Floors`처럼 매칭 안 되는 레이어는
     항상 그대로 보임.
   - `buildingFootprintRects`: **실내에서 계속 보이는 레이어**(`Floors` + roof/wall/door가 아닌 나머지 =
     `WInteriors`/`WInteriors2`/`Interiors`/`Rugs`) 채워진 칸 합집합 → 어둠 오버레이 구멍(마스크)용. `Floors`만
     쓰면 방 바깥쪽 줄에 그린 "안에서 본 벽"이 어둠에 잘려 보임(2026-08-31 사용자 피드백으로 수정).
   - **레이어 depth(그리기 순서)**: create() 루프가 이름이 "roof"/"wall"/"door" 또는 **숫자 접미사 있는
     `WInteriors2`**(방 좌/우/아래 near 벽 안쪽 면 - 캐릭터 위에 그려져야 함)인 레이어에만
     `STRUCTURE_ALWAYS_ON_TOP_DEPTH`(1e6)를 준다. **숫자 없는 순수 `WInteriors`**(방 뒤 far 벽)는 depth를
     안 줘서 맵 레이어 순서(Floors→WInteriors→Rugs→Interiors)대로 그려진다 - Rugs/Interiors 밑에 깔림
     (2026-08-31 사용자 피드백: "WInteriors가 Interiors보다 위에 있다" 수정, 정규식 `\d*`→`\d+`).
   - **어둠**: 씬 전체에 검은 Rectangle 하나(`darknessOverlay`, depth `DARKNESS_DEPTH` = 모든 구조물 위)를
     두고, `confirmedActiveRoofs`(지금 들어가 있는 건물들)의 실내 footprint(위 `buildingFootprintRects`)를
     반전 geometry mask로 구멍 낸다(`_refreshDarknessOverlay`). Tiled의 `Darkness` 타일 레이어는 안 씀.
4. **"안에 들어옴" 트리거(2026-08-31 재설계 — `Floors` 방식)**: `_buildTriggerZonesFromFadeLayers`가
   각 건물 그룹의 `Floors` 타일 레이어에서 채워진 칸을 행 단위로 훑어 정적 물리 존을 만들고 플레이어와
   overlap을 잡는다. 끝. 지붕/벽/문 타일이나 그 교집합, 벽 bounding box 처마 클리핑, 문 열림/닫힘 상태에
   따른 동적 판정(구 `doorwayRect`)·구 `_addDoorInteriorTriggerZones` "안쪽 ¾" 존 — **전부 삭제**. 사용자가
   `Floors` 레이어로 실내 영역(문턱·문 칸 포함, 처마 아래 제외)을 Tiled에서 직접 칠하는 게 기준이다.
   각 존은 `ROOF_TRIGGER_ZONE_PADDING`(-4px)만큼 안쪽으로 줄여 경계에 딱 붙어 서는 것만으로는 발동 안 함.
5. 이번 프레임에 겹치는 트리거들의 그룹 이름을 Set으로 모아 직전 프레임 Set과 비교하는 방식으로
   깜빡임 없이 부드럽게 처리 (신규 진입/이탈 시 hideOnEnter 레이어 300ms Linear tween + 어둠 오버레이
   갱신) — `_fadeGroupLayers(groupNameLower, isEntering)` → 끝에서 `_refreshDarknessOverlay()` 호출.
6. **Y-정렬(2026-08-06 일반화)**: 리프 타일 레이어 이름에 "ysort"가 부분 문자열로 들어간 타일 레이어는
   (그룹 안이든 최상위든 무관) `_isYSortLayerName()`이 자동으로 감지해 `createLayer()` 대신
   `_renderYSortLayerVisuals()`로 타일 하나하나를 개별 오브젝트로 바꾸고, 플레이어 y좌표와 비교되는
   동적 depth를 부여한다(같은 열에서 세로로 이어진 구간은 `_buildYSortColumnRunDepths()`가 하나의 depth로
   묶어서 오브젝트가 중간에 갈라져 보이지 않게 함). 밑둥/받침대 충돌은 이 메커니즘과 무관하게 위 ①
   `CollisionLayer`가 그대로 담당(사용자가 Tiled에서 직접 `collides:true` 타일을 놓음). Forest의
   `Tree1`~`Tree12`는 레거시 전용 규칙으로 계속 지원됨(이름 변경 불필요). 새 Y-정렬 오브젝트(석상, 비석
   등)를 추가하려면 그 타일들을 담을 타일 레이어 이름에 "ysort"만 포함시키면 코드 변경 없이 바로 적용됨.
7. **계단 이동 존(2026-08-09 추가, 같은 날 StairStraight로 확장)**: 이름에 "stair"가 들어간 오브젝트
   레이어(사각형)는 `_buildStairZones()`가 순수 데이터 존으로 모은다. 리프 이름에 "straight"가
   없으면(예: `Stair`) `snap:true` + 방향 데이터(dirX/dirY 커스텀 프로퍼티가 있으면 그 값, 없으면
   기본값 오른쪽 위 2:1 비율)를, "straight"가 있으면(예: `StairStraight`) `snap:false` + 방향 데이터
   없음을 저장한다. `update()`가 매 프레임 `_findStairZoneForPlayer()`로 플레이어와 직접 사각형
   검사를 해서: 존이 있으면 항상 이동 속도를 고정값 `STAIR_MOVE_SPEED = 200`(평소 `MOVE_SPEED = 300`,
   달리기 `RUN_MOVE_SPEED = 450`과 별개 - Shift를 눌러도 계단에서는 이 속도로 고정됨, 아래 2026-08-09
   "이동 속도 체계 정리" 항목 참고)으로 적용하고, `snap:true`인 존에서는 추가로 입력 부호가 계단의
   전진/후진 축과 맞을 때 그 비율의 완전한 대각선 속도로 덮어쓴다(`snap:false`는 입력 방향을 그대로
   두고 속도만 고정). 새 계단을 추가할 때: 대각선이면 `Stair`(+ 필요시 dirX/dirY), 이미 입력
   방향과 그림이 일치하는 세로/가로 계단이면 `StairStraight`라는 이름의 오브젝트 레이어에 사각형만
   그리면 코드 변경 없이 적용됨. 다른 트리거(Roof 등)와 달리 일부러 `physics.add.overlap()`을 쓰지
   않는데, 그 콜백이 물리 서브스텝과 렌더 프레임 불일치로 한 프레임씩 걸러 호출되는 것을 실측으로
   확인했기 때문(상세: 아래 Changelog 2026-08-09 항목).
8. **문 개폐 상호작용**(배경 전문: `CHANGELOG_ARCHIVE.md` 2026-08-11/24/25/27 항목): 리프 이름에 "door"가
   들어간 오브젝트 레이어(판정 존, 문 타일보다 넉넉)와 타일 레이어(`Doors`, 문 칸마다 4프레임 애니메이션
   authored)를 `_buildDoorZones()`가 짝지어 문 존 생성. 판정 존과 충돌 범위를 분리한 이유: 겸하면
   닫혀있을 때 판정 존이 벽이 되어 프롬프트를 못 띄움. 상호작용은 `keydown-E` 리스너(`update()` 폴링 X —
   Playwright 키 누락 실측). 프레임은 Tiled authored 프레임/duration만 읽어 코드가 직접 앞/뒤 재생.
   **잠금(locked) 없음.** 현재 동작:
   ① `Doors`도 hideOnEnter → Wall/Roof와 함께 안에 들어가면 사라짐. "안에 들어옴" 판정 자체는 `Floors`
   레이어 트리거가 담당(위 4번) — 문 열림/닫힘과 무관.
   ② `WInteriors`류(리프 이름 `/^winteriors?\d*$/i` — `WInteriors2`도 매칭)의 "위에서 본 문" 타일을
   `interiorCells`로 함께 관리 → 바깥(Doors)·안쪽 그림이 같은 프레임으로 동시 재생.
   ③ 충돌은 `_deriveDoorHitboxRects()`가 이웃 `CollisionLayer` 벽 두께 그대로 유도한 얇은 정적 존
   (`doorHitboxZoneGroup`, House1 16px) — 열리면 `body.enable=false`, 닫히면 켬(중간 전이 중엔 유지).

#### 🐛 겪었던 지붕/트리거 버그 요약 (버그 1~6, 전부 해결됨 — 상세는 `CHANGELOG_ARCHIVE.md` "상세 버그 진단 기록"/"변경 이력", "버그 N"·날짜로 Grep)
- **버그 1** 그룹명≠트리거명 불일치→페이드 무반응. 교훈: 페이드가 경고 없이 "무반응"이면 이름 불일치부터 의심.
- **버그 2** 손그림 RoofTrigger 사이 미세 틈→깜빡임. 버그 5로 완전 대체됨.
- **버그 3** 대용량 맵 JSON을 `Write`로 저장 시 손실. 교훈: 수백 KB급 붙여넣기 후 파일 크기/키 개수 대조 (지금은 `tiled.exe` CLI export라 무관).
- **버그 4** Phaser가 그룹 자식 레이어를 `"Cave/Roofs"`로 평탄화→raw 이름 조회 시 `getLayer()` null. 교훈: 그룹 레이어는 `"그룹/자식"`으로 조회.
- **버그 5** 손그림 RoofTrigger가 지붕 타일 범위에 구멍. → 타일 채워진 칸에서 트리거 자동 생성으로 교체. 교훈: 트리거는 시각 타일 데이터에서 직접 유도(계단/Y-정렬/문에도 동일 원칙).
- **버그 6** 자동 생성 후 8px 패딩이 너무 넓어 벽에 스쳐도 발동. → 패딩 -4px(안쪽 축소) + 디바운스(`ACTIVE_STATE_DEBOUNCE_FRAMES=4`).
- **버그 7**(2026-08-31) 지붕 처마·문 자리 벽 구멍으로 트리거 사각지대/오작동 → 한동안 처마 클리핑 +
  문 동적 판정으로 땜질했으나, 결국 **사용자가 `Floors` 타일 레이어로 실내 영역을 직접 칠하는 방식**으로
  전면 교체(그 땜질 코드는 전부 삭제). 교훈: 자동 유도가 자꾸 어긋나면, 사람이 데이터로 직접 명시하게 하라.

#### 실전 주의사항 (참고용)
- **한글 경로**: `C:\Users\반고호` 같은 한글 홈 디렉토리에서 git-bash `ls`/`find`가 유령 파일을 보이는
  등 불안정 — 재현 안 되면 세션 트랜스크립트 직접 읽기로 우회. Python은 `C:/Python314/python.exe`(WindowsApps의
  `python3`는 더미), 경로 인자는 Windows 스타일(`C:/...`)로.
- **검증**: 1차는 `npx oxlint` + `npm run dev`+`curl` 200 + `node --check`. **실제 페이드/깜빡임/어둠은
  결국 Playwright나 직접 플레이 필요** — 정적 검증으로 대체 불가.
- **Vite HMR 한계**: `config.js`처럼 씬 구성 자체를 바꾸면 열린 탭은 하드 리프레시(Ctrl+F5) 필요.
- `?map=tiled` 쿼리가 붙어야 Tiled 씬, 아니면 기존 `BootScene → MainScene`.
- Tiled 재export: `"C:\Program Files\Tiled\tiled.exe" --export-map json <src.tmx> <dst.json>` CLI 사용.
- **`public/tilesets/*.png`는 원본(`C:\PersonalProject\Tilesets\...`)의 스냅샷 사본** — 원본 수정해도 조용히
  반영 안 됨. "이미 쓰던 타일셋을 다시 고쳤다"는 말이 나오면 `village.json` `tilesets[]`를 대조해 재복사
  (상세: `CHANGELOG_ARCHIVE.md` 2026-08-11 항목). 2026-08-31에 tmx가 참조하는 63개 전체를 원본에서
  재복사함. **주의**: 매니페스트 값(파일명)은 Windows 대소문자 무시 FS에서 충돌 금지 — Mixel `Bushes`와
  Fantasy Farm `bushes`가 겹쳐서 후자를 `farm_bushes`로 매핑했다(`tiledTilesetManifest.js` 주석 참고).
- **`physics.add.overlap()` 콜백은 매 프레임 호출을 보장 안 함**(물리 서브스텝≠렌더 프레임). Roof 트리거처럼
  프레임 밀려도 무해한 건 OK, 계단/문처럼 매 프레임 판정이 필요하면 `update()`에서 직접 사각형 검사.

### 알려진 미구현 (Frontend/README.md "알려진 미구현/단순화 지점" 요약)
- 애니메이션 미재생 (백엔드는 `animation_state`/`movement_x`/`movement_y`를 이미 보내주지만 재생 안 함)
- 공격 시 시각 효과 없음 (API 호출 + 텍스트뿐)
- 딴청 피우기(벤치 앉기로 NPC 경계 낮추기) 연출 없음
- NPC 사망 후 직업 계승 시스템 없음
- 실제 캐릭터 스프라이트 미적용 (여전히 색깔 도형)

---

## Backend (`c:\PersonalProject\Backend`)

- **스택**: FastAPI + Pydantic v2 + SQLAlchemy 2.0(기본 SQLite `village.db`, `DATABASE_URL`로 MySQL 전환 가능)
  + ChromaDB(로컬 퍼시스턴트, `chroma_data/`) + OpenAI 호환 LLM 클라이언트(대사용/GM용 분리, 키 없으면
  결정론적 폴백으로 전체 스택 정상 동작)
- **실행**: `python -m venv venv` → 활성화 → `pip install -r requirements.txt` →
  `.env.example`을 `.env`로 복사 → `uvicorn app.main:app --reload --port 8000`
  첫 기동 시 유저 1명 + NPC 7명(촌장/상인/대장장이/의사/경찰/술집주인/목수) 자동 시드.
- **상세 아키텍처 매핑, API 목록, 밸런스 조정 방법은 [Backend/README.md](Backend/README.md)에
  매우 자세히 정리되어 있음** (예: `GameConfig` 런타임 조정, NPC 성격 실시간 PATCH, 아이템 카탈로그 등).
  Swagger UI: 서버 기동 후 `http://127.0.0.1:8000/docs`.

### 핵심 구조 요약
- `app/models/` — SQLAlchemy ORM (npc, user, relationship, routine, rumor, event, inventory, world, game_config 등)
- `app/routers/` — REST 엔드포인트 (chat, combat, eavesdrop, encounter, event, facility, npc, rumor, shop, user, world, config)
- `app/services/` — 핵심 로직: `memory_service`(기억 스트림+스코어링), `prompt_builder`(5블록 프롬프트),
  `llm_service`(GM/대사 클라이언트 분리+JSON 검증+폴백), `reflection_service`, `routine_service`(일과 생성),
  `rumor_service`(소문 전파/왜곡), `world_event_manager`(화재/결혼식/장례식), `relationship_service`
- `app/world_layout.py` — NPC 성격/비밀/집·일터 좌표 + 맵 좌표 상수(Frontend `mapData.js`와 동기화 필수)
- `app/item_catalog.py` — 아이템/가격/전투력/채집 설정

### 알려진 단순화 지점 (Backend/README.md 요약)
- 애니메이션 필드는 생성/전달만 하고 프론트가 아직 재생 안 함 (Frontend 쪽 항목과 동일 이슈)
- 딴청 피우기, 직업 계승 시스템 없음
- 상권 경쟁(`Shop` 테이블)은 스키마만 있고 실제 가격 변동 로직 미연결
- ChromaDB 기본 임베딩 함수 사용 중 (운영 시 OpenAI 임베딩 교체 권장)
- 실제 아트/Tiled 맵 미적용 (Frontend 쪽 진행 상황 위 참고)

---

## 두 프로젝트 사이의 "반드시 동기화" 지점

| 항목 | Frontend | Backend |
| --- | --- | --- |
| 타일/맵 크기, 건물·집 좌표 | `src/game/map/mapData.js` | `app/world_layout.py` |

값이 어긋나면 NPC가 도달 불가능한 좌표로 출근(길찾기 실패)하거나 시설 위치가 어긋남.
좌표를 바꾼 뒤에는 `Backend/village.db`를 지우고 서버 재시작 필요 (NPC가 새 좌표로 재시드됨).

## 확인 필요 (이 파일이 stale해졌을 수 있는 부분)

- **2026-08-31 `Floors` 트리거 방식 실플레이 검증 대기**: 사용자 확인됨(이전 라운드) — 가운데 타일만
  Collision 해제 / `Roofs` 집 안 숨김 OK. 이번 변경: 실내 판정을 각 그룹의 `Floors` 타일 레이어로 단순화.
  헤드리스로 트리거 토글(House1 안/문턱=`[house1]`, 문 밖=`[]`, Cave 안=`[cave]`) 확인. **미검증**: ①
  House1~6·Cave 전부 실제로 들어갔을 때 지붕/벽/문 페이드 + 어둠 시각 정상(헤드리스는 tween 완료 확인
  불가 — Phaser 루프가 몇 프레임만 진행), ② `Floors` 칠한 범위가 실제 방 모양과 잘 맞는지(경계에서
  튐/끊김), ③ `Roads1`~`Roads3` 겹침 시각, ④ House5의 tmx `visible=0` 레이어들이 인게임에서 잘 보이는지
  (코드가 강제 `setVisible(true)` 하지만 확인 요). 백업: `c:\PersonalProject\village.json.bak-20260831`.
- **잠금(locked) 문 로직 없음** — 추가하려면 `doorZones`에 `locked` 필드 + `_handleDoorInteractKey()` 분기.
- **Forest 나무 밑둥 충돌**: 사용자가 `CollisionLayer`에 직접 배치하는 방식(2026-07-27~). Playwright는 대표
  타일 몇 곳만 확인 — 숲 전체 935칸 스윕은 사용자 실제 플레이로 최종 확인 필요.
- **계단**(`Stair` 대각선 스냅 1개, `StairStraight` 감속 4개): Playwright로 속도/좌표만 검증, "오르는 느낌"
  체감은 미확인.
- **Shift 달리기 터널링**: 2026-08-27 사용자 보고(얇은 precise hitbox 존을 빠른 속도로 통과). 미수정 —
  원인 분석은 `CHANGELOG_ARCHIVE.md` 2026-08-27 항목 참고.
- `TiledMapTestScene.js` → `MainScene.js` 병합됐는지 / git 저장소 초기화 여부 / `Backend/village.db` 재시드
  여부(좌표 변경 있었다면) / 각 README "알려진 미구현" 섹션이 그 사이 갱신됐는지.

## 다음 세션에서 먼저 할 일 (제안)

1. 실제 최종 맵으로 건물 확장 — 새 건물 그룹은 이름을 고유하게 + 자식에 `Floors` 타일 레이어(실내 영역)
   + `Roofs`/`Walls`/`Doors` 이름 레이어만 넣으면 코드 변경 없이 페이드/어둠 적용됨.
2. 실제 Tiled 맵 좌표를 확정하고 `mapData.js` + `world_layout.py` 동시 갱신.
3. `MainScene`을 Tiled 맵 로딩 방식으로 전환 (BootScene의 procedural map 생성 로직 대체,
   `TiledMapTestScene`의 로직 재사용).

---

## 변경 이력 (Changelog)

> 전체 변경 이력은 `CHANGELOG_ARCHIVE.md`(원문 그대로, 삭제/요약 없음 — 날짜/키워드로 Grep). 여기엔
> 최근 몇 개 요약 + 기록 절차만 둔다.

### 최근 변경 (최신 5개만 — 전체 48개 항목은 `CHANGELOG_ARCHIVE.md` "변경 이력" 섹션 참고)
- 2026-08-31 — 순수 `WInteriors`(방 뒤 far 벽 안쪽 면)를 `STRUCTURE_ALWAYS_ON_TOP_DEPTH` 대상에서 제외
  (정규식 `/^winteriors?\d*$/`→`\d+$`). 이제 맵 레이어 순서대로 Rugs/Interiors 밑에 그려짐. `WInteriors2`
  (좌/우/아래 벽)는 그대로 캐릭터 위. 사용자 피드백: "WInteriors가 Interiors보다 위에 있다"
- 2026-08-31 — 어둠 오버레이 구멍(마스크)을 `Floors`만 → **`Floors` + 페이드 안 되는 나머지 레이어
  (`WInteriors`/`WInteriors2`/`Interiors`/`Rugs`) 합집합**으로 확대. `Floors`만 쓰니 방 바깥쪽 줄의
  "안에서 본 벽(WInteriors)"이 어둠에 잘려 보인다는 사용자 피드백. `_buildGroupFadeLayerMap` 한 곳 수정
- 2026-08-31 — **실내/실외 판정을 `Floors` 타일 레이어 하나로 전면 단순화**(사용자 요청). 각 건물 그룹
  (House1~6, Cave)에 사용자가 만든 `Floors` 레이어의 채워진 칸에 플레이어가 들어오면 실내 판정 →
  Roofs/Walls/Doors 투명 + 어둠. 그날 앞서 만들었던 "지붕/벽 교집합 + 처마 bbox 클리핑 + 문 동적
  판정(`doorwayRect`)" 및 구 `_addDoorInteriorTriggerZones` — **전부 삭제**. 문 열기/닫기 애니메이션·충돌은
  그대로. 헤드리스로 트리거 토글 확인, 페이드 시각은 실플레이 검증 대기
- 2026-08-31 — untitled.tmx 대규모 재re-export: 타일셋 43→63개(신규 20개 매니페스트 추가 +
  `public/tilesets/` 63개 전체 재동기화), 레이어를 `House1`~`House6`/`Roads`/`Graveyard`/`Plaza` 등
  그룹으로 재편, House/Cave 그룹에 `Roofs`·`Floors` 타일 레이어 추가, 문 타일을 96×64 블록(가운데 열만
  애니메이션)으로 변경, `Roads` 발전 단계 기획 문서화
- 2026-08-27 — untitled.tmx 재re-export: `House2` 그룹 신설(코드 변경 없이 벽 페이드/문/어둠 오버레이
  자동, "집 여러 개" 케이스 처음) + House1/Cave `Darkness` 레이어 삭제로 어둠 migration 완료. 43 타일셋 불변

### 새 변경사항을 기록하는 방법 (모든 Claude Code 세션 필독)
코드/맵을 실질적으로 바꿀 때마다:

1. **`CHANGELOG_ARCHIVE.md` "변경 이력" 섹션 맨 위**에 새 항목 추가(역순 정렬). 형식:
   `- **YYYY-MM-DD (짧은 제목)**: 무엇을+왜(사용자 요청/버그)+관련 파일+검증 방법`.
2. 같은 파일 **"목차 (날짜/주제 색인)" 맨 위에도 한 줄** 추가(`YYYY-MM-DD — 한 줄 주제`).
3. **이 파일(`PROJECT_STATUS.md`)의 관련 섹션**(핵심 구조 요약/구현 스펙 원문/확인 필요/다음 할 일)도
   갱신하되 **결론 1~3줄만** — 상세 진단은 1번 아카이브에만(두 파일 중복 금지).
4. **아래 "최근 변경" 목록**에 맨 위 추가, 5개 초과 시 가장 오래된 것 제거(전문은 아카이브에 있으므로 안전).
5. 과거 버그(버그 1~6 등)와 관련되면 "버그 요약" 섹션이나 아카이브 "상세 버그 진단 기록"에도 이어서 기록.

### 📏 토큰 예산 관리
`PROJECT_STATUS.md`는 **단일 `Read`(약 25,000토큰 ≈ 이 밀도로 470~480줄) 안에 유지**가 목표.
`Read`가 "Truncated: PARTIAL view"를 내면 이미 초과 → 그 세션에서 바로 트리밍.
- **우선순위**: ① "확인 필요"의 해결/확인된 항목(→ 삭제 또는 한 줄), ② 여러 문단짜리 인라인 진단
  서술(→ 1~3줄 결론 + 아카이브 링크), ③ "구현 스펙 원문"에 이미 흡수된 중복 설명. **"게임 기획 개요"는
  트리밍 대상 아님**(지금도 유효한 설계 스펙).
- **방법**: 잘라낼 문단을 `CHANGELOG_ARCHIVE.md`(날짜 → "변경 이력", 재사용 버그 진단 → "상세 버그 진단
  기록")에 **원문 그대로 먼저 옮기고** 목차에도 한 줄 추가 → 이 파일엔 1~3줄 요약만. **요약하며 그냥
  버리지 말 것.**
- `CHANGELOG_ARCHIVE.md`는 반대로 25,000토큰 넘어도 됨(append-only, 목차+Grep로 부분 접근).

전체 히스토리: **[`CHANGELOG_ARCHIVE.md`](CHANGELOG_ARCHIVE.md)**
