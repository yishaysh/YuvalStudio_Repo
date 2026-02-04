
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

export const aiStylistService = {
  async analyzeEar(cleanBase64: string): Promise<string> {
    // --- API KEY CONFIGURATION ---
    const API_KEY = "AIzaSyCqBjk-ra-8HePt4_sn-fHqCNOkTJ7ap94";

    if (!API_KEY) {
      throw new Error('חסר מפתח API.');
    }

    // Initialize the SDK
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    const prompt = `You are a professional piercing stylist. Analyze the provided image of a human ear.
     * Identify any existing piercings.
     * Based on the unique anatomy of the ear (helix, tragus, conch, etc.), suggest 3-4 specific styling additions.
     * For each suggestion, describe the jewelry type (e.g., '14k Gold Clicker for the Daith').
     * Keep the tone professional, encouraging, and luxurious.
     * Provide the response in Hebrew, formatted as a bulleted list.`;

    try {
      // The image is already compressed and stripped of the prefix by the caller (Booking.tsx)
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: cleanBase64,
                },
              },
            ],
          },
        ],
      });

      return response.text || "לא הצלחנו להפיק המלצה כרגע.";
    } catch (error: any) {
      console.error("Gemini Analysis Error:", error);
      if (error.message && (error.message.includes('API key') || error.message.includes('403'))) {
          throw new Error("מפתח API לא תקין.");
      }
      throw new Error("נכשלנו בניתוח התמונה. אנא וודא שהתמונה ברורה ונסה שנית.");
    }
  },
};
