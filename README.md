# Village Simulation

React + Phaser 3 프론트엔드와 FastAPI + LLM 백엔드로 만드는 2D 마을 시뮬레이션 게임.
"생성형 에이전트"(기억 스트림 → 성찰 → 계획/반응) 방식으로 NPC들이 자율적으로 살아가고,
플레이어는 대화 / 은신 / 전투 / 채집 / 상점 / 도박 등으로 마을에 개입한다.

> ⚠️ **개발 중** — 아직 미완성 프로젝트입니다.

## 저장소 구조 (모노레포)

| 경로 | 내용 |
| --- | --- |
| [`Frontend/`](Frontend/README.md) | React 19 + Phaser 3.90 + Vite 클라이언트 |
| [`Backend/`](Backend/README.md) | FastAPI + SQLAlchemy + ChromaDB + LLM 서버 |
| [`PROJECT_STATUS.md`](PROJECT_STATUS.md) | 현재 상태 스냅샷 (매 작업 세션 시작 시 참고) |
| [`CHANGELOG_ARCHIVE.md`](CHANGELOG_ARCHIVE.md) | 전체 변경 이력 (append-only) |
| `untitled.tmx` | Tiled 맵 에디터 소스 파일 |

## 빠른 실행

```bash
# 1) Backend (먼저 실행 — http://127.0.0.1:8000)
cd Backend
python -m venv venv && source venv/Scripts/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000

# 2) Frontend (http://localhost:5173)
cd Frontend
npm install
cp .env.example .env
npm run dev
```

자세한 내용은 각 폴더의 `README.md`를 참고.

## 저장소에 포함되지 않는 것 (`.gitignore`)

- **아트 에셋** (`Tilesets/`, `Frontend/public/tilesets/`) — 서드파티 무료 에셋팩(Craftpix, itch.io 등)
  으로 재배포가 제한되어 저장소에 넣지 않는다. 로컬에서 각 팩을 받아 해당 경로에 배치해야 맵이 렌더된다.
- **파생 맵** (`Frontend/public/maps/village.json`) — `untitled.tmx`에서 Tiled로 export하는 파생 파일:
  `"C:\Program Files\Tiled\tiled.exe" --export-map json untitled.tmx Frontend/public/maps/village.json`
- **런타임 데이터** — `Backend/village.db`, `Backend/chroma_data/` (첫 기동 시 자동 생성/시드)
- **비밀값** — `.env` (각 폴더의 `.env.example` 복사해서 사용)
