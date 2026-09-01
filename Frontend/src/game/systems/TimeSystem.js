import eventBus, { GAME_EVENTS } from "../eventBus";

/**
 * 게임 시계: 기본적으로 현실 1초 = 게임 1분으로 흐른다.
 * 백엔드 WorldState가 진실의 원천(source of truth)이며, 이 클래스는 매끄러운 프레임 단위 애니메이션을
 * 위한 로컬 보간용이다. 주기적으로 backend GET /world/state 와 재동기화해야 한다 (MainScene에서 처리).
 */
export default class TimeSystem {
  constructor({ minutesPerRealSecond = 1, passoutHour = 2 } = {}) {
    this.minutesPerRealSecond = minutesPerRealSecond;
    this.passoutHour = passoutHour;
    this.gameDatetime = new Date();
    this.lastEmittedMinute = null;
    this.hasHandledPassoutToday = false;
    this.paused = false;
  }

  setDatetime(isoString) {
    this.gameDatetime = new Date(isoString);
    this.lastEmittedMinute = null;
    if (this.gameDatetime.getHours() < this.passoutHour || this.gameDatetime.getHours() >= 8) {
      this.hasHandledPassoutToday = false;
    }
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  /** @returns {boolean} 이번 프레임에 처음으로 기절 조건(새벽 시간대)에 진입했는지 여부 */
  update(deltaMs) {
    if (this.paused) return false;

    const gameMinutesElapsed = (deltaMs / 1000) * this.minutesPerRealSecond;
    this.gameDatetime = new Date(this.gameDatetime.getTime() + gameMinutesElapsed * 60000);

    const currentMinuteKey = `${this.gameDatetime.getHours()}:${this.gameDatetime.getMinutes()}`;
    if (currentMinuteKey !== this.lastEmittedMinute) {
      this.lastEmittedMinute = currentMinuteKey;
      eventBus.emit(GAME_EVENTS.TIME_TICK, {
        hour: this.gameDatetime.getHours(),
        minute: this.gameDatetime.getMinutes(),
        dateLabel: this.formattedDate(),
        dateOnly: this.formattedDateOnly(),
      });
    }

    const hour = this.gameDatetime.getHours();
    if (hour >= 8) this.hasHandledPassoutToday = false;

    if (hour === this.passoutHour && !this.hasHandledPassoutToday) {
      this.hasHandledPassoutToday = true;
      return true;
    }
    return false;
  }

  formattedDate() {
    const d = this.gameDatetime;
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  formattedDateOnly() {
    const d = this.gameDatetime;
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
}
