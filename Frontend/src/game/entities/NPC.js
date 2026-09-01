import Phaser from "phaser";

const JOB_COLORS = {
  촌장: 0xd4af37,
  상인: 0x8e6c3a,
  대장장이: 0x707070,
  의사: 0xf5f5f5,
  경찰: 0x2255cc,
  "술집 주인": 0xaa3333,
};
const DEFAULT_COLOR = 0xcccccc;

const MOVE_SPEED = 60;
const ARRIVE_THRESHOLD = 6;

/**
 * NPC 스프라이트. 실제 애니메이션 프레임 대신 트위닝(Tweening)/색상으로 상태를 표현하는
 * placeholder 구현이며, 백엔드가 매일 밤 새로 생성하는 루틴(entries)을 따라 이동한다.
 */
export default class NPC extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, data) {
    super(scene, data.pos_x, data.pos_y, "npc-tex");
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setImmovable(false);
    this.npcId = data.id;
    this.npcName = data.name;
    this.job = data.job;
    this.isDead = data.is_dead;
    this.facingAngle = Math.PI / 2;
    this.setTint(JOB_COLORS[data.job] ?? DEFAULT_COLOR);

    this.nameLabel = scene.add
      .text(this.x, this.y - 22, `${data.name}`, {
        fontSize: "11px",
        color: "#ffffff",
        backgroundColor: "#00000088",
        padding: { x: 3, y: 1 },
      })
      .setOrigin(0.5)
      .setDepth(50);

    // 질병(🤒)/평판에 따른 경계(⚔) 상태를 이름표 옆에 작은 아이콘으로 표시한다.
    this.statusIcon = scene.add
      .text(this.x, this.y - 22, "", { fontSize: "13px" })
      .setOrigin(0.5)
      .setDepth(50);

    this.illness = data.illness || "";
    this.isWary = false;

    this.routineEntries = [];
    this.pathQueue = []; // Pathfinder가 계산해 준 웨이포인트(픽셀 좌표) 목록
    this.lastRoutineTargetKey = null;
    this.pauseUntil = 0; // Date.now() 기준 - 마주침 대화 중에는 이 시각까지 실제로 이동을 멈춘다

    this._refreshStatusIcon();
  }

  /** 다른 NPC와 마주쳐 멈춰서 대화하는 동안, 실제로 걸음을 멈추게 한다 (말풍선만 띄우고 계속
   * 걸어가 버리는 것을 방지). durationMs 동안 updateMovementTowardRoutine이 이동을 건너뛴다. */
  pauseFor(durationMs) {
    this.pauseUntil = Math.max(this.pauseUntil, Date.now() + durationMs);
  }

  setRoutine(entries) {
    this.routineEntries = entries ?? [];
    this.lastRoutineTargetKey = null; // 새 루틴이 오면 경로도 다시 계산되도록 초기화
  }

  setPath(waypoints) {
    this.pathQueue = waypoints ?? [];
  }

  markDead() {
    this.isDead = true;
    this.setVelocity(0, 0);
    this.setTint(0x333333);
    this.setAlpha(0.5);
    this.nameLabel.setText(`${this.npcName} (묘비)`);
    this.statusIcon.setText("");
  }

  setIllness(illness) {
    this.illness = illness || "";
    this._refreshStatusIcon();
  }

  /** 유저 평판이 낮을 때 NPC가 경계 태세(무장)에 들어간 것을 시각적으로 표시한다. */
  setWary(isWary) {
    if (this.isWary === isWary) return;
    this.isWary = isWary;
    this._refreshStatusIcon();
  }

  _refreshStatusIcon() {
    if (this.isDead) {
      this.statusIcon.setText("");
      return;
    }
    // 우선순위: 질병 > 경계 상태
    if (this.illness) {
      this.statusIcon.setText("🤒");
    } else if (this.isWary) {
      this.statusIcon.setText("⚔");
    } else {
      this.statusIcon.setText("");
    }
  }

  /**
   * 현재 게임 시각 기준으로 활성화되어야 할 루틴 엔트리를 찾고, 그 목적지까지의 A* 경로를
   * (필요할 때만) 요청한 뒤 웨이포인트를 따라 이동한다. 벽/건물을 피해서 돌아가야 하므로
   * 직선 이동 대신 Pathfinder(easystarjs)가 계산한 경로를 사용한다.
   */
  updateMovementTowardRoutine(gameHour, gameMinute) {
    if (this.isDead || !this.routineEntries.length) {
      this.setVelocity(0, 0);
      return;
    }

    if (this.pauseUntil && Date.now() < this.pauseUntil) {
      this.setVelocity(0, 0);
      return;
    }

    const nowMinutes = gameHour * 60 + gameMinute;
    let active = this.routineEntries[0];
    for (const entry of this.routineEntries) {
      const [h, m] = entry.time.split(":").map(Number);
      if (h * 60 + m <= nowMinutes) active = entry;
      else break;
    }

    const targetKey = `${active.x},${active.y}`;
    if (targetKey !== this.lastRoutineTargetKey) {
      this.lastRoutineTargetKey = targetKey;
      this.pathQueue = [];
      this.scene.pathfinder?.findPath(this.x, this.y, active.x, active.y, (waypoints) => {
        // 콜백이 늦게 도착했을 때, 그 사이에 목적지가 또 바뀌었으면 무시한다.
        if (this.lastRoutineTargetKey === targetKey) this.setPath(waypoints);
      });
    }

    this._followPath();
  }

  _followPath() {
    if (!this.pathQueue.length) {
      this.setVelocity(0, 0);
      return;
    }

    const next = this.pathQueue[0];
    const dist = Phaser.Math.Distance.Between(this.x, this.y, next.x, next.y);
    if (dist <= ARRIVE_THRESHOLD) {
      this.pathQueue.shift();
      if (!this.pathQueue.length) {
        this.setVelocity(0, 0);
        return;
      }
    }

    const target = this.pathQueue[0];
    const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
    this.facingAngle = angle;
    this.scene.physics.velocityFromRotation(angle, MOVE_SPEED, this.body.velocity);
  }

  updateLabel() {
    this.nameLabel.setPosition(this.x, this.y - 22);
    this.statusIcon.setPosition(this.x + 20, this.y - 22);
  }
}
