/**
 * 유저의 취기가 높을 때 채팅창에 표시되는 텍스트를 시각적으로 "혀 꼬인" 느낌으로 왜곡한다.
 * 실제로 백엔드에 전송되는 원문은 그대로 유지된다 (NPC의 LLM 판단은 user.intoxication 수치로
 * 별도 처리되므로, 여기서는 순수하게 채팅 로그의 "보여지는 텍스트"만 장난스럽게 바꾼다).
 */
export function scrambleDrunkText(text, intoxication) {
  if (intoxication < 50 || !text) return text;

  const intensity = Math.min((intoxication - 50) / 50, 1); // 0(취기 50) ~ 1(취기 100)
  const words = text.split(" ");

  const scrambled = words.map((word) => {
    if (!word) return word;
    let out = word;
    if (Math.random() < 0.3 + 0.4 * intensity) {
      const lastChar = word[word.length - 1];
      out += lastChar.repeat(1 + Math.floor(Math.random() * 2 * intensity));
    }
    if (Math.random() < 0.4 * intensity) out += "~";
    return out;
  });

  let result = scrambled.join(" ");
  if (intensity > 0.6 && Math.random() < 0.5) result = `으.. ${result}`;
  return result;
}
