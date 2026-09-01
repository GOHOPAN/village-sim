import { useEffect, useState } from "react";
import api from "../api/client";
import eventBus, { GAME_EVENTS } from "../game/eventBus";

export default function EavesdropModal() {
  const [pair, setPair] = useState(null); // { npcAId, npcBId, npcAName, npcBName }
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onOpen = async (payload) => {
      setPair(payload);
      setLines([]);
      setLoading(true);
      try {
        const res = await api.eavesdrop(payload.npcAId, payload.npcBId);
        setLines(res.lines);
      } catch {
        setLines([{ speaker: "?", text: "(대화 내용을 알아듣지 못했다...)" }]);
      } finally {
        setLoading(false);
      }
    };
    eventBus.on(GAME_EVENTS.OPEN_EAVESDROP, onOpen);
    return () => eventBus.off(GAME_EVENTS.OPEN_EAVESDROP, onOpen);
  }, []);

  if (!pair) return null;

  const close = () => {
    setPair(null);
    eventBus.emit(GAME_EVENTS.CLOSE_CHAT);
  };

  return (
    <div className="chatbox-overlay">
      <div className="chatbox eavesdrop-modal">
        <div className="chatbox-header">
          <span>
            👂 {pair.npcAName} & {pair.npcBName}의 대화를 엿듣는 중...
          </span>
          <button type="button" onClick={close} aria-label="닫기">
            ×
          </button>
        </div>
        <div className="chatbox-log">
          {loading && <p className="chatbox-hint">대화를 엿듣는 중...</p>}
          {lines.map((line, i) => (
            <div key={i} className="chatbox-line chatbox-line--npc">
              <span className="chatbox-speaker">{line.speaker}</span>
              <span className="chatbox-text">{line.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
