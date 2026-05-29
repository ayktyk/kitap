import { BookAIResponse } from '../types';

// İnce istemci: Gemini çağrıları /api/gemini serverless proxy üzerinden yapılır.
// API anahtarı client'a HİÇBİR ZAMAN gelmez (anahtar yalnızca sunucuda process.env).

async function callGemini(body: Record<string, unknown>): Promise<{ text: string } | null> {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      console.warn('Gemini proxy hatası:', response.status);
      return null;
    }
    return (await response.json()) as { text: string };
  } catch (error) {
    console.error('Gemini proxy isteği başarısız:', error);
    return null;
  }
}

export const suggestBookDetails = async (
  title: string,
  author?: string,
): Promise<BookAIResponse | null> => {
  const result = await callGemini({ action: 'suggest', title, author });
  if (!result?.text) return null;
  try {
    return JSON.parse(result.text) as BookAIResponse;
  } catch {
    return null;
  }
};

export const analyzeThoughts = async (thoughts: string, bookTitle: string): Promise<string> => {
  const result = await callGemini({ action: 'analyze', thoughts, bookTitle });
  return result?.text || '';
};
