import Phaser from "phaser";

import api from "../../api/client";
import Player from "../entities/Player";
import NPC from "../entities/NPC";
import eventBus, { GAME_EVENTS } from "../eventBus";
import {
  buildingDoorTile,
  buildTileGrid,
  FACILITIES,
  HOME_TILES,
  MAP_COLS,
  MAP_ROWS,
  TILE,
  TILE_SIZE,
  tileToPixel,
} from "../map/mapData";
import InteractionSystem from "../systems/InteractionSystem";
import Pathfinder from "../systems/Pathfinder";
import StealthSystem from "../systems/StealthSystem";
import TimeSystem from "../systems/TimeSystem";

const EMOTION_EMOJI = { HAPPY: "😊", SURPRISED: "😲", ANGRY: "😠", SAD: "😢", NEUTRAL: "" };
const USER_ID = 1;
const RESYNC_INTERVAL_MS = 8000;
const EAVESDROP_PAIR_DISTANCE = 70;
const EAVESDROP_PLAYER_DISTANCE = 100;
const FACILITY_INTERACT_DISTANCE = 56;
const STATS_TICK_INTERVAL_MS = 10000; // 이 주기마다 흐른 게임 분(分)만큼 허기/피로도를 서버에 반영
const NPC_ENCOUNTER_DISTANCE = 36;
const NPC_ENCOUNTER_COOLDOWN_MS = 60_000; // 같은 NPC 쌍이 너무 자주 마주침 이벤트를 발생시키지 않도록
const ATTACK_RANGE = 56;
const GATHER_WITNESS_RADIUS = 220; // 채집 현장을 "목격"했다고 볼 수 있는 반경 (숲/광산은 야외라 LOS 대신 단순 거리로 판정)

