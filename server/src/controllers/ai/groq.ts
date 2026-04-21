import Groq from "groq-sdk";
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
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export class GroqAIGenerator implements IAIGenerator {
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

      const response = await groq.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: instructions_text_to_diagram + diagramTypeInstruction,
          },
          {
            role: "user",
            content: contextPrompt,
          },
        ],
        response_format: {
          type: "json_object",
        },
      });

      const contentRaw = response.choices[0].message.content || "{}";
      let { title, chat } = parseJSON(contentRaw);

      if (!title || !chat) {
        console.error("GROQ FAILED. RAW JSON:", contentRaw);
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
        const checkResponse = await groq.chat.completions.create({
          model,
          messages: [
            { role: "system", content: JSON.stringify(instructions_diagram_checker) },
            { role: "user", content: `Code to check:\n\`\`\`mermaid\n${chat}\n\`\`\`` }
          ]
        });
        
        const checkResult = checkResponse.choices[0]?.message?.content?.trim() || "VALID";
        
        if (checkResult === "VALID") {
          valid = true;
          break;
        }

        console.log(`[Groq Validation Failed - Attempt ${retries + 1}] Errors: ${checkResult}`);

        // Step 2: Rectify
        const rectifyResponse = await groq.chat.completions.create({
          model,
          messages: [
            { role: "system", content: JSON.stringify(instructions_diagram_rectifier) },
            { role: "user", content: `Original Code:\n\`\`\`mermaid\n${chat}\n\`\`\`\n\nErrors reported:\n${checkResult}` }
          ],
          response_format: { type: "json_object" }
        });

        const rectResult = parseJSON(rectifyResponse.choices[0]?.message?.content || "{}");
        if (rectResult && rectResult.chat) {
            chat = rectResult.chat;
        }
        retries++;
      }

      if (!valid) {
         console.warn("[Groq] Max validation retries reached. Returning best attempt.");
      }

      return { title, chat };
    } catch (e: any) {
      console.error("Groq generateDiagram error:", e);
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

      const response = await groq.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: instructions_diagram_enhancer + diagramTypeInstruction,
          },
          {
            role: "user",
            content: `Current diagram:\n\`\`\`mermaid\n${diagram}\n\`\`\`\n\nEnhancement request: ${contextPrompt}`,
          },
        ],
      });

      let enhancedDiagram =
        response.choices[0]?.message?.content?.trim() || "";

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
          const checkResponse = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
              {
                role: "system",
                content: JSON.stringify(instructions_diagram_checker),
              },
              {
                role: "user",
                content: `Code to check:\n\`\`\`mermaid\n${chat}\n\`\`\``,
              },
            ],
            temperature: 0.1,
          });
          
          const checkResult = checkResponse.choices[0]?.message?.content?.trim() || "VALID";
          
          if (checkResult === "VALID") {
            valid = true;
            break;
          }

          console.log(`[Groq Enhance Validation Failed - Attempt ${retries + 1}] Errors: ${checkResult}`);

          // Step 2: Rectify
          const rectifyResponse = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
              {
                role: "system",
                content: JSON.stringify(instructions_diagram_rectifier),
              },
              {
                role: "user",
                content: `Original Code:\n\`\`\`mermaid\n${chat}\n\`\`\`\n\nErrors reported:\n${checkResult}`,
              },
            ],
            temperature: 0.3,
            response_format: { type: "json_object" },
          });

          const rectResult = parseJSON(rectifyResponse.choices[0]?.message?.content || "{}");
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
      console.error("Groq enhanceDiagram error:", e);
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
      const response = await groq.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: instructions_diagram_to_title,
          },
          {
            role: "user",
            content: `Generate a title for this diagram:\n\`\`\`mermaid\n${diagram}\n\`\`\``,
          },
        ],
      });

      const title = response.choices[0]?.message?.content?.trim() || "Untitled Diagram";

      return title;
    } catch (e: any) {
      console.error("Groq generateTitle error:", e);
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

      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `Enhance this prompt for a ${diagramType === "auto" ? "diagram" : diagramType}: ${contextPrompt}`,
          },
        ],
      });

      const enhancedPrompt =
        response.choices[0]?.message?.content?.trim() || prompt;

      return enhancedPrompt;
    } catch (e: any) {
      console.error("Groq enhancePrompt error:", e);
      // Return original prompt if enhancement fails
      return prompt;
    }
  }
}

