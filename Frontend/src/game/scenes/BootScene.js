import Phaser from "phaser";
import { TILE_SIZE } from "../map/mapData";

/**
 * 실제 아트 에셋(Tiled 맵, LPC 스프라이트 등)이 준비되기 전까지 사용할 절차적 placeholder 텍스처를
 * 코드로 직접 그려서 생성한다. 덕분에 외부 이미지 파일 없이도 `npm run dev` 만으로 즉시 실행 가능하다.
 * 실제 아트로 교체할 때는 이 씬의 텍스처 생성 로직을 이미지 로딩(this.load.image/spritesheet)으로
 * 바꾸기만 하면 나머지 시스템(MainScene 이하)은 그대로 재사용할 수 있다.
 */
export default class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create() {
    this._generateTileset();
    this._generateCharacterTextures();
    this.scene.start("MainScene");
  }

  _generateTileset() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    // 0: 바닥
    g.fillStyle(0xdcd0a8, 1);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.lineStyle(1, 0xc9bb87, 1);
    g.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);

    // 1: 벽/건물
    g.fillStyle(0x5b4636, 1);
    g.fillRect(TILE_SIZE, 0, TILE_SIZE, TILE_SIZE);
    g.lineStyle(1, 0x3a2c22, 1);
    g.strokeRect(TILE_SIZE, 0, TILE_SIZE, TILE_SIZE);

    // 2: 수풀(은신)
    g.fillStyle(0x2f7a3a, 1);
    g.fillRect(TILE_SIZE * 2, 0, TILE_SIZE, TILE_SIZE);
    g.fillStyle(0x3f9a4d, 1);
    g.fillCircle(TILE_SIZE * 2 + TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE / 2 - 4);

    // 3: 문(건물 출입구) - 바닥과 구분되는 갈색 나무문
    g.fillStyle(0x8a5a34, 1);
    g.fillRect(TILE_SIZE * 3, 0, TILE_SIZE, TILE_SIZE);
    g.lineStyle(1, 0x5b3a20, 1);
    g.strokeRect(TILE_SIZE * 3, 0, TILE_SIZE, TILE_SIZE);
    g.fillStyle(0x5b3a20, 1);
    g.fillCircle(TILE_SIZE * 3 + TILE_SIZE - 8, TILE_SIZE / 2, 2);

    // 4: 건물 내부 바닥 - 실외 바닥과 구분되는 톤
    g.fillStyle(0xcbb896, 1);
    g.fillRect(TILE_SIZE * 4, 0, TILE_SIZE, TILE_SIZE);
    g.lineStyle(1, 0xb39f78, 1);
    g.strokeRect(TILE_SIZE * 4, 0, TILE_SIZE, TILE_SIZE);

    g.generateTexture("tileset", TILE_SIZE * 5, TILE_SIZE);
    g.destroy();
  }

  _generateCharacterTextures() {
    // 유저 플레이어
    const player = this.make.graphics({ x: 0, y: 0, add: false });
    player.fillStyle(0x3aa0ff, 1);
    player.fillCircle(14, 14, 12);
    player.lineStyle(2, 0x1c5f99, 1);
    player.strokeCircle(14, 14, 12);
    player.generateTexture("player-tex", 28, 28);
    player.destroy();

    // NPC 공용 텍스처 (색상은 런타임에 setTint로 구분)
    const npc = this.make.graphics({ x: 0, y: 0, add: false });
    npc.fillStyle(0xffffff, 1);
    npc.fillRoundedRect(1, 1, 26, 26, 6);
    npc.lineStyle(2, 0x333333, 1);
    npc.strokeRoundedRect(1, 1, 26, 26, 6);
    npc.generateTexture("npc-tex", 28, 28);
    npc.destroy();
  }
}
