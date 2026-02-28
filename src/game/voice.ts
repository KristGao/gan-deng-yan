// Voice synthesis for card playing and game actions
// Uses Web Speech API for text-to-speech

export type Gender = "male" | "female";

// Card name mapping for Chinese
const CARD_NAMES: Record<string, string> = {
  // Suits
  "♠": "黑桃",
  "♥": "红桃",
  "♣": "梅花",
  "♦": "方块",
  // Ranks
  "3": "三",
  "4": "四",
  "5": "五",
  "6": "六",
  "7": "七",
  "8": "八",
  "9": "九",
  "10": "十",
  "J": "勾",
  "Q": "圈",
  "K": "凯",
  "A": "尖",
  "2": "二",
  "joker": "王牌",
  "JOKER": "大王",
};

// Get Chinese name for a card
export const getCardVoiceName = (cardLabel: string): string => {
  if (cardLabel === "JOKER") return "大王";
  if (cardLabel === "joker") return "小王";
  
  const suit = cardLabel.slice(0, 1);
  const rank = cardLabel.slice(1);
  
  const suitName = CARD_NAMES[suit] || "";
  const rankName = CARD_NAMES[rank] || rank;
  
  return suitName + rankName;
};

// Speak text using Web Speech API
const speak = (text: string, gender: Gender = "male") => {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    console.warn("Speech synthesis not supported");
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "zh-CN";
  utterance.rate = 1.0;
  utterance.pitch = gender === "female" ? 1.2 : 0.9;
  utterance.volume = 0.8;

  // Try to find a voice matching the gender preference
  const voices = window.speechSynthesis.getVoices();
  const chineseVoice = voices.find(
    (v) => v.lang.includes("zh") || v.lang.includes("CN")
  );
  
  if (chineseVoice) {
    utterance.voice = chineseVoice;
  }

  window.speechSynthesis.speak(utterance);
};

// Play voice for playing cards
export const playCardVoice = (cardLabels: string[], gender: Gender = "male") => {
  const cardNames = cardLabels.map(getCardVoiceName).join("，");
  speak(cardNames, gender);
};

// Play "pass" voice (要不起)
export const playPassVoice = (gender: Gender = "male") => {
  const passPhrases = ["要不起", "不要", "过"];
  const randomPhrase = passPhrases[Math.floor(Math.random() * passPhrases.length)];
  speak(randomPhrase, gender);
};

// Play bomb voice
export const playBombVoice = (gender: Gender = "male") => {
  speak("炸弹！", gender);
};

// Play win voice
export const playWinVoice = (playerName: string, gender: Gender = "male") => {
  speak(`${playerName}赢了！`, gender);
};

// Initialize voices (needs to be called after user interaction)
export const initVoices = () => {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    // Force load voices
    window.speechSynthesis.getVoices();
  }
};
