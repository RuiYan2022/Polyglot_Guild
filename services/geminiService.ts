
import { GoogleGenAI, Type } from "@google/genai";
import { ProgrammingLanguage, Question } from '../types';

// Initialize the Gemini API client
// Always use process.env.GEMINI_API_KEY for the Gemini API.
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * MISSION GENERATION
 * Calls Gemini API directly from the client.
 */
export const generateMissions = async (
  topic: string, 
  language: ProgrammingLanguage, 
  count: number = 3
): Promise<Question[]> => {
  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate ${count} coding missions about "${topic}" in ${language}. 
                 Each mission should have a title, description, starter code, a brief solution hint, and a points value.
                 Difficulty must be one of: Easy, Medium, Hard, or Challenging. 
                 Suggested points: Easy=100, Medium=250, Hard=500, Challenging=1000.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              starterCode: { type: Type.STRING },
              solutionHint: { type: Type.STRING },
              difficulty: { type: Type.STRING },
              points: { type: Type.NUMBER }
            },
            required: ["title", "description", "starterCode", "solutionHint", "difficulty", "points"]
          }
        }
      }
    });

    const missions = JSON.parse(response.text || '[]');
    return missions.map((q: any) => ({
      ...q,
      id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
    }));
  } catch (error: any) {
    console.error("Mission Generation Error:", error);
    return [];
  }
};

/**
 * CODE EVALUATION STREAM
 * Calls Gemini API directly from the client with streaming enabled.
 */
export const evaluateCodeStream = async function* (
  language: ProgrammingLanguage,
  problemDescription: string,
  submittedCode: string
) {
  try {
    const streamResponse = await genAI.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: `You are an expert ${language} tutor. Evaluate the following code submission.
                 
                 PROBLEM: ${problemDescription}
                 
                 SUBMITTED CODE:
                 \`\`\`${language.toLowerCase()}
                 ${submittedCode}
                 \`\`\`
                 
                 INSTRUCTION:
                 1. If the code is CORRECT and solves the problem optimally:
                    - Be extremely brief. Just confirm it's correct (e.g., "Logic verified. Great job!").
                 2. If the code is INCORRECT or has logic errors:
                    - Provide detailed conversational feedback and 2-3 specific suggestions for improvement.
                 3. At the very end of your response, include the diagnostic result in JSON format between [DATA] and [/DATA] tags.
                 
                 JSON SCHEMA:
                 {
                   "success": boolean,
                   "score": number,
                   "feedback": string,
                   "suggestions": string[]
                 }`,
      config: {
        thinkingConfig: { thinkingLevel: 0 as any } // Use 0 for low latency if applicable, or omit
      }
    });

    for await (const chunk of streamResponse) {
      if (chunk.text) {
        yield { text: chunk.text };
      }
    }
  } catch (error: any) {
    console.error("Stream Evaluation Error:", error);
    yield { text: `System Error: ${error.message || 'The neural link was interrupted.'}` };
  }
};
