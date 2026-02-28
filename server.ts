import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
