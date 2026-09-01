import Phaser from "phaser";

const MAX_INTERACT_DISTANCE = 56;
const FACING_CONE_RAD = Phaser.Math.DegToRad(70);

/**
 * 상호작용 키(E) 타겟팅 우선순위 로직.
 * 여러 NPC가 겹쳐 있어도, "플레이어가 바라보는 방향의 콘(cone) 안 + 가장 가까운" 대상 하나만
 * 하이라이트하고 프롬프트를 띄운다 (스타듀 밸리/동물의 숲 방식).
 */
export default class InteractionSystem {
  constructor(scene) {
    this.scene = scene;
    this.currentTarget = null;
    this.highlight = scene.add.graphics().setDepth(40);
    this.promptText = scene.add
      .text(0, 0, "[E] 대화하기", {
        fontSize: "12px",
        color: "#ffe066",
        backgroundColor: "#00000099",
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(51)
      .setVisible(false);
  }

  findBestTarget(player, npcList) {
    let best = null;
    let bestScore = -Infinity;

    for (const npc of npcList) {
      if (npc.isDead) continue;
      const dist = Phaser.Math.Distance.Between(player.x, player.y, npc.x, npc.y);
      if (dist > MAX_INTERACT_DISTANCE) continue;

      const angleToTarget = Phaser.Math.Angle.Between(player.x, player.y, npc.x, npc.y);
      const angleDiff = Math.abs(Phaser.Math.Angle.Wrap(angleToTarget - player.facingAngle));
      if (angleDiff > FACING_CONE_RAD) continue;

      const score = -dist - angleDiff * 20;
      if (score > bestScore) {
        bestScore = score;
        best = npc;
      }
    }
    return best;
  }

  update(player, npcList) {
    const target = this.findBestTarget(player, npcList);
    this.currentTarget = target;

    this.highlight.clear();
    if (target) {
      this.highlight.lineStyle(2, 0xffe066, 1);
      this.highlight.strokeRoundedRect(target.x - 16, target.y - 20, 32, 36, 6);
      this.promptText.setPosition(target.x, target.y - 34).setVisible(true);
    } else {
      this.promptText.setVisible(false);
    }
    return target;
  }
}
