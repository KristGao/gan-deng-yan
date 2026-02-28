// Voice synthesis for card playing and game actions
// Uses Web Speech API with poker terminology in Mandarin Chinese

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

// Rank number mapping for poker terms
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

// Get rank from card label
const getRank = (cardLabel: string): string => {
  if (cardLabel === "JOKER") return "大王";
  if (cardLabel === "joker") return "小王";
  return cardLabel.slice(1);
};

// Get suit from card label
const getSuit = (cardLabel: string): string => {
  if (cardLabel === "JOKER" || cardLabel === "joker") return "";
  return cardLabel.slice(0, 1);
};

// Get Chinese name for a single card
export const getCardVoiceName = (cardLabel: string): string => {
  if (cardLabel === "JOKER") return "大王";
  if (cardLabel === "joker") return "小王";

  const suit = cardLabel.slice(0, 1);
  const rank = cardLabel.slice(1);

  const suitName = CARD_NAMES[suit] || "";
  const rankName = CARD_NAMES[rank] || rank;

  return suitName + rankName;
};

// Analyze cards and return poker voice text
const analyzeCardsForVoice = (cardLabels: string[]): string => {
  const count = cardLabels.length;
  
  // Handle jokers
  const hasSmallJoker = cardLabels.includes("joker");
  const hasBigJoker = cardLabels.includes("JOKER");
  
  if (hasSmallJoker && hasBigJoker) {
    return "王炸！";
  }
  
  // Get ranks (excluding jokers for analysis)
  const normalCards = cardLabels.filter(c => c !== "joker" && c !== "JOKER");
  const ranks = normalCards.map(getRank);
  
  // Check if all same rank (pair, three, four of a kind)
  const uniqueRanks = [...new Set(ranks)];
  
  if (uniqueRanks.length === 1 && normalCards.length > 0) {
    const rank = uniqueRanks[0];
    const rankName = RANK_NUMBERS[rank] || rank;
    
    if (count === 2) {
      return `对${rankName}`;
    } else if (count === 3) {
      return `三个${rankName}`;
    } else if (count === 4) {
      return `炸弹！${rankName}炸弹！`;
    }
  }
  
  // Check for straight (all consecutive ranks)
  if (count >= 3 && uniqueRanks.length === count) {
    const rankValues: Record<string, number> = {
      "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
      "J": 11, "Q": 12, "K": 13, "A": 14
    };
    
    const values = ranks.map(r => rankValues[r] || 0).filter(v => v > 0).sort((a, b) => a - b);
    
    // Check if consecutive
    let isConsecutive = true;
    for (let i = 1; i < values.length; i++) {
      if (values[i] - values[i-1] !== 1) {
        isConsecutive = false;
        break;
      }
    }
    
    if (isConsecutive && values.length === count) {
      // Read as straight: "3到5顺子" or just the numbers
      const startRank = RANK_NUMBERS[ranks.find(r => rankValues[r] === values[0])!] || "";
      const endRank = RANK_NUMBERS[ranks.find(r => rankValues[r] === values[values.length - 1])!] || "";
      
      if (count === 3) {
        return `${startRank}${endRank}顺子`;
      } else {
        return `${startRank}到${endRank}顺子`;
      }
    }
  }
  
  // Default: read each card individually
  return cardLabels.map(getCardVoiceName).join("，");
};

// Available voices cache
let maleVoice: SpeechSynthesisVoice | null = null;
let femaleVoice: SpeechSynthesisVoice | null = null;
let voicesInitialized = false;

