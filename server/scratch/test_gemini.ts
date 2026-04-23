import { GoogleAIGenerator } from "../src/controllers/ai/google";
import dotenv from "dotenv";
import path from "path";

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, "../.env") });

async function test() {
  const generator = new GoogleAIGenerator();
  const prompt = "A simple flowchart for a coffee machine: Start -> Grind beans -> Brew coffee -> Pour in cup -> End";
  const model = "gemini-2.5-flash-lite";

  console.log("--- TEST PROMPT ---");
  console.log(`Prompt: ${prompt}`);
  console.log(`Model: ${model}`);
  console.log("-------------------\n");

  try {
    console.log("Generating...");
    const start = Date.now();
    const result = await generator.generateDiagram(prompt, model);
    const end = Date.now();

    console.log(`\nTime taken: ${end - start}ms`);
    console.log("\n--- RESULT ---");
    console.log("Title:", result.title);
    console.log("Explanation:", result.explanation);
    console.log("\nMermaid Code:");
    console.log(result.mermaid);
    console.log("--------------");
  } catch (error) {
    console.error("Error during generation:", error);
  }
}

test();
