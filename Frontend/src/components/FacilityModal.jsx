import { useEffect, useRef, useState } from "react";
import api from "../api/client";
import eventBus, { GAME_EVENTS } from "../game/eventBus";
import { BUILDING_LABELS, FACILITIES } from "../game/map/mapData";

const GATHER_LOADING_MS = 5000; // 채집 버튼을 누른 뒤 실제 요청 전까지 보여주는 고정 로딩 시간(실제 시간)

const USER_ID = 1;
const GATHER_LOCATIONS = ["forest", "mine"];
const GATED_FACILITIES = ["gambling_den", "black_market"];
// 이 건물들은 밤+친밀도 조건이 맞으면 다른 시설로 "변신"할 수 있다 (술집->도박장, 대장간->암시장).
const HOST_BUILDINGS = ["tavern", "blacksmith"];
// 채집 재료를 사들이는 건물: 장작은 목공소, 철광석은 대장간
const SELLABLE_MATERIALS_BY_FACILITY = {
  blacksmith: "철광석",
  carpenter: "장작",
};

const HIDDEN_LABELS = { gambling_den: "🎲 도박장(비밀)", black_market: "🕶 암시장(비밀)" };

export default function FacilityModal() {
  const [openKey, setOpenKey] = useState(null); // 유저가 실제로 들어간 건물 키 (탭 열림 여부 판단용)
  const [nearbyNpcIds, setNearbyNpcIds] = useState([]); // 채집 현장을 목격할 수 있는 근처 NPC들
  const [effectiveKey, setEffectiveKey] = useState(null); // 실제로 보여줄 상점 키 (변신했으면 hidden_key)
  const [items, setItems] = useState([]);
  const [access, setAccess] = useState(null); // null = 게이팅 대상 아님
  const [sellableItem, setSellableItem] = useState(null); // { name, quantity, sellPrice }
  const [message, setMessage] = useState("");
  const [betAmount, setBetAmount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [gathering, setGathering] = useState(false);
  const [gatherProgress, setGatherProgress] = useState(0);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  useEffect(() => {
    const onOpen = async ({ facilityKey: key, nearbyNpcIds: ids }) => {
      setOpenKey(key);
      setNearbyNpcIds(ids ?? []);
      setMessage("");
      setItems([]);
      setAccess(null);
      setSellableItem(null);
      setLoading(true);
      try {
        let resolvedKey = key;
        if (HOST_BUILDINGS.includes(key)) {
          const reveal = await api.checkHiddenReveal(key, USER_ID);
          if (reveal.revealed) resolvedKey = reveal.hidden_key;
        }
        setEffectiveKey(resolvedKey);

        let allowed = true;
        if (GATED_FACILITIES.includes(resolvedKey)) {
          const acc = await api.checkFacilityAccess(resolvedKey, USER_ID);
          setAccess(acc);
          allowed = acc.allowed;
        }

        if (allowed && !GATHER_LOCATIONS.includes(resolvedKey) && resolvedKey !== "gambling_den") {
          const shopItems = await api.getShopItems(resolvedKey);
          setItems(shopItems);
        }

        const materialName = SELLABLE_MATERIALS_BY_FACILITY[resolvedKey];
        if (materialName) {
          const inventory = await api.getInventory(USER_ID);
          const owned = inventory.find((i) => i.item_name === materialName);
          if (owned) setSellableItem({ name: materialName, quantity: owned.quantity });
        }
      } catch {
        setMessage("정보를 불러오지 못했습니다. 백엔드 연결을 확인하세요.");
      } finally {
        setLoading(false);
      }
    };
    eventBus.on(GAME_EVENTS.OPEN_FACILITY, onOpen);
    return () => eventBus.off(GAME_EVENTS.OPEN_FACILITY, onOpen);
  }, []);

  if (!openKey) return null;

  const close = () => {
    setOpenKey(null);
    eventBus.emit(GAME_EVENTS.CLOSE_CHAT);
  };

  const buy = async (itemName) => {
    try {
      const res = await api.buyItem(USER_ID, effectiveKey, itemName, 1);
      setMessage(res.message);
      eventBus.emit(GAME_EVENTS.STATS_REFRESH_REQUEST);
    } catch {
      setMessage("구매에 실패했습니다.");
    }
  };

  const sellMaterial = async () => {
    if (!sellableItem) return;
    try {
      const res = await api.sellItem(USER_ID, effectiveKey, sellableItem.name, 1);
      setMessage(res.message);
      eventBus.emit(GAME_EVENTS.STATS_REFRESH_REQUEST);
      const inventory = await api.getInventory(USER_ID);
      const owned = inventory.find((i) => i.item_name === sellableItem.name);
      setSellableItem(owned ? { name: sellableItem.name, quantity: owned.quantity } : null);
    } catch {
      setMessage("판매에 실패했습니다.");
    }
  };

  const gather = async () => {
    if (gathering) return;
    setGathering(true);
    setGatherProgress(0);
    setMessage("");

    // 채집은 실제로 5초간 로딩된 뒤에야 완료된다 (그 사이 게임 시간은 흐르지 않고, 완료 시점에
    // 백엔드가 고정된 게임 시간(15분)만큼 한 번에 반영한다).
    const stepMs = 100;
    const steps = GATHER_LOADING_MS / stepMs;
    for (let i = 1; i <= steps; i++) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, stepMs));
      if (cancelledRef.current) return;
      setGatherProgress(Math.min((i / steps) * 100, 100));
    }

    try {
      const res = await api.gather(USER_ID, effectiveKey, nearbyNpcIds);
      if (cancelledRef.current) return;
      setMessage(res.message);
      eventBus.emit(GAME_EVENTS.STATS_REFRESH_REQUEST);
    } catch {
      if (!cancelledRef.current) setMessage("채집에 실패했습니다.");
    } finally {
      if (!cancelledRef.current) {
        setGathering(false);
        setGatherProgress(0);
      }
    }
  };

  const gamble = async () => {
    try {
      const res = await api.gamble(USER_ID, betAmount);
      setMessage(res.message);
      eventBus.emit(GAME_EVENTS.STATS_REFRESH_REQUEST);
    } catch {
      setMessage("도박에 실패했습니다.");
    }
  };

  const isGated = GATED_FACILITIES.includes(effectiveKey);
  const allowed = !isGated || (access?.allowed ?? false);
  const isGather = GATHER_LOCATIONS.includes(effectiveKey);
  const isGamble = effectiveKey === "gambling_den";
  const title = HIDDEN_LABELS[effectiveKey] ?? BUILDING_LABELS[openKey] ?? FACILITIES[openKey]?.label ?? openKey;

  return (
    <div className="chatbox-overlay">
      <div className="chatbox facility-modal">
        <div className="chatbox-header">
          <span>{title}</span>
          <button type="button" onClick={close} aria-label="닫기">
            ×
          </button>
        </div>

        <div className="chatbox-log">
          {loading && <p className="chatbox-hint">불러오는 중...</p>}

          {isGated && access && !access.allowed && (
            <p className="facility-denied">
              🚫 {access.reason} (친밀도 {access.current_familiarity.toFixed(0)}/{access.required_familiarity.toFixed(0)})
            </p>
          )}

          {allowed && isGather && !gathering && (
            <button type="button" className="facility-action-btn" onClick={gather}>
              🌿 채집하기 (도구 필요, 게임시간 15분 소요)
            </button>
          )}

          {allowed && isGather && gathering && (
            <div className="facility-gather-progress">
              <span>⛏ 채집 중...</span>
              <div className="facility-gather-bar">
                <div className="facility-gather-bar-fill" style={{ width: `${gatherProgress}%` }} />
              </div>
            </div>
          )}

          {allowed && isGamble && (
            <div className="facility-gamble-row">
              <input
                type="number"
                min={1}
                value={betAmount}
                onChange={(e) => setBetAmount(Math.max(1, Number(e.target.value) || 1))}
              />
              <button type="button" className="facility-action-btn" onClick={gamble}>
                🎲 베팅하기
              </button>
            </div>
          )}

          {allowed && sellableItem && (
            <div className="facility-sell-row">
              <span>
                🪵 보유 중: {sellableItem.name} x{sellableItem.quantity}
              </span>
              <button type="button" className="facility-action-btn" onClick={sellMaterial}>
                판매하기
              </button>
            </div>
          )}

          {allowed && items.length > 0 && (
            <ul className="facility-item-list">
              {items.map((item) => (
                <li key={item.name}>
                  <span>
                    {item.name} <em>({item.category})</em>
                  </span>
                  <span className="facility-item-price">{item.price} 골드</span>
                  <button type="button" onClick={() => buy(item.name)}>
                    구매
                  </button>
                </li>
              ))}
            </ul>
          )}

          {allowed && !isGather && !isGamble && items.length === 0 && !sellableItem && !loading && (
            <p className="chatbox-hint">이곳에서 살 수 있는 물건이 없습니다.</p>
          )}

          {message && <p className="facility-message">{message}</p>}
        </div>
      </div>
    </div>
  );
}
