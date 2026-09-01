import { useEffect, useState } from "react";
import api from "../api/client";
import eventBus, { GAME_EVENTS } from "../game/eventBus";

const USER_ID = 1;
const STAT_POLL_MS = 5000;

export default function HUD() {
  const [time, setTime] = useState({ hour: 8, minute: 0, dateLabel: "", dateOnly: "" });
  const [worldInfo, setWorldInfo] = useState({ season: "", weather: "" });
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const onTick = (payload) => setTime(payload);
    const onWorldInfo = (payload) => setWorldInfo(payload);
    eventBus.on(GAME_EVENTS.TIME_TICK, onTick);
    eventBus.on(GAME_EVENTS.WORLD_INFO, onWorldInfo);
    return () => {
      eventBus.off(GAME_EVENTS.TIME_TICK, onTick);
      eventBus.off(GAME_EVENTS.WORLD_INFO, onWorldInfo);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const user = await api.getUser(USER_ID);
        if (!cancelled) {
          setStats(user);
          eventBus.emit(GAME_EVENTS.STATS_UPDATE, user);
        }
      } catch {
        // 백엔드 미기동 시 조용히 무시 (재시도는 다음 폴링에서)
      }
    };
    poll();
    const interval = setInterval(poll, STAT_POLL_MS);
    eventBus.on(GAME_EVENTS.STATS_REFRESH_REQUEST, poll);
    return () => {
      cancelled = true;
      clearInterval(interval);
      eventBus.off(GAME_EVENTS.STATS_REFRESH_REQUEST, poll);
    };
  }, []);

  const handleSleep = () => eventBus.emit(GAME_EVENTS.REQUEST_SLEEP);
  const handleTimeSkip = () => eventBus.emit(GAME_EVENTS.REQUEST_TIME_SKIP);

  const pad = (n) => String(n).padStart(2, "0");

  return (
    <div className="hud">
      <div className="hud-row hud-time">
        <span>📅 {time.dateOnly}</span>
        <span>
          🕐 {pad(time.hour)}:{pad(time.minute)}
        </span>
        <span>
          {worldInfo.season} / {worldInfo.weather}
        </span>
        <button type="button" className="hud-skip-btn" onClick={handleTimeSkip} title="1시간 건너뛰기 (키보드 H)">
          ⏩ 시간 건너뛰기(H)
        </button>
        <button type="button" className="hud-sleep-btn" onClick={handleSleep}>
          🛏 취침
        </button>
      </div>

      {stats && (
        <div className="hud-row hud-stats">
          <StatBar label="😴 기력" value={stats.fatigue} />
          <StatBar label="🍖 포만감" value={stats.hunger} />
          <StatBar label="🧼 위생" value={stats.hygiene} />
          <StatBar label="⭐ 평판" value={stats.reputation} />
          <StatBar label="🍺 취기" value={stats.intoxication} invert />
          <span className="hud-gold">💰 {stats.gold}</span>
          {stats.equipped_weapon && <span className="hud-equip-badge">⚔ {stats.equipped_weapon}</span>}
          {stats.equipped_tool && <span className="hud-equip-badge">🔧 {stats.equipped_tool}</span>}
          {stats.is_hidden && <span className="hud-hidden-badge">🌿 은신 중</span>}
        </div>
      )}
    </div>
  );
}

/**
 * @param {boolean} invert 값이 높을수록 나쁜 스탯인지 여부 (피로도/허기/취기 = true, 위생/평판 = false)
 */
function StatBar({ label, value, invert = false }) {
  const pct = Math.max(0, Math.min(value ?? 0, 100));
  const severity = invert ? pct : 100 - pct; // 0(양호) ~ 100(위험)로 정규화

  let level = "good";
  if (severity >= 70) level = "danger";
  else if (severity >= 40) level = "warning";

  return (
    <div className="hud-statbar" title={`${label} ${pct}`}>
      <span className="hud-statbar-label">{label}</span>
      <div className="hud-statbar-track">
        <div className={`hud-statbar-fill hud-statbar-fill--${level}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="hud-statbar-value">{pct}</span>
    </div>
  );
}
