// Voice synthesis for card playing and game actions
// Uses multiple TTS providers for natural sounding voice

export type Gender = "male" | "female";

// Card name mapping for Chinese
const CARD_NAMES: Record<string, string> = {
  "♠": "黑桃",
  "♥": "红桃",
  "♣": "梅花",
  "♦": "方块",
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
  "joker": "小王",
  "JOKER": "大王",
};

const RANK_NUMBERS: Record<string, string> = {
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

const getRank = (cardLabel: string): string => {
  if (cardLabel === "JOKER") return "大王";
  if (cardLabel === "joker") return "小王";
  return cardLabel.slice(1);
};

export const getCardVoiceName = (cardLabel: string): string => {
  if (cardLabel === "JOKER") return "大王";
  if (cardLabel === "joker") return "小王";
  const suit = cardLabel.slice(0, 1);
  const rank = cardLabel.slice(1);
  const suitName = CARD_NAMES[suit] || "";
  const rankName = CARD_NAMES[rank] || rank;
  return suitName + rankName;
};

const analyzeCardsForVoice = (cardLabels: string[]): string => {
  const count = cardLabels.length;
  const hasSmallJoker = cardLabels.includes("joker");
  const hasBigJoker = cardLabels.includes("JOKER");
  
  if (hasSmallJoker && hasBigJoker) {
    return "王炸！";
  }
  
  const normalCards = cardLabels.filter(c => c !== "joker" && c !== "JOKER");
  const ranks = normalCards.map(getRank);
  const uniqueRanks = [...new Set(ranks)];
  
  if (uniqueRanks.length === 1 && normalCards.length > 0) {
    const rank = uniqueRanks[0];
    const rankName = RANK_NUMBERS[rank] || rank;
    if (count === 2) return `对${rankName}`;
    if (count === 3) return `三个${rankName}`;
    if (count === 4) return `炸弹！${rankName}炸弹！`;
  }
  
  if (count >= 3 && uniqueRanks.length === count) {
    const rankValues: Record<string, number> = {
      "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
      "J": 11, "Q": 12, "K": 13, "A": 14
    };
    const values = ranks.map(r => rankValues[r] || 0).filter(v => v > 0).sort((a, b) => a - b);
    let isConsecutive = true;
    for (let i = 1; i < values.length; i++) {
      if (values[i] - values[i-1] !== 1) {
        isConsecutive = false;
        break;
      }
    }
    if (isConsecutive && values.length === count) {
      const startRank = RANK_NUMBERS[ranks.find(r => rankValues[r] === values[0])!] || "";
      const endRank = RANK_NUMBERS[ranks.find(r => rankValues[r] === values[values.length - 1])!] || "";
      if (count === 3) return `${startRank}${endRank}顺子`;
      return `${startRank}到${endRank}顺子`;
    }
  }
  
  return cardLabels.map(getCardVoiceName).join("，");
};

// Audio context for playing TTS audio
let audioContext: AudioContext | null = null;

// Get or create audio context
const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

// Play audio from base64 or URL
const playAudioFromUrl = async (url: string): Promise<void> => {
  try {
    const audio = new Audio(url);
    audio.volume = 1.0;
    await audio.play();
  } catch (e) {
    console.warn("Audio playback failed:", e);
  }
};

// Use Baidu TTS (free, no API key needed for basic usage)
const speakWithBaiduTTS = async (text: string, gender: Gender): Promise<boolean> => {
  try {
    // Baidu TTS parameters
    const per = gender === "female" ? "0" : "1"; // 0=female, 1=male
    const url = `https://tts.baidu.com/text2audio?tex=${encodeURIComponent(text)}&cuid=baike&lan=zh&ctp=1&pdt=301&vol=9&rate=32&per=${per}`;
    await playAudioFromUrl(url);
    return true;
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

// Main speak function - tries Baidu TTS first, falls back to Web Speech
const speak = async (text: string, gender: Gender = "male") => {
  console.log(`Speaking: "${text}" (${gender})`);
  
  // Try Baidu TTS first (better quality)
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
