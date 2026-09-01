# Village Simulation

This project is a 2D web game that simulates a small village.
Every NPC is LLM-driven, each with its own personality, daily routine, and stats.
NPCs remember what the player does and react based on those memories.

> ⚠️ **WIP** — not yet playable end-to-end.

## Goal

My goal for this project is to implement a village that is fully run by generative agents while still leaving room for the player to intervene.
The player can choose to help the village or harm it.
Their actions ripple outward, shifting individual NPCs' attitudes and eventually the mood of the whole village.

## Features (planned / in progress)

- **Free-text conversations** with NPCs — TRPG-style: type anything, the NPC reacts in character
- **Generative-agent loop** — memory stream → nightly reflection → LLM-planned daily routines
- **Rumor propagation** — events spread NPC-to-NPC, with personality-driven distortion
- **Stealth & eavesdropping** — hide in bushes, stay out of NPC line-of-sight, listen in
- **Combat, gathering, shops, gambling**
- **Time system** — day/night cycle with time-skip and a forced pass-out in the small hours
- **World events** — fire, wedding, funeral, and more, temporarily overriding NPC routines

## Architecture

- **Frontend** (React + Phaser 3) renders the map, player, NPCs, and UI, and talks to the backend over REST.
- **Backend** (FastAPI) holds the simulation:
  - **Relational DB** (SQLAlchemy — SQLite by default, MySQL via `DATABASE_URL`) for stats, inventory, relationships, and rumor IDs.
  - **Vector DB** (ChromaDB) for episodic NPC memories and reflections, scored by *recency × importance × relevance*.
  - **LLM** — an OpenAI-compatible client, split into a "game master" brain (reflection / routine / eavesdrop) and an NPC-dialogue brain. With no API key it falls back to deterministic stubs, so the whole stack runs without cost.

## Tech stack

| Layer | Stack |
| --- | --- |
| Frontend | React 19, Phaser 3.90 (arcade physics), phaser-raycaster, easystar.js (A*), Vite |
| Backend | FastAPI, Pydantic v2, SQLAlchemy 2, ChromaDB, OpenAI-compatible LLM API |
| Tooling | Tiled (map editor), oxlint |

## Credits

This project is inspired by the research paper [*Generative Agents: Interactive Simulacra of Human Behavior*](https://arxiv.org/abs/2304.03442) (Park et al., 2023).
This project was mostly built through vibe coding with Claude.
The game uses free third-party art assets:
{To be added}

## Repository structure

| Directory | Description |
| --- | --- |
| [`Frontend/`](Frontend/README.md) | React 19 + Phaser 3.90 + Vite client |
| [`Backend/`](Backend/README.md) | FastAPI + SQLAlchemy + ChromaDB + LLM server |

## Development setup

Each side runs independently. See [`Frontend/README.md`](Frontend/README.md) and [`Backend/README.md`](Backend/README.md) for the full instructions; the short version:

```bash
# Backend — http://127.0.0.1:8000
cd Backend
python -m venv venv
./venv/Scripts/activate            # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000

# Frontend — http://localhost:5173
cd Frontend
npm install
cp .env.example .env
npm run dev
```

The map will not render without the art assets and `village.json` (see below).

## Not included in this repository

- **Game Assets** (`Tilesets/`, `Frontend/public/tilesets/`) — third-party asset packs that can't be redistributed, so the map won't render from a fresh clone; supply your own tilesets.
- **Map** — the Tiled source (`untitled.tmx`) and its JSON export (`Frontend/public/maps/village.json`) are not published for now.
- **Runtime Data** (`Backend/village.db`, `Backend/chroma_data/`) — auto-created and seeded on first launch.
- **Secrets** (`.env`) — copy the `.env.example` in each folder to `.env` and fill it in.

## License

Not decided yet — until a `LICENSE` file is added, all rights are reserved by the author.
Third-party assets (not included in this repository) remain under their original licenses.
