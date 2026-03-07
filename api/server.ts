import express from "express";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const app = express();
app.use(express.json());

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// API Routes
app.post("/api/generate-missions", async (req, res) => {
  const { topic, language, count } = req.body;
  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate ${count || 3} coding missions about "${topic}" in ${language}. 
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
    res.json(JSON.parse(response.text || '[]'));
  } catch (error: any) {
    console.error("Mission Generation Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/evaluate-code", async (req, res) => {
  const { language, problemDescription, submittedCode } = req.body;
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

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
                 1. Be extremely concise. 
                 2. If CORRECT: Just confirm (e.g., "Logic verified. Excellent.").
                 3. If INCORRECT: Provide 1-2 brief tactical suggestions.
                 4. End with the diagnostic JSON between [DATA] and [/DATA] tags.
                 
                 JSON SCHEMA:
                 {
                   "success": boolean,
                   "score": number,
                   "feedback": string,
                   "suggestions": string[]
                 }`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    });

    for await (const chunk of streamResponse) {
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.error("Stream Evaluation Error:", error);
    res.write(`data: ${JSON.stringify({ text: `System Error: ${error.message || 'The neural link was interrupted.'}` })}\n\n`);
    res.end();
  }
});

export default app;
