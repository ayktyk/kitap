import { GoogleGenAI, Type } from "@google/genai";
import { BookAIResponse } from '../types';

const getAiClient = () => {
  const apiKey =
    import.meta.env.VITE_GEMINI_API_KEY ||
    import.meta.env.VITE_API_KEY ||
    import.meta.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("API Key is missing. AI features will not work.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const suggestBookDetails = async (title: string, author?: string): Promise<BookAIResponse | null> => {
  const ai = getAiClient();
  if (!ai) return null;

  try {
    const prompt = `Provide details for the book titled "${title}"${author ? ` by ${author}` : ''}. Return a JSON object with: 
    - description (a short summary/thoughts in Turkish)
    - pageCount (approximate number)
    - author (full name)
    - genre (in Turkish)
    - suggestedQuotes (an array of 3 famous quotes from the book in Turkish if possible, otherwise original)`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            pageCount: { type: Type.INTEGER },
            author: { type: Type.STRING },
            genre: { type: Type.STRING },
            suggestedQuotes: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as BookAIResponse;
    }
    return null;

  } catch (error) {
    console.error("Gemini AI Error:", error);
    return null;
  }
};

export const analyzeThoughts = async (thoughts: string, bookTitle: string): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "AI servisi şu an kullanılamıyor.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `User wrote these thoughts about the book "${bookTitle}": "${thoughts}". 
      Act as a literary critic. Provide a short, encouraging, and insightful comment (in Turkish) expanding on their thought or asking a deep question about the book. Keep it under 50 words.`,
    });
    return response.text || "";
  } catch (error) {
    return "";
  }
};
