
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
      throw new Error('מפתח API חסר. אנא הגדר VITE_GEMINI_API_KEY.');
    }

    const prompt = this.getPrompt();

    // List of model variations to try in order of preference
    const modelsToTry = [
      "gemini-1.5-flash-latest",
      "gemini-1.5-flash",
      "gemini-1.5-flash-8b",
      "gemini-1.5-pro-latest",
      "gemini-1.5-pro"
    ];

    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`Checking model: ${modelName} on v1 API...`);
        return await this.tryModelV1(modelName, API_KEY, cleanBase64, prompt);
      } catch (e: any) {
        console.warn(`Model ${modelName} failed:`, e.message);
        lastError = e;
        // Continue to next model on 404 or other non-fatal errors
        if (!e.message.includes('404') && !e.message.includes('not found')) {
          // If it's something like 401/403/429, don't keep trying others
          break;
        }
      }
    }

    // If we reach here, all tried models failed
    console.error("All AI models failed exhaustion check.");
    throw new Error(`שגיאה בחיבור ל-AI: ${lastError?.message || "ניסינו את כל הדגמים הזמינים אך ללא הצלחה. וודא שחשבון ה-API שלך פעיל."}`);
  },

  async tryModelV1(modelName: string, apiKey: string, base64: string, prompt: string): Promise<AIAnalysisResult> {
    // We use a direct fetch to the v1 endpoint for maximum reliability across environments
    const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`;

    const body = {
      contents: [{
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64,
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
      const msg = errData.error?.message || `HTTP ${response.status}`;
      throw new Error(msg);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) throw new Error("Empty response from AI");
    return this.parseResponse(text);
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
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      text = jsonMatch[0];
    }

    try {
      return JSON.parse(text) as AIAnalysisResult;
    } catch (e) {
      console.error("JSON Parse Error:", text);
      throw new Error("תוצאת ה-AI אינה תקינה.");
    }
  }
};
