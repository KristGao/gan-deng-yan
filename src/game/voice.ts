// Voice synthesis for card playing and game actions
// Uses Web Speech API with improved settings for more natural voice

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

// Available voices cache
let maleVoice: SpeechSynthesisVoice | null = null;
let femaleVoice: SpeechSynthesisVoice | null = null;
let voicesLoaded = false;

// Initialize and cache voices
export const initVoices = () => {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    console.warn("Speech synthesis not supported");
    return;
  }

  const loadVoices = () => {
    const voices = window.speechSynthesis.getVoices();
    
    // Find Chinese voices
    const chineseVoices = voices.filter(
      (v) => v.lang.includes("zh") || v.lang.includes("CN") || v.lang.includes("HK") || v.lang.includes("TW")
    );

    if (chineseVoices.length > 0) {
      // Prefer Microsoft or Google voices for better quality
      maleVoice = chineseVoices.find(v => 
        v.name.includes("Yunxi") || v.name.includes("Kangkang") || v.name.includes("Male")
      ) || chineseVoices[0];
      
      femaleVoice = chineseVoices.find(v => 
        v.name.includes("Xiaoxiao") || v.name.includes("Yaoyao") || v.name.includes("Huihui") || v.name.includes("Female")
      ) || chineseVoices[0];
      
      voicesLoaded = true;
      console.log("Voices loaded:", { male: maleVoice?.name, female: femaleVoice?.name });
    }
  };

  // Load voices immediately if available
  loadVoices();
  
  // Also listen for voices changed event
  window.speechSynthesis.onvoiceschanged = loadVoices;
};

// Get voice based on gender
const getVoice = (gender: Gender): SpeechSynthesisVoice | null => {
  return gender === "male" ? maleVoice : femaleVoice;
};

// Queue for sequential speech
let speechQueue: Promise<void> = Promise.resolve();

// Speak text with improved settings
const speak = (text: string, gender: Gender = "male") => {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "zh-CN";
  utterance.rate = 1.1; // Slightly faster for more natural feel
  utterance.pitch = gender === "female" ? 1.15 : 0.95; // More distinct gender difference
  utterance.volume = 1.0;

  // Set voice if available
  const voice = getVoice(gender);
  if (voice) {
    utterance.voice = voice;
  }

  // Queue the speech
  const speakPromise = new Promise<void>((resolve) => {
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve(); // Resolve even on error to continue queue
    
    // Some browsers need a small delay between speeches
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 50);
  });

  speechQueue = speechQueue.then(() => speakPromise);
};

// Play voice for playing cards
export const playCardVoice = (cardLabels: string[], gender: Gender = "male") => {
  // Ensure voices are loaded
  if (!voicesLoaded) {
    initVoices();
  }
  
  const cardNames = cardLabels.map(getCardVoiceName).join("，");
  speak(cardNames, gender);
};

// Play "pass" voice (要不起)
export const playPassVoice = (gender: Gender = "male") => {
  if (!voicesLoaded) {
    initVoices();
  }
  
  const passPhrases = ["要不起", "不要", "过"];
  const randomPhrase = passPhrases[Math.floor(Math.random() * passPhrases.length)];
  speak(randomPhrase, gender);
};

// Play bomb voice
export const playBombVoice = (gender: Gender = "male") => {
  if (!voicesLoaded) {
    initVoices();
  }
  
  speak("炸弹！", gender);
};

// Play win voice
export const playWinVoice = (playerName: string, gender: Gender = "male") => {
  if (!voicesLoaded) {
    initVoices();
  }
  
  speak(`${playerName}赢了！`, gender);
};

// Clear speech queue
export const clearSpeechQueue = () => {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  speechQueue = Promise.resolve();
};
