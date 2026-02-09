
import { GoogleGenerativeAI } from "@google/generative-ai";
import { JEWELRY_CATALOG } from "../constants";

// Define the shape of the AI response for TypeScript usage in the UI
export interface AIRecommendation {
  location: string;
  jewelry_id: string; // Updated to link to catalog
  description: string;
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
}

export interface AIAnalysisResult {
  style_summary: string;
  recommendations: AIRecommendation[];
  original_image?: string;
}

export const aiStylistService = {
  async analyzeEar(cleanBase64: string): Promise<AIAnalysisResult> {
    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

    if (!API_KEY) {
      console.error("Gemini API Key missing");
      throw new Error('חסר מפתח API. אנא הגדר את VITE_GEMINI_API_KEY בקובץ ה-.env שלך או בלוח הבקרה של Vercel.');
    }

    // Direct fetch fallback targeting v1 version explicitly
    // This is the most reliable way to bypass SDK's internal v1beta defaults
    const tryDirectV1 = async () => {
      const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

      const prompt = this.getPrompt();

      const body = {
        contents: [{
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: cleanBase64,
              }
            }
          ]
        }]
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errData = await response.json();
        console.error("Direct V1 Error:", errData);
        throw new Error(errData.error?.message || "Direct API call failed");
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) throw new Error("Empty response from direct v1 API");

      return this.parseResponse(text);
    };

    try {
      // Attempt 1: Direct V1 call (Highest reliability for version control)
      console.log("Attempting direct v1 API call...");
      return await tryDirectV1();
    } catch (apiError: any) {
      console.warn("Direct v1 call failed, trying SDK as fallback...", apiError.message);

      // Attempt 2: SDK with a different model variation (8b is often more resilient on some keys)
      try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" });

        const result = await model.generateContent([
          this.getPrompt(),
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64,
            },
          },
        ]);

        const response = await result.response;
        const text = response.text();
        return this.parseResponse(text);
      } catch (sdkError: any) {
        console.error("Both direct and SDK calls failed:", sdkError);

        if (sdkError.message?.includes('API key') || sdkError.message?.includes('403')) {
          throw new Error("מפתח API לא תקין או חסר.");
        }

        throw new Error(`שגיאה בניתוח: ${sdkError.message || "נכשלנו בניתוח התמונה."}`);
      }
    }
  },

  getPrompt() {
    const catalogString = JEWELRY_CATALOG.map(j =>
      `ID: ${j.id}, Name: ${j.name}, Type: ${j.category}, Suitable for: ${j.allowed_locations?.join(', ')}`
    ).join('\n');

    return `You are a professional piercing stylist. Analyze this ear image.
    
    CATALOG OF AVAILABLE JEWELRY:
    ${catalogString}

    Task:
    1. Identify anatomical opportunities for piercing on this specific ear.
    2. Suggest 3-4 specific styling additions using ONLY items from the provided catalog.
    3. Return X/Y coordinates (0-100 scale) for where the jewelry should be placed on the image.
    4. Provide descriptions in Hebrew.

    RESPONSE FORMAT:
    You MUST return a valid JSON object with the following structure:
    {
      "style_summary": "Short luxurious title in Hebrew",
      "recommendations": [
        {
          "location": "Helix",
          "jewelry_id": "ID_FROM_CATALOG",
          "description": "Explanation in Hebrew",
          "x": 50,
          "y": 50
        }
      ]
    }
    Return ONLY the JSON object, no other text.`;
  },

  parseResponse(text: string): AIAnalysisResult {
    if (!text) throw new Error("Empty response from AI");

    // Robust JSON extraction
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      text = jsonMatch[0];
    }

    try {
      return JSON.parse(text) as AIAnalysisResult;
    } catch (e) {
      console.error("Failed to parse AI response:", text);
      throw new Error("תוצאת ה-AI אינה תקינה. אנא נסה שוב.");
    }
  }
};
