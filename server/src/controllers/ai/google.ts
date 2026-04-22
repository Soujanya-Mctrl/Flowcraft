import { GoogleGenAI, Type } from "@google/genai";
import { ChatMessage, AIGenerator as IAIGenerator, AppError, ErrorCode } from "../../types";
import { parseJSON, buildConversationContext, sanitizeMermaid } from "../../utils/helpers";
import { 
  instructions_text_to_diagram, 
  instructions_diagram_enhancer, 
  instructions_diagram_to_title, 
  instructions_prompt_enhancer, 
  instructions_diagram_checker, 
  instructions_diagram_rectifier 
} from "./instructions";
import dotenv from "dotenv";

dotenv.config();
const gemini = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY });

export class GoogleAIGenerator implements IAIGenerator {
  /**
   * Generate a diagram from a prompt
   */
  async generateDiagram(
    prompt: string,
    model: string,
    diagramType: string = "auto",
    conversationHistory?: ChatMessage[]
  ): Promise<{ title: string; explanation: string; mermaid: string }> {
    try {
      const contextPrompt = conversationHistory
        ? prompt + buildConversationContext(conversationHistory)
        : prompt;

      // Add diagram type specific instruction
      let diagramTypeInstruction = "";
      if (diagramType !== "auto") {
        const diagramTypeMap: Record<string, string> = {
          flowchart: "flowchart",
          sequence: "sequence diagram",
          class: "class diagram",
          state: "state diagram",
          er: "entity relationship diagram",
          gantt: "gantt chart",
          pie: "pie chart",
          journey: "user journey diagram",
          mindmap: "mindmap",
          timeline: "timeline diagram",
          gitgraph: "git graph",
          c4: "C4 diagram",
        };
        const diagramName = diagramTypeMap[diagramType] || diagramType;
        diagramTypeInstruction = `\n\nIMPORTANT: You MUST generate a ${diagramName} specifically.`;
      }

      const response = await gemini.models.generateContent({
        model,
        contents: contextPrompt,
        config: {
          systemInstruction: instructions_text_to_diagram + diagramTypeInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              explanation: { type: Type.STRING },
              mermaid: { type: Type.STRING },
            },
            required: ["title", "explanation", "mermaid"],
          },
        },
      });

      let { title, explanation, mermaid } = parseJSON(response.text);

      if (!title || !explanation || !mermaid) {
        throw new AppError(
          ErrorCode.AI_SERVICE_ERROR,
          "Failed to generate diagram: Invalid response from AI",
          500
        );
      }


      // -----------------------------------------
      // Automated Validation & Rectification Loop
      // -----------------------------------------
      let retries = 0;
      const MAX_RETRIES = 2; // Reduced to save quota
      let valid = false;

