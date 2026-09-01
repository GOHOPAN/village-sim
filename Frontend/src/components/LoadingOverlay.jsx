import { useEffect, useState } from "react";
import eventBus, { GAME_EVENTS } from "../game/eventBus";

export default function LoadingOverlay() {
  const [state, setState] = useState({ active: false, message: "" });

  useEffect(() => {
    const onLoading = (payload) => setState(payload);
    eventBus.on(GAME_EVENTS.WORLD_LOADING, onLoading);
    return () => eventBus.off(GAME_EVENTS.WORLD_LOADING, onLoading);
  }, []);

  if (!state.active) return null;

  return (
    <div className="loading-overlay">
      <div className="loading-box">
        <div className="loading-spinner" />
        <p>{state.message || "마을이 밤사이의 일들을 정리하는 중..."}</p>
      </div>
    </div>
  );
}
