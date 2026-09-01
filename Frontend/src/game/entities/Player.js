import Phaser from "phaser";

const SPEED = 120;

/** 유저 캐릭터. WASD 이동 + 은신 시 반투명 처리. */
export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "player-tex");
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCircle(12);
    this.setCollideWorldBounds(true);

    this.facingAngle = Math.PI / 2; // 기본적으로 아래를 바라봄
    this.isHidden = false;

    this.nameLabel = scene.add
      .text(x, y - 22, "나", {
        fontSize: "11px",
        color: "#ffffff",
        backgroundColor: "#00000088",
        padding: { x: 3, y: 1 },
      })
      .setOrigin(0.5)
      .setDepth(50);
  }

  /** @param {{up:boolean,down:boolean,left:boolean,right:boolean}} dir */
  handleMovement(dir) {
    let vx = 0;
    let vy = 0;
    if (dir.left) vx -= 1;
    if (dir.right) vx += 1;
    if (dir.up) vy -= 1;
    if (dir.down) vy += 1;

    const moving = vx !== 0 || vy !== 0;
    if (moving) {
      const len = Math.hypot(vx, vy);
      vx = (vx / len) * SPEED;
      vy = (vy / len) * SPEED;
      this.facingAngle = Math.atan2(vy, vx);
    }
    this.setVelocity(vx, vy);
    this.setAlpha(this.isHidden ? 0.5 : 1);
    this.nameLabel.setPosition(this.x, this.y - 22);
    return moving;
  }
}
