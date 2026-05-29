import { GoogleGenAI, Type } from '@google/genai';

// Gemini serverless proxy. API anahtarı YALNIZCA sunucu tarafında (process.env)
// kullanılır — client bundle'a hiçbir zaman sızmaz. İstemci /api/gemini'ye POST atar.

const MAX_LEN = 2000;
const clamp = (value: unknown): string => (typeof value === 'string' ? value.slice(0, MAX_LEN) : '');

export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
  if (!apiKey) {
    response.status(503).json({ error: 'AI servisi yapılandırılmamış.' });
    return;
  }

  const body = (request.body || {}) as Record<string, unknown>;
  const action = body.action;
  const ai = new GoogleGenAI({ apiKey });

  try {
    if (action === 'suggest') {
      const title = clamp(body.title);
      if (!title) {
        response.status(400).json({ error: 'Başlık gerekli.' });
        return;
      }
      const author = clamp(body.author);
      const prompt = `Provide details for the book titled "${title}"${author ? ` by ${author}` : ''}. Return a JSON object with:
    - description (a short summary/thoughts in Turkish)
    - pageCount (approximate number)
    - author (full name)
    - genre (in Turkish)
    - suggestedQuotes (an array of 3 famous quotes from the book in Turkish if possible, otherwise original)`;

      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              description: { type: Type.STRING },
              pageCount: { type: Type.INTEGER },
              author: { type: Type.STRING },
              genre: { type: Type.STRING },
              suggestedQuotes: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
          },
        },
      });
      response.status(200).json({ text: result.text || '' });
      return;
    }

    if (action === 'analyze') {
      const thoughts = clamp(body.thoughts);
      const bookTitle = clamp(body.bookTitle);
      if (!thoughts) {
        response.status(400).json({ error: 'Düşünce metni gerekli.' });
        return;
      }
      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `User wrote these thoughts about the book "${bookTitle}": "${thoughts}".
      Act as a literary critic. Provide a short, encouraging, and insightful comment (in Turkish) expanding on their thought or asking a deep question about the book. Keep it under 50 words.`,
      });
      response.status(200).json({ text: result.text || '' });
      return;
    }

    response.status(400).json({ error: 'Geçersiz istek.' });
  } catch (error) {
    console.error('Gemini proxy error:', error);
    response.status(500).json({ error: 'AI isteği sırasında hata oluştu.' });
  }
}
