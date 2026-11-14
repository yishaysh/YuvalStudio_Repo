export interface AIRecommendation {
  location: string;
  jewelry_id: string;
  description: string;
  x: number;
  y: number;
}

export interface AIAnalysisResult {
  style_summary: string;
  recommendations: AIRecommendation[];
  original_image?: string;
}

/**
 * Calls server-side /api/ai-stylist proxy so Gemini API credentials never ship in browser code.
 */
export const aiStylistService = {
  async analyzeEar(cleanBase64: string): Promise<AIAnalysisResult> {
    const res = await fetch('/api/ai-stylist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: cleanBase64 }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || 'שירות ניתוח ה-AI אינו זמין כרגע. נסי שוב מאוחר יותר.');
    }
    return data as AIAnalysisResult;
  },
};
