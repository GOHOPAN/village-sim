import EasyStar from "easystarjs";
import { TILE, TILE_SIZE } from "../map/mapData";

/**
 * A* 최단 경로 탐색 (easystarjs 기반).
 *
 * NPC가 루틴 목적지로 "직선"으로만 이동하면 건물(장애물)에 얼굴을 박고 멈춰버리는 문제가 있었다.
 * 이를 해결하기 위해 타일 그리드 기준으로 경로를 계산하고, 그 경로의 웨이포인트를 따라가도록 한다.
 */
export default class Pathfinder {
  constructor(grid) {
    this.easystar = new EasyStar.js();
    this.easystar.setGrid(grid);
    this.easystar.setAcceptableTiles([TILE.FLOOR, TILE.BUSH, TILE.DOOR, TILE.INTERIOR]);
    this.easystar.enableDiagonals();
    this.easystar.disableCornerCutting();
    this.easystar.setIterationsPerCalculation(2000);
  }

  /** MainScene의 update() 루프에서 매 프레임 호출해야 큐에 쌓인 경로 요청이 실제로 계산된다. */
  update() {
    this.easystar.calculate();
  }

  /**
   * @param {number} fromX 픽셀 좌표
   * @param {number} fromY 픽셀 좌표
   * @param {number} toX 픽셀 좌표
   * @param {number} toY 픽셀 좌표
   * @param {(waypoints: {x:number,y:number}[]) => void} onFound 경로를 찾지 못하면 빈 배열을 전달한다.
   */
  findPath(fromX, fromY, toX, toY, onFound) {
    const startCol = Math.floor(fromX / TILE_SIZE);
    const startRow = Math.floor(fromY / TILE_SIZE);
    const endCol = Math.floor(toX / TILE_SIZE);
    const endRow = Math.floor(toY / TILE_SIZE);

    this.easystar.findPath(startCol, startRow, endCol, endRow, (path) => {
      if (!path || path.length === 0) {
        onFound([]);
        return;
      }
      // path[0]은 현재 위치이므로 건너뛰고, 나머지 타일 중심 좌표를 웨이포인트로 사용한다.
      const waypoints = path.slice(1).map((p) => ({
        x: p.x * TILE_SIZE + TILE_SIZE / 2,
        y: p.y * TILE_SIZE + TILE_SIZE / 2,
      }));
      onFound(waypoints);
    });
  }
}