      while (!valid && retries < MAX_RETRIES) {
        // Step 1: Check Syntax
        const checkResponse = await gemini.models.generateContent({
          model: "gemini-2.0-flash", // Using flash for fast validation
          contents: `Code to check:\n\`\`\`mermaid\n${mermaid}\n\`\`\``,
          config: {
            systemInstruction: JSON.stringify(instructions_diagram_checker)
          }
        });
        
        const checkResult = checkResponse.text?.trim() || "VALID";
        
        if (checkResult === "VALID") {
          valid = true;
          break;
        }

        console.log(`[Gemini Validation Failed - Attempt ${retries + 1}] Errors: ${checkResult}`);

        // Step 2: Rectify
        const rectifyResponse = await gemini.models.generateContent({
          model: "gemini-2.0-flash",
          contents: `Original Code:\n\`\`\`mermaid\n${mermaid}\n\`\`\`\n\nErrors reported:\n${checkResult}`,
          config: {
            systemInstruction: JSON.stringify(instructions_diagram_rectifier),
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                mermaid: { type: Type.STRING },
              },
              required: ["mermaid"],
            },
          }
        });

        const rectResult = parseJSON(rectifyResponse.text || "{}");
        if (rectResult && rectResult.mermaid) {
            mermaid = rectResult.mermaid;
        }
        retries++;
      }

      if (!valid) {
         console.warn("[Gemini] Max validation retries reached. Returning best attempt.");
      }

      return { title, explanation, mermaid: sanitizeMermaid(mermaid) };
    } catch (e: any) {
      console.error("Gemini generateDiagram error:", e);
      throw new AppError(
        ErrorCode.AI_SERVICE_ERROR,
        e.message || "Failed to generate diagram",
        500,
        e
      );
    }
  }

  /**
   * Enhance an existing diagram
   */
  async enhanceDiagram(
    diagram: string,
    prompt: string,
    model: string,
    diagramType: string = "auto",
    conversationHistory?: ChatMessage[]
  ): Promise<{ title: string; explanation: string; mermaid: string }> {
    try {
      const contextPrompt = conversationHistory
        ? prompt + buildConversationContext(conversationHistory)
        : prompt;

      // Add diagram type specific instruction
      let diagramTypeInstruction = "";
      if (diagramType !== "auto") {
        const diagramTypeMap: Record<string, string> = {
          flowchart: "flowchart",
          sequence: "sequence diagram",
          class: "class diagram",
          state: "state diagram",
          er: "entity relationship diagram",
          gantt: "gantt chart",
          pie: "pie chart",
          journey: "user journey diagram",
          mindmap: "mindmap",
          timeline: "timeline diagram",
          gitgraph: "git graph",
          c4: "C4 diagram",
        };
        const diagramName = diagramTypeMap[diagramType] || diagramType;
        diagramTypeInstruction = `\n\nIMPORTANT: Ensure it remains a ${diagramName}.`;
      }

      const response = await gemini.models.generateContent({
        model,
        contents: `Current diagram:\n\`\`\`mermaid\n${diagram}\n\`\`\`\n\nEnhancement request: ${contextPrompt}`,
        config: {
          systemInstruction: instructions_diagram_enhancer + diagramTypeInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              explanation: { type: Type.STRING },
              mermaid: { type: Type.STRING },
            },
            required: ["title", "explanation", "mermaid"],
          }
        },
      });

      let { title, explanation, mermaid } = parseJSON(response.text || "{}");

      if (!mermaid) {
        throw new AppError(
          ErrorCode.AI_SERVICE_ERROR,
          "Failed to enhance diagram: Empty response from AI",
          500
        );
      }

      // -----------------------------------------
      // Automated Validation & Rectification Loop
      // -----------------------------------------
      let retries = 0;
      const MAX_RETRIES = 2; // Reduced to save quota
      let valid = false;

      while (!valid && retries < MAX_RETRIES) {
        // Step 1: Check Syntax
        const checkResponse = await gemini.models.generateContent({
          model: "gemini-2.0-flash",
          contents: `Code to check:\n\`\`\`mermaid\n${mermaid}\n\`\`\``,
          config: {
            systemInstruction: JSON.stringify(instructions_diagram_checker)
          }
        });
        
        const checkResult = checkResponse.text?.trim() || "VALID";
        
        if (checkResult === "VALID") {
          valid = true;
          break;
        }

        console.log(`[Gemini Enhance Validation Failed - Attempt ${retries + 1}] Errors: ${checkResult}`);

        // Step 2: Rectify
        const rectifyResponse = await gemini.models.generateContent({
          model: "gemini-2.0-flash",
          contents: `Original Code:\n\`\`\`mermaid\n${mermaid}\n\`\`\`\n\nErrors reported:\n${checkResult}`,
          config: {
            systemInstruction: JSON.stringify(instructions_diagram_rectifier),
            responseMimeType: "application/json",
            responseSchema: {
            type: Type.OBJECT,
            properties: {
              mermaid: { type: Type.STRING },
            },
            required: ["mermaid"],
          }
          }
        });

        const rectResult = parseJSON(rectifyResponse.text || "{}");
        if (rectResult && rectResult.mermaid) {
            mermaid = rectResult.mermaid;
        }
        retries++;
      }

      return { title, explanation, mermaid: sanitizeMermaid(mermaid) };
    } catch (e: any) {
      console.error("Gemini enhanceDiagram error:", e);
      // Check for rate limit
      if (e.message?.includes("429") || e.status === 429) {
        throw new AppError(
          ErrorCode.AI_SERVICE_ERROR,
          "Rate limit exceeded",
          429,
          e
        );
      }
    }
  }

  /**
   * Generate a title for a diagram
   */
  async generateTitle(diagram: string, model: string): Promise<string> {
    try {
      const response = await gemini.models.generateContent({
        model,
        contents: `Generate a title for this diagram:\n\`\`\`mermaid\n${diagram}\n\`\`\``,
        config: {
          systemInstruction: instructions_diagram_to_title,
        },
      });

      const title = response.text?.trim() || "Untitled Diagram";

      return title;
    } catch (e: any) {
      console.error("Gemini generateTitle error:", e);
      throw new AppError(
        ErrorCode.AI_SERVICE_ERROR,
        e.message || "Failed to generate title",
        500,
        e
      );
    }
  }

  /**
   * Enhance a user prompt for better diagram generation
   */
  async enhancePrompt(
    prompt: string,
    diagramType: string = "auto",
    conversationHistory?: ChatMessage[]
  ): Promise<string> {
    try {
      const contextPrompt = conversationHistory
        ? prompt + buildConversationContext(conversationHistory)
        : prompt;

      const systemPrompt = instructions_prompt_enhancer;

      const response = await gemini.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `Enhance this prompt for a ${diagramType === "auto" ? "diagram" : diagramType}: ${contextPrompt}`,
        config: {
          systemInstruction: systemPrompt,
        },
      });

      const enhancedPrompt = response.text?.trim() || prompt;

      return enhancedPrompt;
    } catch (e: any) {
      console.error("Gemini enhancePrompt error:", e);
      // Return original prompt if enhancement fails
      return prompt;
    }
  }
}
