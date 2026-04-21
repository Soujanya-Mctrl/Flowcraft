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
  ): Promise<{ title: string; chat: string }> {
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
            title: Type.STRING,
            chat: Type.STRING,
          },
        },
      });

      let { title, chat } = parseJSON(response.text);

      if (!title || !chat) {
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
      const MAX_RETRIES = 3;
      let valid = false;

      while (!valid && retries < MAX_RETRIES) {
        // Step 1: Check Syntax
        const checkResponse = await gemini.models.generateContent({
          model: "gemini-2.0-flash", // Using flash for fast validation
          contents: `Code to check:\n\`\`\`mermaid\n${chat}\n\`\`\``,
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
          contents: `Original Code:\n\`\`\`mermaid\n${chat}\n\`\`\`\n\nErrors reported:\n${checkResult}`,
          config: {
            systemInstruction: JSON.stringify(instructions_diagram_rectifier),
            responseMimeType: "application/json",
            responseSchema: {
              chat: Type.STRING
            }
          }
        });

        const rectResult = parseJSON(rectifyResponse.text || "{}");
        if (rectResult && rectResult.chat) {
            chat = rectResult.chat;
        }
        retries++;
      }

      if (!valid) {
         console.warn("[Gemini] Max validation retries reached. Returning best attempt.");
      }

      return { title, chat };
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
  ): Promise<string> {
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
        },
      });

      let enhancedDiagram = response.text?.trim() || "";

      if (!enhancedDiagram) {
        throw new AppError(
          ErrorCode.AI_SERVICE_ERROR,
          "Failed to enhance diagram: Empty response from AI",
          500
        );
      }

      // -----------------------------------------
      // Automated Validation & Rectification Loop
      // -----------------------------------------
      let matches = [...enhancedDiagram.matchAll(/```mermaid([\s\S]*?)```/g)];
      
      if (matches.length > 0) {
        let lastMatch = matches[matches.length - 1]; // The newly enhanced diagram block
        let chat = lastMatch[1].trim();

        let retries = 0;
        const MAX_RETRIES = 3;
        let valid = false;

        while (!valid && retries < MAX_RETRIES) {
          // Step 1: Check Syntax
          const checkResponse = await gemini.models.generateContent({
            model: "gemini-2.0-flash",
            contents: `Code to check:\n\`\`\`mermaid\n${chat}\n\`\`\``,
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
            contents: `Original Code:\n\`\`\`mermaid\n${chat}\n\`\`\`\n\nErrors reported:\n${checkResult}`,
            config: {
              systemInstruction: JSON.stringify(instructions_diagram_rectifier),
              responseMimeType: "application/json",
              responseSchema: { chat: Type.STRING }
            }
          });

          const rectResult = parseJSON(rectifyResponse.text || "{}");
          if (rectResult && rectResult.chat) {
              const newMermaidBlock = rectResult.chat;
              enhancedDiagram = enhancedDiagram.replace(lastMatch[0], newMermaidBlock);
              lastMatch[0] = newMermaidBlock;
              
              const innerMatch = /```mermaid([\s\S]*?)```/g.exec(newMermaidBlock);
              chat = innerMatch ? innerMatch[1].trim() : newMermaidBlock.replace(/```mermaid\n|```/g, '').trim();
          }
          retries++;
        }
      }

      // Final deterministic sanitization for all mermaid blocks in the output
      enhancedDiagram = enhancedDiagram.replace(/```mermaid([\s\S]*?)```/g, (match, code) => {
        return `\`\`\`mermaid\n${sanitizeMermaid(code)}\n\`\`\``;
      });

      return enhancedDiagram;
    } catch (e: any) {
      console.error("Gemini enhanceDiagram error:", e);
      throw new AppError(
        ErrorCode.AI_SERVICE_ERROR,
        e.message || "Failed to enhance diagram",
        500,
        e
      );
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
