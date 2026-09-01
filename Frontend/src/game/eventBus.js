import Phaser from "phaser";

/**
 * Phaser 씬(캔버스 내부)과 React(DOM UI) 사이의 통신 채널.
 * React는 이 버스를 구독해 ChatBox/HUD를 열고, Phaser 씬은 상호작용 발생 시 emit 한다.
 */
class GameEventBus extends Phaser.Events.EventEmitter {}

const eventBus = new GameEventBus();

export const GAME_EVENTS = {
  OPEN_CHAT: "open-chat", // payload: { npcId, npcName }
  CLOSE_CHAT: "close-chat",
  NPC_SPOKE: "npc-spoke", // payload: { npcId, dialog, emotion }
  OPEN_EAVESDROP: "open-eavesdrop", // payload: { npcAId, npcBId, npcAName, npcBName }
  TIME_TICK: "time-tick", // payload: { hour, minute, dateLabel }
  WORLD_INFO: "world-info", // payload: { season, weather }
  WORLD_LOADING: "world-loading", // payload: { active, message }
  STATS_UPDATE: "stats-update", // payload: 유저 전체 상태 객체 (HUD가 폴링한 결과, ChatBox의 취기 판정 등에서 재사용)
  REQUEST_SLEEP: "request-sleep", // HUD -> MainScene: 유저가 취침 버튼을 눌렀음
  REQUEST_TIME_SKIP: "request-time-skip", // HUD -> MainScene: 유저가 시간 건너뛰기 버튼을 눌렀음
  STATS_REFRESH_REQUEST: "stats-refresh-request", // MainScene -> HUD: 지금 바로 스탯을 다시 불러오라는 신호
  OPEN_FACILITY: "open-facility", // payload: { facilityKey }
  OPEN_INVENTORY: "open-inventory",
};

export default eventBus;
