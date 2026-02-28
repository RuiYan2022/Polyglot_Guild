
import { ProgrammingLanguage, Question } from '../types';

/**
 * MISSION GENERATION
 * Calls the backend API.
 */
export const generateMissions = async (
  topic: string, 
  language: ProgrammingLanguage, 
  count: number = 3
): Promise<Question[]> => {
  try {
    const response = await fetch("/api/generate-missions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, language, count }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.statusText}`);
    }

    const missions = await response.json();
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
 * Calls the backend API with streaming enabled.
 */
export const evaluateCodeStream = async function* (
  language: ProgrammingLanguage,
  problemDescription: string,
  submittedCode: string
) {
  try {
    const response = await fetch("/api/evaluate-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language, problemDescription, submittedCode }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No reader available");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") return;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              yield { text: parsed.text };
            }
          } catch (e) {
            console.error("Error parsing stream chunk:", e);
          }
        }
      }
    }
  } catch (error: any) {
    console.error("Stream Evaluation Error:", error);
    yield { text: `System Error: ${error.message || 'The neural link was interrupted.'}` };
  }
};
