import { GroqAIGenerator, GoogleAIGenerator } from "../controllers/ai";
import { ChatMessage, AppError, ErrorCode } from "../types";
import { sanitizePrompt } from "../utils/helpers";

export class AIService {
  private groqGenerator: GroqAIGenerator;
  private googleGenerator: GoogleAIGenerator;

  constructor() {
    this.groqGenerator = new GroqAIGenerator();
    this.googleGenerator = new GoogleAIGenerator();
  }

  /**
   * Execute an AI task with automatic fallback to the other provider on rate limits
   */
  private async executeWithFallback<T>(
    model: string,
    task: (generator: any, currentModel: string) => Promise<T>
  ): Promise<T> {
    const isGoogle = model.toLowerCase().includes("gemini");
    const primaryGenerator = isGoogle ? this.googleGenerator : this.groqGenerator;
    const secondaryGenerator = isGoogle ? this.groqGenerator : this.googleGenerator;
    const secondaryModel = isGoogle ? "llama-3.3-70b-versatile" : "gemini-2.0-flash";

    try {
      return await task(primaryGenerator, model);
    } catch (error: any) {
      // If it's a rate limit (429), try the other provider
      if (error instanceof AppError && error.statusCode === 429) {
        console.warn(`[AIService] Primary provider (${isGoogle ? "Google" : "Groq"}) rate limited. Falling back to secondary...`);
        try {
          return await task(secondaryGenerator, secondaryModel);
        } catch (secondaryError: any) {
          console.error("[AIService] Both providers failed/rate-limited.");
          throw secondaryError;
        }
      }
      throw error;
    }
  }

  /**
   * Generate a diagram from a prompt
   */
  async generateDiagram(
    prompt: string,
    model: string = "llama-3.3-70b-versatile",
    diagramType: string = "auto",
    conversationHistory?: ChatMessage[]
  ): Promise<{ title: string; explanation: string; diagram: string }> {
    return this.executeWithFallback(model, async (generator, currentModel) => {
      const sanitizedPrompt = sanitizePrompt(prompt);
      
      // Step 1: Enhance prompt (Optional, could be combined, but keeping separate for now)
      // We wrap this too in case it fails
      let enhancedPrompt = sanitizedPrompt;
      try {
        enhancedPrompt = await generator.enhancePrompt(
          sanitizedPrompt,
          diagramType,
          conversationHistory
        );
      } catch (e) {
        console.warn("[AIService] Prompt enhancement failed, using original.");
      }

      console.log(`[AIService] Generating with model: ${currentModel}`);
      const { title, explanation, mermaid } = await generator.generateDiagram(
        enhancedPrompt,
        currentModel,
        diagramType,
        conversationHistory
      );

      return { title, explanation, diagram: mermaid };
    });
  }

  /**
   * Generate a title for a diagram
   */
  async generateTitle(
    diagram: string,
    model: string = "llama-3.3-70b-versatile"
  ): Promise<string> {
    return this.executeWithFallback(model, async (generator, currentModel) => {
      return await generator.generateTitle(diagram, currentModel);
    });
  }

  /**
   * Enhance an existing diagram
   */
  async enhanceDiagram(
    diagram: string,
    prompt: string,
    model: string = "llama-3.3-70b-versatile",
    diagramType: string = "auto",
    conversationHistory?: ChatMessage[]
  ): Promise<{ title: string; explanation: string; diagram: string }> {
    return this.executeWithFallback(model, async (generator, currentModel) => {
      const sanitizedPrompt = sanitizePrompt(prompt);
      
      console.log(`[AIService] Enhancing with model: ${currentModel}`);
      // Consolidated call: returns both title and diagram
      const { title, explanation, mermaid } = await generator.enhanceDiagram(
        diagram,
        sanitizedPrompt,
        currentModel,
        diagramType,
        conversationHistory
      );

      return { title, explanation, diagram: mermaid };
    });
  }
}

// Export singleton instance
export const aiService = new AIService();
