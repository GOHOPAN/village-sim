import { useEffect, useState } from "react";
import api from "../api/client";
import eventBus, { GAME_EVENTS } from "../game/eventBus";

const USER_ID = 1;

const SELL_HINT = { 장작: "목공소에서 판매 가능", 철광석: "대장간에서 판매 가능" };

export default function Inventory() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [equipped, setEquipped] = useState({ tool: "", weapon: "" });
  const [message, setMessage] = useState("");

  const refresh = async () => {
    try {
      const [inv, user] = await Promise.all([api.getInventory(USER_ID), api.getUser(USER_ID)]);
      setItems(inv);
      setEquipped({ tool: user.equipped_tool, weapon: user.equipped_weapon });
    } catch {
      setMessage("인벤토리를 불러오지 못했습니다.");
    }
  };

  useEffect(() => {
    const onOpen = async () => {
      setOpen(true);
      setMessage("");
      await refresh();
    };
    const onClose = () => setOpen(false);
    eventBus.on(GAME_EVENTS.OPEN_INVENTORY, onOpen);
    eventBus.on(GAME_EVENTS.CLOSE_CHAT, onClose);
    return () => {
      eventBus.off(GAME_EVENTS.OPEN_INVENTORY, onOpen);
      eventBus.off(GAME_EVENTS.CLOSE_CHAT, onClose);
    };
  }, []);

  if (!open) return null;

  const close = () => {
    setOpen(false);
    eventBus.emit(GAME_EVENTS.CLOSE_CHAT);
  };

  // 아이템의 category는 카탈로그(백엔드)에만 있으므로, 이름 기반으로 간단히 슬롯을 유추한다.
  const TOOL_ITEMS = ["곡괭이", "도끼"];
  const WEAPON_ITEMS = ["낡은 검"];
  const CONSUMABLE_ITEMS = ["빵", "국밥", "스튜", "구운 생선", "에일", "약초물약", "만병통치약"];

  const equip = async (slot, itemName) => {
    try {
      await api.equipItem(USER_ID, slot, itemName);
      await refresh();
      eventBus.emit(GAME_EVENTS.STATS_REFRESH_REQUEST);
      setMessage(itemName ? `${itemName} 장착함.` : "장착 해제함.");
    } catch {
      setMessage("장착에 실패했습니다.");
    }
  };

  const use = async (itemName) => {
    try {
      const res = await api.useItem(USER_ID, itemName, 1);
      setMessage(res.message);
      await refresh();
      eventBus.emit(GAME_EVENTS.STATS_REFRESH_REQUEST);
    } catch {
      setMessage("사용에 실패했습니다.");
    }
  };

  return (
    <div className="chatbox-overlay">
      <div className="chatbox inventory-modal">
        <div className="chatbox-header">
          <span>🎒 소지품 (I)</span>
          <button type="button" onClick={close} aria-label="닫기">
            ×
          </button>
        </div>

        <div className="chatbox-log">
          <div className="inventory-equipped">
            <span>🔧 도구: {equipped.tool || "없음"}</span>
            {equipped.tool && (
              <button type="button" onClick={() => equip("tool", "")}>
                해제
              </button>
            )}
            <span>⚔ 무기: {equipped.weapon || "맨손"}</span>
            {equipped.weapon && (
              <button type="button" onClick={() => equip("weapon", "")}>
                해제
              </button>
            )}
          </div>

          {items.length === 0 && <p className="chatbox-hint">가지고 있는 물건이 없습니다.</p>}

          <ul className="facility-item-list">
            {items.map((item) => {
              const isTool = TOOL_ITEMS.includes(item.item_name);
              const isWeapon = WEAPON_ITEMS.includes(item.item_name);
              const isConsumable = CONSUMABLE_ITEMS.includes(item.item_name);
              const sellHint = SELL_HINT[item.item_name];
              return (
                <li key={item.item_name}>
                  <span>
                    {item.item_name} x{item.quantity}
                    {sellHint && <em> ({sellHint})</em>}
                  </span>
                  {isTool && (
                    <button type="button" onClick={() => equip("tool", item.item_name)}>
                      장착
                    </button>
                  )}
                  {isWeapon && (
                    <button type="button" onClick={() => equip("weapon", item.item_name)}>
                      장착
                    </button>
                  )}
                  {isConsumable && (
                    <button type="button" onClick={() => use(item.item_name)}>
                      사용
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          {message && <p className="facility-message">{message}</p>}
        </div>
      </div>
    </div>
  );
}
