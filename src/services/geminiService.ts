import { GoogleGenAI } from "@google/genai";

export const getBotChatResponse = async (
  botName: string,
  playerName: string,
  recentChat: string,
  multiplier: number,
  isGameEvent: boolean = false
): Promise<string | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    let contents = `The human player (${playerName}) just said: "${recentChat}". Reply to them.`;
    if (isGameEvent) {
      contents = `Game Event: ${playerName} just did something big: "${recentChat}". React to this!`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents,
      config: {
        systemInstruction: `You are ${botName}, a member of the K-pop girl group (G)I-DLE. You are currently playing a casual card game called 'Gan Deng Yan' (干瞪眼) with ${playerName} and other members. The current game multiplier is x${multiplier}.
Keep your response EXTREMELY short (1-2 short sentences max, or just a few words). Be playful, competitive, or cute depending on your persona. Use emojis. Speak mainly in Chinese (you can mix in simple Korean like 欧巴, 欧尼, 哈哈, 哎一古). Do not use quotes around your response.`,
        temperature: 0.9,
      },
    });
    return response.text || null;
  } catch (error) {
    console.error("Gemini API error:", error);
    return null;
  }
};
