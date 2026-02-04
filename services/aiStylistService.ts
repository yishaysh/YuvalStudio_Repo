
import { GoogleGenAI } from "@google/genai";

// Placeholder for the API Key - user will insert their key
const API_KEY = "YOUR_GEMINI_API_KEY_HERE";

/**
 * Optimizes the image before sending to API to reduce payload size
 */
const compressImage = (base64Str: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const MAX_WIDTH = 800;
      const MAX_HEIGHT = 800;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.7).split(",")[1]);
    };
  });
};

export const aiStylistService = {
  async analyzeEar(imageBase64: string): Promise<string> {
    if (API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
      throw new Error("API Key not configured");
    }

    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const compressedBase64 = await compressImage(imageBase64);

    const prompt = `You are a professional piercing stylist. Analyze the provided image of a human ear.
     * Identify any existing piercings.
     * Based on the unique anatomy of the ear (helix, tragus, conch, etc.), suggest 3-4 specific styling additions.
     * For each suggestion, describe the jewelry type (e.g., '14k Gold Clicker for the Daith').
     * Keep the tone professional, encouraging, and luxurious.
     * Provide the response in Hebrew, formatted as a bulleted list.`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: compressedBase64,
                },
              },
            ],
          },
        ],
      });

      return response.text || "לא הצלחנו להפיק המלצה כרגע.";
    } catch (error) {
      console.error("Gemini Analysis Error:", error);
      throw new Error("נכשלנו בניתוח התמונה. אנא נסה שנית או דלג.");
    }
  },
};
