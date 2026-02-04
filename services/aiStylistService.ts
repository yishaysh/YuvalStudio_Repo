
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

export const aiStylistService = {
  async analyzeEar(cleanBase64: string): Promise<string> {
    // API Key from environment variable as per system requirements
    const API_KEY = process.env.API_KEY;

    if (!API_KEY) {
      console.error("API Key missing");
      throw new Error('חסר מפתח API. אנא וודא שהגדרת את process.env.API_KEY');
    }

    const ai = new GoogleGenAI({ apiKey: API_KEY });

    const prompt = `You are a professional piercing stylist. Analyze the provided image of a human ear.
     * Identify any existing piercings.
     * Based on the unique anatomy of the ear (helix, tragus, conch, etc.), suggest 3-4 specific styling additions.
     * For each suggestion, describe the jewelry type (e.g., '14k Gold Clicker for the Daith').
     * Keep the tone professional, encouraging, and luxurious.
     * Provide the response in Hebrew, formatted as a bulleted list.`;

    try {
      // Using gemini-3-flash-preview for multimodal capabilities (Image + Text)
      // This resolves the 404 error associated with deprecated 1.5-flash models
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
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
          throw new Error("מפתח API לא תקין או חסר.");
      }
      // Handle model not found or other API errors gracefully
      if (error.message && error.message.includes('404')) {
          throw new Error("המודל אינו זמין כרגע. אנא נסה שוב מאוחר יותר.");
      }
      throw new Error("נכשלנו בניתוח התמונה. אנא וודא שהתמונה ברורה ונסה שנית.");
    }
  },
};
