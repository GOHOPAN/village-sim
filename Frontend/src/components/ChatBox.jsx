import { useEffect, useRef, useState } from "react";
import api from "../api/client";
import { scrambleDrunkText } from "../game/drunkText";
import eventBus, { GAME_EVENTS } from "../game/eventBus";

const USER_ID = 1;

export default function ChatBox() {
  const [target, setTarget] = useState(null); // { npcId, npcName, witnessNpcIds }
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [intoxication, setIntoxication] = useState(0);
  const [inventory, setInventory] = useState([]);
  const [showGiftPicker, setShowGiftPicker] = useState(false);
  const inputRef = useRef(null);
  const logRef = useRef(null);

  useEffect(() => {
    const onOpen = async ({ npcId, npcName, witnessNpcIds }) => {
      setTarget({ npcId, npcName, witnessNpcIds: witnessNpcIds ?? [] });
      setMessages([]);
      setInput("");
      setShowGiftPicker(false);
      try {
        const items = await api.getInventory(USER_ID);
        setInventory(items);
      } catch {
        setInventory([]);
      }
    };
    eventBus.on(GAME_EVENTS.OPEN_CHAT, onOpen);
    return () => eventBus.off(GAME_EVENTS.OPEN_CHAT, onOpen);
  }, []);

  useEffect(() => {
    const onStats = (user) => setIntoxication(user.intoxication ?? 0);
    eventBus.on(GAME_EVENTS.STATS_UPDATE, onStats);
    return () => eventBus.off(GAME_EVENTS.STATS_UPDATE, onStats);
  }, []);

  useEffect(() => {
    if (target) inputRef.current?.focus();
  }, [target]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages]);

  if (!target) return null;

  const close = () => {
    setTarget(null);
    eventBus.emit(GAME_EVENTS.CLOSE_CHAT);
  };

  const send = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setMessages((prev) => [...prev, { speaker: "user", text: scrambleDrunkText(text, intoxication) }]);
    setSending(true);

    try {
      const res = await api.chat(USER_ID, target.npcId, text, target.witnessNpcIds);
      const { dialog, emotion } = res.action;
      setMessages((prev) => [...prev, { speaker: "npc", text: dialog, fallback: res.used_fallback }]);
      eventBus.emit(GAME_EVENTS.NPC_SPOKE, { npcId: target.npcId, dialog, emotion });
    } catch {
      setMessages((prev) => [...prev, { speaker: "npc", text: "(연결에 실패했다... 백엔드 서버 상태를 확인하세요)" }]);
    } finally {
      setSending(false);
    }
  };

  const sendGift = async (itemName) => {
    setShowGiftPicker(false);
    setMessages((prev) => [...prev, { speaker: "user", text: `🎁 (${itemName}을(를) 선물로 건넨다)` }]);
    setSending(true);
    try {
      const res = await api.giftItem(USER_ID, target.npcId, itemName);
      const { dialog, emotion } = res.action;
      setMessages((prev) => [...prev, { speaker: "npc", text: dialog, fallback: res.used_fallback }]);
      eventBus.emit(GAME_EVENTS.NPC_SPOKE, { npcId: target.npcId, dialog, emotion });
      const items = await api.getInventory(USER_ID);
      setInventory(items);
    } catch {
      setMessages((prev) => [...prev, { speaker: "npc", text: "(선물을 건네지 못했다...)" }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="chatbox-overlay">
      <div className="chatbox">
        <div className="chatbox-header">
          <span>{target.npcName}</span>
          <button type="button" onClick={close} aria-label="닫기">
            ×
          </button>
        </div>

        <div className="chatbox-log" ref={logRef}>
          {messages.length === 0 && <p className="chatbox-hint">말이나 행동을 자유롭게 입력해보세요. (예: "안녕!", "갑자기 춤을 춘다")</p>}
          {messages.map((m, i) => (
            <div key={i} className={`chatbox-line chatbox-line--${m.speaker}`}>
              <span className="chatbox-speaker">{m.speaker === "user" ? "나" : target.npcName}</span>
              <span className="chatbox-text">
                {m.text}
                {m.fallback && <em className="chatbox-fallback-tag"> (폴백 응답)</em>}
              </span>
            </div>
          ))}
          {sending && <div className="chatbox-line chatbox-line--npc chatbox-thinking">...생각 중</div>}
        </div>

        {showGiftPicker && (
          <div className="chatbox-gift-picker">
            {inventory.length === 0 && <span className="chatbox-hint">선물할 아이템이 없습니다.</span>}
            {inventory.map((item) => (
              <button key={item.item_name} type="button" onClick={() => sendGift(item.item_name)}>
                {item.item_name} x{item.quantity}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={send} className="chatbox-form">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="하고 싶은 말이나 행동을 입력..."
            maxLength={500}
          />
          <button
            type="button"
            className="chatbox-gift-btn"
            onClick={() => setShowGiftPicker((v) => !v)}
            title="인벤토리에서 선물하기"
          >
            🎁 선물
          </button>
          <button type="submit" disabled={sending}>
            전송
          </button>
        </form>
      </div>
    </div>
  );
}
