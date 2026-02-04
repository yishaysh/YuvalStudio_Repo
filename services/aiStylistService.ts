
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

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
      // Return base64 without the mime prefix (clean string)
      resolve(canvas.toDataURL("image/jpeg", 0.7).split(",")[1]);
    };
  });
};

export const aiStylistService = {
  async analyzeEar(imageBase64: string): Promise<string> {
    // --- API KEY CONFIGURATION ---
    // Defined as a constant string for direct use
    const API_KEY = "AIzaSyCqBjk-ra-8HePt4_sn-fHqCNOkTJ7ap94";

    if (!API_KEY) {
      throw new Error('חסר מפתח API.');
    }

    // Initialize the SDK
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    
    // Compress and clean the image (removes data:image/jpeg;base64 prefix)
    const compressedBase64 = await compressImage(imageBase64);

    const prompt = `You are a professional piercing stylist. Analyze the provided image of a human ear.
     * Identify any existing piercings.
     * Based on the unique anatomy of the ear (helix, tragus, conch, etc.), suggest 3-4 specific styling additions.
     * For each suggestion, describe the jewelry type (e.g., '14k Gold Clicker for the Daith').
     * Keep the tone professional, encouraging, and luxurious.
     * Provide the response in Hebrew, formatted as a bulleted list.`;

    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-1.5-flash",
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
    } catch (error: any) {
      console.error("Gemini Analysis Error:", error);
      if (error.message && (error.message.includes('API key') || error.message.includes('403'))) {
          throw new Error("מפתח API לא תקין.");
      }
      throw new Error("נכשלנו בניתוח התמונה. אנא וודא שהתמונה ברורה ונסה שנית.");
    }
  },
};
