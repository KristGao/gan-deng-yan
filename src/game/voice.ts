// Voice synthesis for card playing and game actions

export type Gender = "male" | "female";

// Card name mapping for Chinese
// Label format: "3", "4", ..., "10", "J", "Q", "K", "A", "2", "BJ", "RJ"
const CARD_NAMES: Record<string, string> = {
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
  "BJ": "小王",
  "RJ": "大王",
};

// Rank mapping for poker terms (pairs, straights, etc.)
const RANK_NAMES: Record<string, string> = {
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
};

// Get Chinese name for a single card
export const getCardVoiceName = (label: string): string => {
  return CARD_NAMES[label] || label;
};

// Analyze cards and return poker voice text
const analyzeCardsForVoice = (cardLabels: string[]): string => {
  const count = cardLabels.length;
  
  // Handle jokers - check for both BJ and RJ
  const hasSmallJoker = cardLabels.includes("BJ");
  const hasBigJoker = cardLabels.includes("RJ");
  
  if (hasSmallJoker && hasBigJoker) {
    return "王炸！";
  }
  
  // Get ranks (excluding jokers for analysis)
  const normalCards = cardLabels.filter(c => c !== "BJ" && c !== "RJ");
  const uniqueRanks = [...new Set(normalCards)];
  
  // Check if all same rank (pair, three, four of a kind)
  if (uniqueRanks.length === 1 && normalCards.length > 0) {
    const rank = uniqueRanks[0];
    const rankName = RANK_NAMES[rank] || rank;
    
    if (count === 2) return `对${rankName}`;
    if (count === 3) return `三个${rankName}`;
    if (count === 4) return `炸弹！${rankName}炸弹！`;
  }
  
  // Check for straight (all consecutive ranks)
  if (count >= 3 && uniqueRanks.length === count) {
    const rankValues: Record<string, number> = {
      "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
      "J": 11, "Q": 12, "K": 13, "A": 14
    };
    
    const values = normalCards.map(r => rankValues[r] || 0).filter(v => v > 0).sort((a, b) => a - b);
    
    // Check if consecutive
    let isConsecutive = true;
    for (let i = 1; i < values.length; i++) {
      if (values[i] - values[i-1] !== 1) {
        isConsecutive = false;
        break;
      }
    }
    
    if (isConsecutive && values.length === count) {
      const startRank = RANK_NAMES[normalCards.find(r => rankValues[r] === values[0])!] || "";
      const endRank = RANK_NAMES[normalCards.find(r => rankValues[r] === values[values.length - 1])!] || "";
      
      if (count === 3) return `${startRank}${endRank}顺子`;
      return `${startRank}到${endRank}顺子`;
    }
  }
  
  // Default: read each card individually
  return cardLabels.map(getCardVoiceName).join("，");
};

// Voice state
let voicesInitialized = false;
let cachedVoices: SpeechSynthesisVoice[] = [];

// Sound enabled state (persisted to localStorage)
const SOUND_ENABLED_KEY = "gan-deng-yan-sound-enabled";

export const isSoundEnabled = (): boolean => {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(SOUND_ENABLED_KEY);
  return stored === null ? true : stored === "true";
};

export const setSoundEnabled = (enabled: boolean): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
  if (!enabled) {
    clearSpeechQueue();
  }
};

export const toggleSound = (): boolean => {
  const newState = !isSoundEnabled();
  setSoundEnabled(newState);
  return newState;
};

// Initialize voices
export const initVoices = () => {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }

  const loadVoices = () => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      cachedVoices = voices;
      voicesInitialized = true;
    }
  };

  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
  
  setTimeout(loadVoices, 100);
  setTimeout(loadVoices, 500);
  setTimeout(loadVoices, 1000);
};

// Speak using Web Speech API
const speakWithWebSpeech = (text: string, gender: Gender): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve(false);
      return;
    }

    // Check if sound is enabled
    if (!isSoundEnabled()) {
      resolve(true);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN";
    utterance.rate = 0.9;
    utterance.pitch = gender === "female" ? 1.15 : 0.85;
    utterance.volume = 1.0;

    const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
    const chineseVoices = voices.filter(v => 
      v.lang === "zh-CN" || 
      v.lang === "zh-TW" || 
      v.lang.startsWith("zh")
    );
    
    if (chineseVoices.length > 0) {
      let selectedVoice: SpeechSynthesisVoice | undefined;
      
      if (gender === "female") {
        selectedVoice = chineseVoices.find(v => 
          v.name.toLowerCase().includes("female") || 
          v.name.toLowerCase().includes("女") ||
          v.name.toLowerCase().includes("xiaoxiao") ||
          v.name.toLowerCase().includes("xiaoyan") ||
          v.name.toLowerCase().includes("tingting")
        );
      } else {
        selectedVoice = chineseVoices.find(v => 
          v.name.toLowerCase().includes("male") || 
          v.name.toLowerCase().includes("男") ||
          v.name.toLowerCase().includes("yunxi") ||
          v.name.toLowerCase().includes("yunjian")
        );
      }
      
      if (!selectedVoice) {
        selectedVoice = chineseVoices[0];
      }
      
      utterance.voice = selectedVoice;
    }

    utterance.onend = () => resolve(true);
    utterance.onerror = () => resolve(false);

    setTimeout(() => {
      try {
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        resolve(false);
      }
    }, 50);
  });
};

// Main speak function
const speak = async (text: string, gender: Gender = "male") => {
  // Check if sound is enabled
  if (!isSoundEnabled()) {
    return;
  }
  
  if (!voicesInitialized) {
    initVoices();
    await new Promise(r => setTimeout(r, 200));
  }
  
  await speakWithWebSpeech(text, gender);
};

// Play voice for playing cards
export const playCardVoice = (cardLabels: string[], gender: Gender = "male") => {
  if (!isSoundEnabled()) return;
  const voiceText = analyzeCardsForVoice(cardLabels);
  speak(voiceText, gender);
};

// Play "pass" voice
export const playPassVoice = (gender: Gender = "male") => {
  if (!isSoundEnabled()) return;
  const phrases = ["要不起", "不要", "过"];
  speak(phrases[Math.floor(Math.random() * phrases.length)], gender);
};

// Play bomb voice
export const playBombVoice = (gender: Gender = "male") => {
  if (!isSoundEnabled()) return;
  speak("炸弹！", gender);
};

// Play win voice
export const playWinVoice = (playerName: string, gender: Gender = "male") => {
  if (!isSoundEnabled()) return;
  speak(`${playerName}赢了！`, gender);
};

// Clear speech queue
export const clearSpeechQueue = () => {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
};
