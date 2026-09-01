import Phaser from "phaser";
import RaycasterPlugin from "phaser-raycaster";

import { MAP_COLS, MAP_ROWS, TILE_SIZE } from "./map/mapData";
import BootScene from "./scenes/BootScene";
import MainScene from "./scenes/MainScene";
import TiledMapTestScene from "./scenes/TiledMapTestScene";

/**
 * phaser-raycaster는 씬 플러그인(this.raycasterPlugin)으로 등록해 둔다.
 * StealthSystem은 기본적으로 자체 LOS(Line-of-Sight) 계산을 사용하지만, 더 정교한 시야 콘 시각화나
 * 광선 기반 판정으로 교체하고 싶다면 이 플러그인을 씬에서 바로 사용할 수 있다.
 */
export function createGameConfig(parentId) {
  // "?map=tiled" 로 접속하면 절차적 placeholder 대신 Tiled로 만든 실제 맵(village.json)을 테스트한다.
  // 기존 게임 흐름(BootScene -> MainScene)에는 전혀 영향을 주지 않는 별도 경로.
  const useTiledTestMap = new URLSearchParams(window.location.search).get("map") === "tiled";

  return {
    type: Phaser.AUTO,
    parent: parentId,
    width: useTiledTestMap ? 1024 : MAP_COLS * TILE_SIZE,
    height: useTiledTestMap ? 768 : MAP_ROWS * TILE_SIZE,
    backgroundColor: "#1a1a1a",
    pixelArt: true,
    physics: {
      default: "arcade",
      arcade: {
        gravity: { y: 0 },
        debug: true,
      },
    },
    plugins: {
      scene: [{ key: "PhaserRaycaster", plugin: RaycasterPlugin, mapping: "raycasterPlugin" }],
    },
    scene: useTiledTestMap ? [TiledMapTestScene] : [BootScene, MainScene],
  };
}
