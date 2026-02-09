
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
      throw new Error('חסר מפתח API. אנא הגדר את VITE_GEMINI_API_KEY בלוח הבקרה של Vercel או בקובץ ה-.env.');
    }

    // Explicitly target v1 to avoid v1beta 404 issues
    const tryDirectV1 = async (modelName: string) => {
      console.log(`Attempting direct v1 API call with ${modelName}...`);
      const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${API_KEY}`;

      const body = {
        contents: [{
          parts: [
            { text: this.getPrompt() },
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error(`Direct V1 Error (${modelName}):`, errData);
        throw new Error(errData.error?.message || `API error ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) throw new Error("Empty response from AI");
      return this.parseResponse(text);
    };

    try {
      // Try gemini-1.5-flash first (most common)
      return await tryDirectV1("gemini-1.5-flash");
    } catch (e1: any) {
      console.warn("Flash failed, trying Flash-8B on v1...", e1.message);
      try {
        // Try flash-8b as fallback on v1
        return await tryDirectV1("gemini-1.5-flash-8b");
      } catch (e2: any) {
        console.error("All direct v1 calls failed. Falling back to SDK with explicit v1 config...");

        try {
          const genAI = new GoogleGenerativeAI(API_KEY);
          // Explicitly set apiVersion to 'v1' in the model options
          const model = genAI.getGenerativeModel(
            { model: "gemini-1.5-flash" },
            { apiVersion: "v1" }
          );

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
          return this.parseResponse(response.text());
        } catch (sdkError: any) {
          console.error("SDK Fallback also failed:", sdkError);

          if (sdkError.message?.includes('API key') || sdkError.message?.includes('403')) {
            throw new Error("מפתח API לא תקין או חסר.");
          }

          throw new Error(`שגיאה בניתוח (v1): ${sdkError.message || "לא הצלחנו ליצור קשר עם ה-AI"}`);
        }
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
    // Robust JSON extraction
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      text = jsonMatch[0];
    }

    try {
      return JSON.parse(text) as AIAnalysisResult;
    } catch (e) {
      console.error("JSON Parse Error:", text);
      throw new Error("תוצאת ה-AI אינה תקינה. אנא נסה שוב.");
    }
  }
};