// Initialize and cache voices - prefer Mandarin Chinese (zh-CN)
export const initVoices = () => {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    console.warn("Speech synthesis not supported");
    return;
  }

  const loadVoices = () => {
    const voices = window.speechSynthesis.getVoices();
    console.log("Available voices:", voices.map(v => `${v.name} (${v.lang})`));
    
    // Priority: zh-CN (Mandarin) > zh > zh-HK > zh-TW
    const mandarinVoices = voices.filter(v => v.lang === "zh-CN");
    const chineseVoices = voices.filter(v => v.lang.startsWith("zh"));
    
    // Use Mandarin voices first
    const targetVoices = mandarinVoices.length > 0 ? mandarinVoices : chineseVoices;

    if (targetVoices.length > 0) {
      // Prefer Microsoft voices for better quality
      maleVoice = targetVoices.find(v => 
        v.name.includes("Yunxi") || v.name.includes("Kangkang") || 
        v.name.toLowerCase().includes("male") || v.name.includes("男")
      ) || targetVoices[0];
      
      femaleVoice = targetVoices.find(v => 
        v.name.includes("Xiaoxiao") || v.name.includes("Yaoyao") || 
        v.name.includes("Huihui") || v.name.toLowerCase().includes("female") ||
        v.name.includes("女")
      ) || targetVoices.find(v => v !== maleVoice) || targetVoices[0];
      
      voicesInitialized = true;
      console.log("Mandarin voices loaded:", { male: maleVoice?.name, female: femaleVoice?.name });
    } else if (voices.length > 0) {
      // Fallback to any available voice
      maleVoice = voices[0];
      femaleVoice = voices[0];
      voicesInitialized = true;
      console.log("Fallback voice loaded:", voices[0]?.name);
    }
  };

  // Load voices immediately if available
  loadVoices();
  
  // Also listen for voices changed event
  window.speechSynthesis.onvoiceschanged = loadVoices;
  
  // Force load voices after delays
  setTimeout(loadVoices, 100);
  setTimeout(loadVoices, 500);
  setTimeout(loadVoices, 1000);
};

// Get voice based on gender
const getVoice = (gender: Gender): SpeechSynthesisVoice | null => {
  return gender === "male" ? maleVoice : femaleVoice;
};

// Speak text with improved settings
const speak = (text: string, gender: Gender = "male") => {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    console.warn("Speech synthesis not available");
    return;
  }

  // Cancel any ongoing speech first
  window.speechSynthesis.cancel();

  // Small delay to ensure cancel takes effect
  setTimeout(() => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN"; // Force Mandarin Chinese
    utterance.rate = 1.0;
    utterance.pitch = gender === "female" ? 1.15 : 0.95;
    utterance.volume = 1.0;

    // Set voice if available
    const voice = getVoice(gender);
    if (voice) {
      utterance.voice = voice;
      console.log(`Speaking "${text}" with voice: ${voice.name}`);
    } else {
      console.log(`Speaking "${text}" with default voice`);
    }

    // Add event listeners for debugging
    utterance.onstart = () => console.log("Speech started");
    utterance.onend = () => console.log("Speech ended");
    utterance.onerror = (e) => console.error("Speech error:", e);

    window.speechSynthesis.speak(utterance);
  }, 50);
};

// Play voice for playing cards with poker terminology
export const playCardVoice = (cardLabels: string[], gender: Gender = "male") => {
  // Ensure voices are initialized
  if (!voicesInitialized) {
    initVoices();
  }
  
  const voiceText = analyzeCardsForVoice(cardLabels);
  console.log("Playing card voice:", voiceText, "gender:", gender);
  speak(voiceText, gender);
};

// Play "pass" voice (要不起)
export const playPassVoice = (gender: Gender = "male") => {
  if (!voicesInitialized) {
    initVoices();
  }
  
  const passPhrases = ["要不起", "不要", "过"];
  const randomPhrase = passPhrases[Math.floor(Math.random() * passPhrases.length)];
  console.log("Playing pass voice:", randomPhrase, "gender:", gender);
  speak(randomPhrase, gender);
};

// Play bomb voice
export const playBombVoice = (gender: Gender = "male") => {
  if (!voicesInitialized) {
    initVoices();
  }
  
  console.log("Playing bomb voice, gender:", gender);
  speak("炸弹！", gender);
};

// Play win voice
export const playWinVoice = (playerName: string, gender: Gender = "male") => {
  if (!voicesInitialized) {
    initVoices();
  }
  
  console.log("Playing win voice:", playerName, "gender:", gender);
  speak(`${playerName}赢了！`, gender);
};

// Clear speech queue
export const clearSpeechQueue = () => {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
};
