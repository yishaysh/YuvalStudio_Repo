import { GoogleGenAI, Schema, Type } from '@google/genai';
import { JEWELRY_CATALOG } from '../../constants.js';
import type { JewelryItem } from '../../types.js';

export interface ServerAIRecommendation {
  location: string;
  jewelry_id: string;
  description: string;
  x: number;
  y: number;
}

export interface ServerAIAnalysisResult {
  style_summary: string;
  recommendations: ServerAIRecommendation[];
}

export type ServerAiAnalyzer = (
  base64Image: string,
  catalog?: JewelryItem[]
) => Promise<ServerAIAnalysisResult>;

export const defaultServerAiAnalyzer: ServerAiAnalyzer = async (
  base64Image: string,
  catalog: JewelryItem[] = JEWELRY_CATALOG
) => {
  const apiKey = (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    ''
  ).trim();
  if (!apiKey) {
    throw new Error('מפתח AI (GEMINI_API_KEY) אינו מוגדר בצד השרת.');
  }

  const ai = new GoogleGenAI({ apiKey });
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      style_summary: {
        type: Type.STRING,
        description: 'Overall styling concept and vibe in Hebrew (e.g., קלאסי ועדין, מודרני ואדג\'י)',
      },
      recommendations: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            location: { type: Type.STRING, description: 'Ear piercing location in Hebrew' },
            jewelry_id: { type: Type.STRING, description: 'Exact ID from the provided catalog' },
            description: { type: Type.STRING, description: 'Why this suits their ear anatomy in Hebrew' },
            x: { type: Type.NUMBER, description: 'Estimated X coordinate percentage (0-100) from left' },
            y: { type: Type.NUMBER, description: 'Estimated Y coordinate percentage (0-100) from top' },
          },
          required: ['location', 'jewelry_id', 'description', 'x', 'y'],
        },
        description: 'List of 2 to 4 suggested styling placements matching the catalog',
      },
    },
    required: ['style_summary', 'recommendations'],
  };

  const activeCatalog = catalog.filter(item => item.in_stock !== false);
  const catalogString = activeCatalog
    .map(j => `ID: ${j.id}, Name: ${j.name}, Type: ${j.category}, Suitable for: ${(j.allowed_locations || []).join(', ')}`)
    .join('\n');

  const cleanBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { data: cleanBase64, mimeType: 'image/jpeg' } },
          {
            text: `You are Yuval, a professional piercing stylist ("הסטודיו של יובל"). Analyze this ear photo carefully.

CATALOG OF AVAILABLE JEWELRY:
${catalogString}

Task:
1. Identify aesthetic styling opportunities on this specific ear photo (note: final anatomical approval is always confirmed in person at the studio).
2. Suggest 2 to 4 specific styling additions using ONLY exact jewelry_id values from the provided catalog.
3. Return X/Y percentage coordinates (0-100 scale) for where each piece sits on the uploaded photo.
4. Write style_summary and description in natural, warm, professional Hebrew.`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema,
      temperature: 0.4,
    },
  });

  const text = response.text;
  if (!text) throw new Error('תגובת AI ריקה');
  return JSON.parse(text) as ServerAIAnalysisResult;
};
