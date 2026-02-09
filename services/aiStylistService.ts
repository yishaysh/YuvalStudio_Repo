
import { GoogleGenAI, Type } from "@google/genai";
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
      throw new Error('מפתח API חסר. אנא הגדר VITE_GEMINI_API_KEY.');
    }

    const ai = new GoogleGenAI({ apiKey: API_KEY });

    const catalogString = JEWELRY_CATALOG.map(j =>
      `ID: ${j.id}, Name: ${j.name}, Type: ${j.category}, Suitable for: ${j.allowed_locations?.join(', ')}`
    ).join('\n');

    const prompt = `You are a professional piercing stylist. Analyze this ear image.
    
    CATALOG OF AVAILABLE JEWELRY:
    ${catalogString}

    Task:
    1. Identify anatomical opportunities for piercing on this specific ear.
    2. Suggest 3-4 specific styling additions using ONLY items from the provided catalog.
    3. Return X/Y coordinates (0-100 scale) for where the jewelry should be placed on the image.
    4. Provide descriptions in Hebrew.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64,
            },
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              style_summary: { type: Type.STRING },
              recommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    location: { type: Type.STRING },
                    jewelry_id: { type: Type.STRING },
                    description: { type: Type.STRING },
                    x: { type: Type.NUMBER },
                    y: { type: Type.NUMBER }
                  },
                  required: ["location", "jewelry_id", "description", "x", "y"]
                }
              }
            },
            required: ["style_summary", "recommendations"]
          },
        },
      });

      if (response.text) {
        return JSON.parse(response.text) as AIAnalysisResult;
      }
      throw new Error("Empty response from AI");
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      throw new Error(`שגיאה בניתוח: ${error.message || "נכשלנו בניתוח התמונה. אנא וודא שהתמונה ברורה."}`);
    }
  },
};
