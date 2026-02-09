
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
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

    const genAI = new GoogleGenerativeAI(API_KEY);

    // Prepare catalog string for the prompt
    const catalogString = JEWELRY_CATALOG.map(j =>
      `ID: ${j.id}, Name: ${j.name}, Type: ${j.category}, Suitable for: ${j.allowed_locations?.join(', ')}`
    ).join('\n');

    // We will ask for JSON in the prompt instead of using responseSchema
    // to avoid the v1beta requirement which seems to be failing for this API key.

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash"
    });

    const prompt = `You are a professional piercing stylist. Analyze this ear image.
    
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
    Return ONLY the JSON object, no other text.
    `;

    try {
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: cleanBase64,
          },
        },
      ]);

      const response = await result.response;
      let text = response.text();

      if (!text) throw new Error("Empty response from AI");

      // Robust JSON extraction
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        text = jsonMatch[0];
      }

      // Parse JSON output
      return JSON.parse(text) as AIAnalysisResult;
    } catch (error: any) {
      console.error("Gemini Analysis Error:", error);
      if (error.message && (error.message.includes('API key') || error.message.includes('403'))) {
        throw new Error("מפתח API לא תקין או חסר.");
      }
      if (error.message && (error.message.includes('404') || error.message.includes('not found'))) {
        // Fallback or retry with -latest if needed, but standard name should work with official lib
        throw new Error("דגם ה-AI לא נמצא. אנא וודא שהמפתח תומך ב-Gemini 1.5 Flash.");
      }
      throw new Error("נכשלנו בניתוח התמונה. אנא וודא שהתמונה ברורה וסגנון המצלמה תקין.");
    }
  },
};
