// Voice synthesis for card playing and game actions
// Uses multiple TTS providers for natural sounding voice

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

// Play audio from URL
const playAudioFromUrl = async (url: string): Promise<boolean> => {
  try {
    const audio = new Audio(url);
    audio.volume = 1.0;
    await audio.play();
    return true;
  } catch (e) {
    console.warn("Audio playback failed:", e);
    return false;
  }
};

// Use Baidu TTS (free, no API key needed)
const speakWithBaiduTTS = async (text: string, gender: Gender): Promise<boolean> => {
  try {
    const per = gender === "female" ? "0" : "1";
    const url = `https://tts.baidu.com/text2audio?tex=${encodeURIComponent(text)}&cuid=baike&lan=zh&ctp=1&pdt=301&vol=9&rate=32&per=${per}`;
    return await playAudioFromUrl(url);
  } catch (e) {
    console.warn("Baidu TTS failed:", e);
    return false;
  }
};

// Use Web Speech API as fallback
const speakWithWebSpeech = (text: string, gender: Gender): void => {
  if (!("speechSynthesis" in window)) {
    console.warn("Speech synthesis not supported");
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "zh-CN";
  utterance.rate = 0.95;
  utterance.pitch = gender === "female" ? 1.1 : 0.9;
  utterance.volume = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const mandarinVoices = voices.filter(v => v.lang === "zh-CN" || v.lang.startsWith("zh"));
  
  if (mandarinVoices.length > 0) {
    const voice = mandarinVoices.find(v => 
      (gender === "female" && (v.name.includes("Xiaoxiao") || v.name.includes("Female") || v.name.includes("女"))) ||
      (gender === "male" && (v.name.includes("Yunxi") || v.name.includes("Male") || v.name.includes("男")))
    ) || mandarinVoices[0];
    utterance.voice = voice;
  }

  utterance.onstart = () => console.log("Speech started:", text);
  utterance.onerror = (e) => console.error("Speech error:", e);

  setTimeout(() => {
    window.speechSynthesis.speak(utterance);
  }, 50);
};

// Voice state
let voicesInitialized = false;

// Initialize voices
export const initVoices = () => {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }

  const loadVoices = () => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      voicesInitialized = true;
      console.log("Voices loaded:", voices.filter(v => v.lang.startsWith("zh")).map(v => v.name));
    }
  };

  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
  setTimeout(loadVoices, 100);
  setTimeout(loadVoices, 500);
};

// Main speak function
const speak = async (text: string, gender: Gender = "male") => {
  console.log(`Speaking: "${text}" (${gender})`);
  
  // Try Baidu TTS first
  const success = await speakWithBaiduTTS(text, gender);
  
  // Fallback to Web Speech API
  if (!success) {
    speakWithWebSpeech(text, gender);
  }
};

// Play voice for playing cards
export const playCardVoice = (cardLabels: string[], gender: Gender = "male") => {
  if (!voicesInitialized) initVoices();
  const voiceText = analyzeCardsForVoice(cardLabels);
  speak(voiceText, gender);
};

// Play "pass" voice
export const playPassVoice = (gender: Gender = "male") => {
  if (!voicesInitialized) initVoices();
  const phrases = ["要不起", "不要", "过"];
  speak(phrases[Math.floor(Math.random() * phrases.length)], gender);
};

// Play bomb voice
export const playBombVoice = (gender: Gender = "male") => {
  if (!voicesInitialized) initVoices();
  speak("炸弹！", gender);
};

// Play win voice
export const playWinVoice = (playerName: string, gender: Gender = "male") => {
  if (!voicesInitialized) initVoices();
  speak(`${playerName}赢了！`, gender);
};

// Clear speech queue
export const clearSpeechQueue = () => {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
};
