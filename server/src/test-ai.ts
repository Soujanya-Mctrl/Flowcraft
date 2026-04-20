import { aiService } from "./services/aiService";
import dotenv from "dotenv";
import path from "path";

// Load .env
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function testGeneration() {
  console.log("🚀 Starting AI Generation Test...");
  console.log("Model: llama-3.1-8b-instant");
  console.log("Prompt: 'simple flowchart for a coffee machine'");

  try {
    const result = await aiService.generateDiagram(
      "simple flowchart for a coffee machine",
      "llama-3.1-8b-instant"
    );

    console.log("\n✅ Success!");
    console.log("Title:", result.title);
    console.log("Diagram Structure Check:");
    if (result.diagram.includes("```mermaid")) {
      console.log("- Mermaid block found");
    } else {
      console.warn("- WARNING: Mermaid block NOT found in output");
    }
    
    // Verify JSON parseability (internal to generateDiagram but good to confirm here)
    console.log("\nRaw Output Sample (first 100 chars):", result.diagram.substring(0, 100) + "...");
  } catch (error: any) {
    console.error("\n❌ Test Failed!");
    console.error("Error Message:", error.message);
    if (error.details) {
      console.error("Details:", error.details);
    }
    process.exit(1);
  }
}

testGeneration();