export default class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
    this.ready = false;
    this.isChatOpen = false;
    this.isInventoryOpen = false;
    this.npcs = [];
    this.eavesdropCandidate = null;
    this.gameConfig = null;
    this.encounterCooldowns = new Map(); // "npcIdA-npcIdB" -> 마지막 발생 시각(ms)
    this.reputationTier = "peace"; // 'peace' | 'warning' | 'danger'
  }

  create() {
    this._buildMap();
    this._buildFacilityLabels();
    this._buildHomeLabels();

    this.keys = this.input.keyboard.addKeys("W,S,A,D,E,H,K,I");
    this.interactionSystem = new InteractionSystem(this);
    this.stealthSystem = new StealthSystem(this, this.wallLayer);
    this.timeSystem = new TimeSystem({ minutesPerRealSecond: 10, passoutHour: 2 });

    this.eavesdropPromptText = this.add
      .text(0, 0, "[E] 👂 엿듣기", {
        fontSize: "12px",
        color: "#9be89b",
        backgroundColor: "#00000099",
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(51)
      .setVisible(false);

    this.facilityPromptText = this.add
      .text(0, 0, "", {
        fontSize: "12px",
        color: "#7ec8ff",
        backgroundColor: "#00000099",
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(51)
      .setVisible(false);
    this.nearbyFacilityKey = null;

    this.speechBubbles = new Map(); // npcId -> Phaser.Text

    this.input.keyboard.on("keydown-E", () => this._handleInteractKey());
    this.input.keyboard.on("keydown-H", () => this._handleTimeSkip());
    this.input.keyboard.on("keydown-K", () => this._handleAttackKey());
    this.input.keyboard.on("keydown-I", () => this._handleInventoryKey());
    eventBus.on(GAME_EVENTS.CLOSE_CHAT, () => {
      this.isChatOpen = false;
      this.isInventoryOpen = false;
    });
    eventBus.on(GAME_EVENTS.NPC_SPOKE, ({ npcId, dialog, emotion }) => this._showSpeechBubble(npcId, dialog, emotion));
    eventBus.on(GAME_EVENTS.REQUEST_SLEEP, () => this._handleSleep());
    eventBus.on(GAME_EVENTS.REQUEST_TIME_SKIP, () => this._handleTimeSkip());
    eventBus.on(GAME_EVENTS.STATS_UPDATE, (user) => {
      if (user.fatigue <= 0 && this.ready && !this.isChatOpen) this._handlePassout();
    });

    this.time.addEvent({ delay: RESYNC_INTERVAL_MS, loop: true, callback: this._resyncWorldState, callbackScope: this });
    this.time.addEvent({ delay: STATS_TICK_INTERVAL_MS, loop: true, callback: this._tickPassiveStats, callbackScope: this });

    this._loadWorldData();
  }

  _buildMap() {
    const grid = buildTileGrid();
    const map = this.make.tilemap({ data: grid, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
    const tileset = map.addTilesetImage("tileset", "tileset", TILE_SIZE, TILE_SIZE, 0, 0);
    const layer = map.createLayer(0, tileset, 0, 0);
    layer.setCollision([TILE.WALL]);

    this.map = map;
    this.wallLayer = layer;
    this.pathfinder = new Pathfinder(grid);

    const worldW = MAP_COLS * TILE_SIZE;
    const worldH = MAP_ROWS * TILE_SIZE;
    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setBounds(0, 0, worldW, worldH);
  }

  _buildFacilityLabels() {
    Object.entries(FACILITIES).forEach(([key, { col, row, label, isBuilding }]) => {
      let anchor;
      let labelPos;

      if (isBuilding) {
        // 상호작용 판정 지점 = 문(door) 타일. 라벨은 건물 상단 중앙에 표시한다.
        const door = buildingDoorTile(key);
        anchor = tileToPixel(door.col, door.row);
        const topCenter = tileToPixel(col + 1, row);
        labelPos = { x: topCenter.x, y: topCenter.y - 20 };
      } else {
        anchor = tileToPixel(col, row);
        labelPos = { x: anchor.x, y: anchor.y - 20 };
      }

      this.add
        .text(labelPos.x, labelPos.y, label, {
          fontSize: "11px",
          color: "#ffffff",
          backgroundColor: "#00000099",
          padding: { x: 3, y: 1 },
        })
        .setOrigin(0.5)
        .setDepth(30)
        .setData("facilityKey", key)
        .setData("facilityX", anchor.x)
        .setData("facilityY", anchor.y);
    });
  }

  /** 순수 장식용 라벨 - 상호작용 데이터가 없어 시설 상호작용 판정에는 잡히지 않는다. */
  _buildHomeLabels() {
    Object.entries(HOME_TILES).forEach(([npcName, { col, row }]) => {
      const { x, y } = tileToPixel(col, row);
      this.add
        .text(x, y - 18, `${npcName}의 집`, {
          fontSize: "9px",
          color: "#cccccc",
          backgroundColor: "#00000077",
          padding: { x: 2, y: 1 },
        })
        .setOrigin(0.5)
        .setDepth(20);
    });
  }

  async _loadWorldData() {
    try {
      const config = await api.getConfig();
      this.gameConfig = config;
      this.timeSystem.minutesPerRealSecond = config.minutes_per_real_second;

      const world = await api.getWorldState();
      this.timeSystem.setDatetime(world.game_datetime);
      this.lastTickGameTime = this.timeSystem.gameDatetime;
      eventBus.emit(GAME_EVENTS.WORLD_INFO, { season: world.season, weather: world.weather });

      const user = await api.getUser(USER_ID);
      this.player = new Player(this, user.pos_x, user.pos_y);
      this.physics.add.collider(this.player, this.wallLayer);
      this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
      this._applyReputationTier(user.reputation);

      const npcDataList = await api.listNpcs();
      for (const data of npcDataList) {
        const sprite = new NPC(this, data);
        this.physics.add.collider(sprite, this.wallLayer);
        this.physics.add.collider(sprite, this.player);
        if (data.is_dead) sprite.markDead();
        this.npcs.push(sprite);

        try {
          const routine = await api.getNpcRoutine(data.id);
          sprite.setRoutine(routine.entries);
        } catch {
          // 루틴 조회 실패는 치명적이지 않음 - NPC는 그 자리에 IDLE 상태로 남는다.
        }
      }

      this.ready = true;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("월드 데이터 로딩 실패. 백엔드가 http://127.0.0.1:8000 에서 실행 중인지 확인하세요.", err);
    }
  }

  async _resyncWorldState() {
    if (!this.ready) return;
    try {
      const world = await api.getWorldState();
      // 백엔드 시간은 명시적 액션(취침/채집/시간 건너뛰기) 때만 앞으로 튀고, 그 사이에는 멈춰 있다.
      // 로컬 시계는 매 프레임 계속 흘러가므로, 여기서 무조건 덮어쓰면 "앞서 나간 로컬 시간"이
      // "멈춰 있던 백엔드 시간"으로 자꾸 되감기는 버그가 생긴다. 백엔드가 더 미래일 때만(=채집 등으로
      // 실제로 시간이 점프했을 때만) 반영한다.
      const backendTime = new Date(world.game_datetime);
      if (backendTime.getTime() > this.timeSystem.gameDatetime.getTime()) {
        this.timeSystem.setDatetime(world.game_datetime);
        this.lastTickGameTime = this.timeSystem.gameDatetime;
      }
      eventBus.emit(GAME_EVENTS.WORLD_INFO, { season: world.season, weather: world.weather });

      const user = await api.getUser(USER_ID);
      this._applyReputationTier(user.reputation);

      // 질병/사망 상태는 밤사이(또는 전투로) 바뀔 수 있으므로 주기적으로 동기화한다.
      const npcDataList = await api.listNpcs();
      for (const data of npcDataList) {
        const sprite = this.npcs.find((n) => n.npcId === data.id);
        if (!sprite) continue;
        sprite.setIllness(data.illness);
        if (data.is_dead && !sprite.isDead) sprite.markDead();
      }
    } catch {
      // 백엔드가 잠깐 응답하지 않아도 로컬 시계로 계속 진행한다.
    }
  }

  _applyReputationTier(reputation) {
    if (!this.gameConfig) return;
    const { reputation_danger_threshold: danger, reputation_warning_threshold: warning } = this.gameConfig;
    const tier = reputation <= danger ? "danger" : reputation <= warning ? "warning" : "peace";
    this.reputationTier = tier;
    const wary = tier !== "peace";
    for (const npc of this.npcs) npc.setWary(wary);
  }

  _handleInteractKey() {
    if (!this.ready || this.isChatOpen) return;

    if (this.eavesdropCandidate) {
      const [a, b] = this.eavesdropCandidate;
      this.isChatOpen = true;
      this.player.setVelocity(0, 0);
      eventBus.emit(GAME_EVENTS.OPEN_EAVESDROP, {
        npcAId: a.npcId,
        npcBId: b.npcId,
        npcAName: a.npcName,
        npcBName: b.npcName,
      });
      return;
    }

    const target = this.interactionSystem.currentTarget;
    if (target) {
      this.isChatOpen = true;
      this.player.setVelocity(0, 0);
      // 이 순간 유저를 볼 수 있었던 다른 NPC들 - 대화 중 언어폭력이 감지되면 목격자 기반 평판 판정에 쓰인다.
      const witnesses = this.npcs
        .filter((n) => !n.isDead && n.npcId !== target.npcId)
        .filter((n) => this.stealthSystem.npcCanSee(n, this.player))
        .map((n) => n.npcId);
      eventBus.emit(GAME_EVENTS.OPEN_CHAT, { npcId: target.npcId, npcName: target.npcName, witnessNpcIds: witnesses });
      return;
    }

    if (this.nearbyFacilityKey) {
      this.isChatOpen = true;
      this.player.setVelocity(0, 0);
      // 채집처럼 시간이 걸리는 행동을 하는 동안 근처에 있던 NPC들 - 나중에 그 현장을 목격했다는
      // 기억을 심어주는 데 쓰인다 (환경 상태 변화가 주변 NPC에게 전파되는 것과 같은 개념).
      const nearbyNpcIds = this.npcs
        .filter((n) => !n.isDead)
        .filter((n) => Phaser.Math.Distance.Between(n.x, n.y, this.player.x, this.player.y) <= GATHER_WITNESS_RADIUS)
        .map((n) => n.npcId);
      eventBus.emit(GAME_EVENTS.OPEN_FACILITY, { facilityKey: this.nearbyFacilityKey, nearbyNpcIds });
    }
  }

  _handleInventoryKey() {
    if (!this.ready) return;
    if (this.isInventoryOpen) {
      eventBus.emit(GAME_EVENTS.CLOSE_CHAT);
      this.isInventoryOpen = false;
      this.isChatOpen = false;
      return;
    }
    if (this.isChatOpen) return; // 다른 모달(대화/시설 등)이 열려 있으면 무시
    this.isInventoryOpen = true;
    this.isChatOpen = true;
    this.player.setVelocity(0, 0);
    eventBus.emit(GAME_EVENTS.OPEN_INVENTORY);
  }

  async _handleTimeSkip() {
    if (!this.ready) return;
    try {
      const world = await api.advanceTime(60);
      this.timeSystem.setDatetime(world.game_datetime);
    } catch {
      // 실패해도 조용히 무시 (다음 리싱크 때 다시 맞춰짐)
    }
  }

  _findTargetNpcInRange() {
    if (!this.player) return null;
    let best = null;
    let bestDist = Infinity;
    for (const npc of this.npcs) {
      if (npc.isDead) continue;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y);
      if (dist <= ATTACK_RANGE && dist < bestDist) {
        best = npc;
        bestDist = dist;
      }
    }
    return best;
  }

  async _handleAttackKey() {
    if (!this.ready || this.isChatOpen) return;
    const target = this.interactionSystem.currentTarget || this._findTargetNpcInRange();
    if (!target) return;

    // 이 순간 유저를 볼 수 있었던 다른 NPC들을 목격자로 판정한다 (StealthSystem의 시야각+LOS 재사용).
    const witnesses = this.npcs
      .filter((n) => !n.isDead && n.npcId !== target.npcId)
      .filter((n) => this.stealthSystem.npcCanSee(n, this.player))
      .map((n) => n.npcId);

    try {
      const result = await api.attackNpc(target.npcId, USER_ID, witnesses);
      this._showSpeechBubble(target.npcId, result.message, result.npc_is_dead ? "SAD" : "ANGRY");
      if (result.npc_is_dead) target.markDead();
      this._applyReputationTier(result.reputation);
      eventBus.emit(GAME_EVENTS.STATS_REFRESH_REQUEST);
    } catch {
      // 실패 시 조용히 무시
    }
  }

  _showSpeechBubble(npcId, dialog, emotion) {
    const npc = this.npcs.find((n) => n.npcId === npcId);
    if (!npc) return;

    const existing = this.speechBubbles.get(npcId);
    if (existing) existing.destroy();

    const emoji = EMOTION_EMOJI[emotion] ?? "";
    const text = this.add
      .text(npc.x, npc.y - 40, `${emoji} ${dialog}`.trim(), {
        fontSize: "12px",
        color: "#111111",
        backgroundColor: "#ffffffee",
        padding: { x: 6, y: 4 },
        wordWrap: { width: 200 },
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(60);

    this.speechBubbles.set(npcId, text);
    this.time.delayedCall(4500, () => {
      text.destroy();
      if (this.speechBubbles.get(npcId) === text) this.speechBubbles.delete(npcId);
    });
  }

  async _handleSleep() {
    if (!this.ready) return;
    eventBus.emit(GAME_EVENTS.WORLD_LOADING, { active: true, message: "마을 사람들이 밤사이 이야기를 나누는 중..." });
    this.timeSystem.pause();
    this.isChatOpen = true; // 취침 중 이동 잠금
    try {
      await api.sleep(USER_ID);
      await this._refreshAfterNightlyCycle();
    } finally {
      this.isChatOpen = false;
      this.timeSystem.resume();
      eventBus.emit(GAME_EVENTS.WORLD_LOADING, { active: false });
      eventBus.emit(GAME_EVENTS.STATS_REFRESH_REQUEST);
    }
  }

  async _handlePassout() {
    eventBus.emit(GAME_EVENTS.WORLD_LOADING, { active: true, message: "유저가 새벽에 쓰러졌습니다... (기절)" });
    this.timeSystem.pause();
    this.isChatOpen = true;
    try {
      await api.passout(USER_ID);
      await this._refreshAfterNightlyCycle();
    } finally {
      this.isChatOpen = false;
      this.timeSystem.resume();
      eventBus.emit(GAME_EVENTS.WORLD_LOADING, { active: false });
      eventBus.emit(GAME_EVENTS.STATS_REFRESH_REQUEST);
    }
  }

  /** 흐른 게임 시간만큼 허기/피로도를 서버에 반영한다 (100 -> 0으로 자연 감소). */
  async _tickPassiveStats() {
    if (!this.ready || !this.lastTickGameTime) return;
    const nowGame = this.timeSystem.gameDatetime;
    const elapsedMinutes = (nowGame.getTime() - this.lastTickGameTime.getTime()) / 60000;
    if (elapsedMinutes <= 0) {
      this.lastTickGameTime = nowGame;
      return;
    }
    this.lastTickGameTime = nowGame;
    try {
      const user = await api.tickUser(USER_ID, elapsedMinutes);
      eventBus.emit(GAME_EVENTS.STATS_UPDATE, user);
    } catch {
      // 실패해도 다음 틱에서 다시 시도된다.
    }
  }

  async _refreshAfterNightlyCycle() {
    const world = await api.getWorldState();
    this.timeSystem.setDatetime(world.game_datetime);
    this.lastTickGameTime = this.timeSystem.gameDatetime; // 취침/기절로 초기화된 스탯을 틱이 덮어쓰지 않도록

    const npcDataList = await api.listNpcs();
    for (const data of npcDataList) {
      const sprite = this.npcs.find((n) => n.npcId === data.id);
      if (!sprite) continue;
      sprite.setIllness(data.illness);
      if (data.is_dead && !sprite.isDead) sprite.markDead();

      try {
        const routine = await api.getNpcRoutine(data.id);
        sprite.setRoutine(routine.entries);
      } catch {
        // 무시: 개별 NPC 루틴 갱신 실패해도 전체 흐름은 계속된다.
      }
    }
  }

  _updateEavesdropCandidate() {
    this.eavesdropCandidate = null;
    if (!this.player.isHidden) return;

    const nearby = this.npcs.filter(
      (n) => !n.isDead && Phaser.Math.Distance.Between(this.player.x, this.player.y, n.x, n.y) < EAVESDROP_PLAYER_DISTANCE
    );
    for (let i = 0; i < nearby.length; i++) {
      for (let j = i + 1; j < nearby.length; j++) {
        if (Phaser.Math.Distance.Between(nearby[i].x, nearby[i].y, nearby[j].x, nearby[j].y) < EAVESDROP_PAIR_DISTANCE) {
          this.eavesdropCandidate = [nearby[i], nearby[j]];
          return;
        }
      }
    }
  }

  _updateNearbyFacility() {
    if (!this.player) return;
    let found = null;
    this.children.list.forEach((child) => {
      const key = child.getData?.("facilityKey");
      if (!key) return;
      const fx = child.getData("facilityX");
      const fy = child.getData("facilityY");
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, fx, fy);
      if (dist < FACILITY_INTERACT_DISTANCE) found = key;
    });
    this.nearbyFacilityKey = found;

    // NPC가 상호작용 우선순위를 갖는다 (기존 InteractionSystem 타겟이 있으면 시설 프롬프트는 숨김).
    if (found && !this.interactionSystem.currentTarget && !this.eavesdropCandidate) {
      this.facilityPromptText
        .setText(`[E] ${FACILITIES[found]?.label ?? "둘러보기"}`)
        .setPosition(this.player.x, this.player.y - 34)
        .setVisible(true);
    } else {
      this.facilityPromptText.setVisible(false);
    }
  }

  /** NPC끼리 우연히 스쳐 지나갈 때, 비용 최적화를 위해 대부분은 이모지만 띄우고
   * 가끔(설정된 확률)만 실제 GM 대사를 생성한다. */
  _updateNpcEncounters() {
    if (!this.gameConfig) return;
    const now = Date.now();

    for (let i = 0; i < this.npcs.length; i++) {
      const a = this.npcs[i];
      if (a.isDead) continue;
      for (let j = i + 1; j < this.npcs.length; j++) {
        const b = this.npcs[j];
        if (b.isDead) continue;
        if (Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y) > NPC_ENCOUNTER_DISTANCE) continue;

        const key = `${Math.min(a.npcId, b.npcId)}-${Math.max(a.npcId, b.npcId)}`;
        const lastTime = this.encounterCooldowns.get(key) ?? 0;
        if (now - lastTime < NPC_ENCOUNTER_COOLDOWN_MS) continue;
        this.encounterCooldowns.set(key, now);

        this._triggerNpcEncounter(a, b);
      }
    }
  }

  /** 관계성에 따라 백엔드가 "멈춰서 대화" vs "그냥 지나침"을 판정한다. 그냥 지나치기로 하면
   * stopped=false만 오고 그 외엔 아무 일도 일어나지 않는다 (친밀도 변화도, 대사도 없음).
   * 멈추기로 하면 두 NPC 모두 실제로 걸음을 멈춰야 하므로 pauseFor()로 이동을 잠근다. */
  async _triggerNpcEncounter(a, b) {
    try {
      const result = await api.npcEncounterResolve(a.npcId, b.npcId);
      if (!result.stopped) return;

      a.pauseFor(result.pause_ms);
      b.pauseFor(result.pause_ms);

      if (!result.lines.length) {
        this._showEmojiBubble(a, "💬");
        this._showEmojiBubble(b, "💬");
        return;
      }
      result.lines.forEach((line, index) => {
        const speakerNpc = line.speaker === a.npcName ? a : line.speaker === b.npcName ? b : index % 2 === 0 ? a : b;
        this.time.delayedCall(index * 1200, () => this._showSpeechBubble(speakerNpc.npcId, line.text, "NEUTRAL"));
      });
    } catch {
      // 실패해도 게임 흐름에 영향 없음 (조용히 무시)
    }
  }

  _showEmojiBubble(npc, emoji) {
    const existing = this.speechBubbles.get(npc.npcId);
    if (existing) existing.destroy();
    const text = this.add
      .text(npc.x, npc.y - 40, emoji, { fontSize: "16px" })
      .setOrigin(0.5)
      .setDepth(60);
    this.speechBubbles.set(npc.npcId, text);
    this.time.delayedCall(2000, () => {
      text.destroy();
      if (this.speechBubbles.get(npc.npcId) === text) this.speechBubbles.delete(npc.npcId);
    });
  }

  update(_time, delta) {
    if (!this.ready) return;

    this.pathfinder.update(); // easystarjs 큐에 쌓인 경로 계산 요청을 처리한다.

    if (!this.isChatOpen) {
      this.player.handleMovement({
        left: this.keys.A.isDown,
        right: this.keys.D.isDown,
        up: this.keys.W.isDown,
        down: this.keys.S.isDown,
      });
    } else {
      this.player.setVelocity(0, 0);
    }

    const hour = this.timeSystem.gameDatetime.getHours();
    const minute = this.timeSystem.gameDatetime.getMinutes();
    for (const npc of this.npcs) {
      npc.updateMovementTowardRoutine(hour, minute);
      npc.updateLabel();
      const bubble = this.speechBubbles.get(npc.npcId);
      if (bubble) bubble.setPosition(npc.x, npc.y - 40);
    }

    const shouldPassout = this.timeSystem.update(delta);
    if (shouldPassout) this._handlePassout();

    this._updateNpcEncounters();

    if (!this.isChatOpen) {
      this.interactionSystem.update(this.player, this.npcs);
      const stealth = this.stealthSystem.evaluate(this.player, this.npcs);
      this.player.isHidden = stealth.hidden;
      this._updateEavesdropCandidate();
      this._updateNearbyFacility();

      if (this.eavesdropCandidate) {
        this.eavesdropPromptText.setPosition(this.player.x, this.player.y - 34).setVisible(true);
        this.interactionSystem.promptText.setVisible(false);
        this.facilityPromptText.setVisible(false);
      } else {
        this.eavesdropPromptText.setVisible(false);
      }
    } else {
      this.interactionSystem.highlight.clear();
      this.interactionSystem.promptText.setVisible(false);
      this.eavesdropPromptText.setVisible(false);
      this.facilityPromptText.setVisible(false);
    }
  }
}
