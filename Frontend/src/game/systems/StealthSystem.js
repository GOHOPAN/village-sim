import Phaser from "phaser";
import { TILE, TILE_SIZE } from "../map/mapData";

const VIEW_DISTANCE = 260; // px (기존 160에서 확대 - 살해 등을 목격하기 더 쉽게)
const FOV_HALF_ANGLE_RAD = Phaser.Math.DegToRad(65); // NPC 시야각(광선투사 판정의 콘 범위)

/**
 * 시야/은신(Stealth) 시스템.
 *
 * - 맵의 HIDDEN=TRUE(수풀) 타일에 유저가 진입하면 은신을 "시도"한다.
 * - 은신 성공 여부는 주변 NPC의 시야각 내에 있는지 + 그 사이에 벽이 있는지(광선투사/Line-of-Sight)로 판정한다.
 *   phaser-raycaster 플러그인은 game config에 등록되어 있어 더 정교한 콘 시각화가 필요할 때 바로 쓸 수 있지만,
 *   판정 자체는 Phaser.Geom 기반의 자체 LOS 계산으로 처리해 외부 플러그인 API 변경에 안전하게 만들었다.
 * - NPC 시야 밖이면 은신 성공(엿듣기 아이콘 활성화), 걸리면 은신 실패.
 */
export default class StealthSystem {
  constructor(scene, wallLayer) {
    this.scene = scene;
    this.wallLayer = wallLayer;
    this._wallRects = null;
  }

  getWallRects() {
    if (this._wallRects) return this._wallRects;
    const rects = [];
    this.wallLayer.forEachTile((tile) => {
      if (tile && tile.index === TILE.WALL) {
        rects.push(new Phaser.Geom.Rectangle(tile.pixelX, tile.pixelY, TILE_SIZE, TILE_SIZE));
      }
    });
    this._wallRects = rects;
    return rects;
  }

  hasLineOfSight(fromX, fromY, toX, toY) {
    const line = new Phaser.Geom.Line(fromX, fromY, toX, toY);
    const rects = this.getWallRects();
    for (const rect of rects) {
      if (Phaser.Geom.Intersects.LineToRectangle(line, rect)) return false;
    }
    return true;
  }

  isPlayerOnBush(player) {
    const tile = this.wallLayer.getTileAtWorldXY(player.x, player.y);
    return !!tile && tile.index === TILE.BUSH;
  }

  /**
   * NPC 한 명이 대상(target: 플레이어 or 다른 NPC)을 볼 수 있는지 판정.
   * @param {{x:number, y:number, facingAngle:number}} npc
   * @param {{x:number, y:number}} target
   */
  npcCanSee(npc, target) {
    const dist = Phaser.Math.Distance.Between(npc.x, npc.y, target.x, target.y);
    if (dist > VIEW_DISTANCE) return false;

    const angleToTarget = Phaser.Math.Angle.Between(npc.x, npc.y, target.x, target.y);
    const angleDiff = Math.abs(Phaser.Math.Angle.Wrap(angleToTarget - (npc.facingAngle ?? 0)));
    if (angleDiff > FOV_HALF_ANGLE_RAD) return false;

    return this.hasLineOfSight(npc.x, npc.y, target.x, target.y);
  }

  /**
   * 매 프레임 호출: 플레이어가 수풀 위에 있을 때만 은신 판정을 갱신한다.
   * @returns {{onBush: boolean, hidden: boolean, spottedBy: object|null}}
   */
  evaluate(player, npcList) {
    const onBush = this.isPlayerOnBush(player);
    if (!onBush) {
      return { onBush: false, hidden: false, spottedBy: null };
    }

    const spotter = npcList.find((npc) => !npc.isDead && this.npcCanSee(npc, player));
    return { onBush: true, hidden: !spotter, spottedBy: spotter ?? null };
  }
}
