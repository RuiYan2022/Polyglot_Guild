
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { ProgrammingLanguage, Question, AIResponse } from '../types';

// Use process.env.API_KEY directly as required by guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateMissions = async (
  topic: string, 
  language: ProgrammingLanguage, 
  count: number = 3
): Promise<Question[]> => {
  // Using gemini-3-pro-preview for coding mission generation (Complex Text Task)
  const response: GenerateContentResponse = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
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

  const rawJson = response.text || '[]';
  try {
    const parsed = JSON.parse(rawJson);
    return parsed.map((q: any) => ({
      ...q,
      id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
    }));
  } catch (error) {
    console.error("AI Mission Generation Error:", error);
    return [];
  }
};

export const evaluateCode = async (
  language: ProgrammingLanguage,
  problemDescription: string,
  submittedCode: string
): Promise<AIResponse> => {
  // Using gemini-3-pro-preview for code evaluation (Complex reasoning task)
  const response: GenerateContentResponse = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `You are an expert ${language} tutor. Evaluate the following code submission for this problem:
               
               PROBLEM: ${problemDescription}
               
               SUBMITTED CODE:
               \`\`\`${language.toLowerCase()}
               ${submittedCode}
               \`\`\`
               
               Provide a score from 0-100, specific feedback, and 2-3 suggestions for improvement.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          success: { type: Type.BOOLEAN, description: "Whether the solution is logically correct." },
          feedback: { type: Type.STRING },
          score: { type: Type.NUMBER },
          suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["success", "feedback", "score", "suggestions"]
      }
    }
  });

  const rawJson = response.text || '{}';
  try {
    return JSON.parse(rawJson);
  } catch (error) {
    console.error("AI Evaluation Error:", error);
    return {
      success: false,
      feedback: "The analysis engine encountered an issue processing your solution. Please check for syntax errors and try again.",
      score: 0,
      suggestions: ["Ensure the code logic is clear.", "Review language-specific syntax."]
    };
  }
};