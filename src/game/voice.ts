// Voice synthesis for card playing and game actions
// Uses Edge TTS for more natural sounding voices

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
  "joker": "小王",
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

// Audio cache to prevent reloading
const audioCache: Map<string, HTMLAudioElement> = new Map();

// Create audio element with caching
const getAudio = (url: string): HTMLAudioElement => {
  if (!audioCache.has(url)) {
    const audio = new Audio(url);
    audioCache.set(url, audio);
  }
  return audioCache.get(url)!;
};

// Generate TTS URL using Edge TTS service
const generateTTSUrl = (text: string, gender: Gender): string => {
  // Use Edge TTS demo service
  // Male voice: zh-CN-YunxiNeural (male, natural)
  // Female voice: zh-CN-XiaoxiaoNeural (female, natural)
  const voice = gender === "male" 
    ? "zh-CN-YunxiNeural" 
    : "zh-CN-XiaoxiaoNeural";
  
  // Using a free TTS API service
  const encodedText = encodeURIComponent(text);
  return `https://api.tts.quest/v1/edge-tts?text=${encodedText}&voice=${voice}`;
};

// Alternative: Use Google Translate TTS (limited but reliable)
const generateGoogleTTSUrl = (text: string): string => {
  const encodedText = encodeURIComponent(text);
  return `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=zh-CN&client=tw-ob`;
};

// Play audio with fallback
const playAudio = async (url: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const audio = getAudio(url);
    audio.currentTime = 0;
    
    audio.onended = () => resolve();
    audio.onerror = () => reject(new Error("Audio playback failed"));
    
    // Try to play
    audio.play().catch((err) => {
      console.warn("Audio play failed:", err);
      reject(err);
    });
  });
};

// Queue for sequential audio playback
let audioQueue: Promise<void> = Promise.resolve();

// Queue audio playback
const queueAudio = (url: string): void => {
  audioQueue = audioQueue.then(() => playAudio(url)).catch(() => {});
};

// Play voice for playing cards using real TTS
export const playCardVoice = (cardLabels: string[], gender: Gender = "male") => {
  const cardNames = cardLabels.map(getCardVoiceName).join("，");
  
  // Use Google TTS for more reliable playback
  const url = generateGoogleTTSUrl(cardNames);
  queueAudio(url);
};

// Play "pass" voice (要不起)
export const playPassVoice = (gender: Gender = "male") => {
  const passPhrases = ["要不起", "不要", "过"];
  const randomPhrase = passPhrases[Math.floor(Math.random() * passPhrases.length)];
  
  const url = generateGoogleTTSUrl(randomPhrase);
  queueAudio(url);
};

// Play bomb voice
export const playBombVoice = (gender: Gender = "male") => {
  const url = generateGoogleTTSUrl("炸弹！");
  queueAudio(url);
};

// Play win voice
export const playWinVoice = (playerName: string, gender: Gender = "male") => {
  const url = generateGoogleTTSUrl(`${playerName}赢了！`);
  queueAudio(url);
};

// Initialize voices (pre-load if needed)
export const initVoices = () => {
  // Pre-load common sounds if needed
  console.log("Voice system initialized");
};

// Clear audio cache
export const clearAudioCache = () => {
  audioCache.clear();
  audioQueue = Promise.resolve();
};
