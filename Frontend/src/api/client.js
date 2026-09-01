const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`API ${response.status}: ${detail}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  getWorldState: () => request("/world/state"),
  advanceTime: (minutes) => request("/world/advance", { method: "POST", body: JSON.stringify({ minutes }) }),
  sleep: (userId) => request(`/world/sleep?user_id=${userId}`, { method: "POST" }),
  passout: (userId) => request(`/world/passout?user_id=${userId}`, { method: "POST" }),

  listNpcs: () => request("/npc"),
  getNpc: (npcId) => request(`/npc/${npcId}`),
  getNpcRoutine: (npcId) => request(`/npc/${npcId}/routine`),
  getNpcRelationship: (npcId, userId = 1) => request(`/npc/${npcId}/relationship?with_user_id=${userId}`),
  updateNpcState: (npcId, payload) =>
    request(`/npc/${npcId}/state`, { method: "PATCH", body: JSON.stringify(payload) }),

  getUser: (userId) => request(`/user/${userId}`),
  updateUserState: (userId, payload) =>
    request(`/user/${userId}/state`, { method: "PATCH", body: JSON.stringify(payload) }),

  chat: (userId, npcId, message, witnessNpcIds = []) =>
    request("/chat", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, npc_id: npcId, message, witness_npc_ids: witnessNpcIds }),
    }),

  eavesdrop: (npcAId, npcBId, topicHint) =>
    request("/eavesdrop", {
      method: "POST",
      body: JSON.stringify({ npc_a_id: npcAId, npc_b_id: npcBId, topic_hint: topicHint }),
    }),

  triggerEvent: (eventType, affectedNpcIds = [], data = {}) =>
    request("/event/trigger", {
      method: "POST",
      body: JSON.stringify({ event_type: eventType, affected_npc_ids: affectedNpcIds, data }),
    }),
  listActiveEvents: () => request("/event/active"),

  spreadRumor: (fromUserId, toNpcId, rumorText, subjectNpcId) =>
    request("/rumor/spread", {
      method: "POST",
      body: JSON.stringify({
        from_user_id: fromUserId,
        to_npc_id: toNpcId,
        rumor_text: rumorText,
        subject_npc_id: subjectNpcId ?? null,
      }),
    }),

  // --- 게임 설정 (런타임 조정 가능한 확률/배속) ---
  getConfig: () => request("/config"),
  updateConfig: (payload) => request("/config", { method: "PATCH", body: JSON.stringify(payload) }),

  // --- 상점 / 채집 / 인벤토리 ---
  getShopItems: (facilityKey) => request(`/shop/${facilityKey}/items`),
  buyItem: (userId, facilityKey, itemName, quantity = 1) =>
    request("/shop/buy", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, facility_key: facilityKey, item_name: itemName, quantity }),
    }),
  sellItem: (userId, facilityKey, itemName, quantity = 1) =>
    request("/shop/sell", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, facility_key: facilityKey, item_name: itemName, quantity }),
    }),
  useItem: (userId, itemName, quantity = 1) =>
    request("/shop/use", { method: "POST", body: JSON.stringify({ user_id: userId, item_name: itemName, quantity }) }),
  gather: (userId, location, nearbyNpcIds = []) =>
    request("/gather", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, location, nearby_npc_ids: nearbyNpcIds }),
    }),
  getInventory: (userId) => request(`/user/${userId}/inventory`),
  equipItem: (userId, slot, itemName) =>
    request(`/user/${userId}/equip`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId, slot, item_name: itemName }),
    }),
  tickUser: (userId, gameMinutes) =>
    request(`/user/${userId}/tick`, { method: "POST", body: JSON.stringify({ game_minutes: gameMinutes }) }),

  // --- 선물 ---
  giftItem: (userId, npcId, itemName) =>
    request("/chat/gift", { method: "POST", body: JSON.stringify({ user_id: userId, npc_id: npcId, item_name: itemName }) }),

  // --- 시설 접근 (도박장/암시장) ---
  checkFacilityAccess: (facilityKey, userId) => request(`/facility/${facilityKey}/access?user_id=${userId}`),
  checkHiddenReveal: (buildingKey, userId) => request(`/facility/host/${buildingKey}/reveal?user_id=${userId}`),
  gamble: (userId, bet) => request("/facility/gamble", { method: "POST", body: JSON.stringify({ user_id: userId, bet }) }),

  // --- NPC-NPC 자동 마주침 ---
  npcEncounterResolve: (npcAId, npcBId) =>
    request("/npc-encounter/resolve", { method: "POST", body: JSON.stringify({ npc_a_id: npcAId, npc_b_id: npcBId }) }),

  // --- 전투 ---
  attackNpc: (npcId, userId, witnessNpcIds = []) =>
    request(`/npc/${npcId}/attack`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId, witness_npc_ids: witnessNpcIds }),
    }),
};

export default api;
