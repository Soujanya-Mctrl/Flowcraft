const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server', 'src', 'controllers', 'ai', 'index.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Update imports
content = content.replace(
  'import { instructions_text_to_diagram, instructions_diagram_enhancer, instructions_diagram_to_title, instructions_prompt_enhancer } from "./instructions";',
  'import { instructions_text_to_diagram, instructions_diagram_enhancer, instructions_diagram_to_title, instructions_prompt_enhancer, instructions_diagram_checker, instructions_diagram_rectifier } from "./instructions";'
);

// We need to inject the validation loop right before `return { title, chat };` 
// in BOTH Groq and Gemini generation methods.

const loopLogicGroq = `
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
            { role: "system", content: instructions_diagram_checker },
            { role: "user", content: \`Code to check:\\n\\\`\\\`\\\`mermaid\\n\${chat}\\n\\\`\\\`\\\`\` }
          ]
        });
        
        const checkResult = checkResponse.choices[0]?.message?.content?.trim() || "VALID";
        
        if (checkResult === "VALID") {
          valid = true;
          break;
        }

        console.log(\`[Groq Validation Failed - Attempt \${retries + 1}] Errors: \${checkResult}\`);

        // Step 2: Rectify
        const rectifyResponse = await groq.chat.completions.create({
          model,
          messages: [
            { role: "system", content: instructions_diagram_rectifier },
            { role: "user", content: \`Original Code:\\n\\\`\\\`\\\`mermaid\\n\${chat}\\n\\\`\\\`\\\`\\n\\nErrors reported:\\n\${checkResult}\` }
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

      return { title, chat };`;

const loopLogicGemini = `
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
          contents: \`Code to check:\\n\\\`\\\`\\\`mermaid\\n\${chat}\\n\\\`\\\`\\\`\`,
          config: {
            systemInstruction: instructions_diagram_checker
          }
        });
        
        const checkResult = checkResponse.text?.trim() || "VALID";
        
        if (checkResult === "VALID") {
          valid = true;
          break;
        }

        console.log(\`[Gemini Validation Failed - Attempt \${retries + 1}] Errors: \${checkResult}\`);

        // Step 2: Rectify
        const rectifyResponse = await gemini.models.generateContent({
          model: "gemini-2.0-flash",
          contents: \`Original Code:\\n\\\`\\\`\\\`mermaid\\n\${chat}\\n\\\`\\\`\\\`\\n\\nErrors reported:\\n\${checkResult}\`,
          config: {
            systemInstruction: instructions_diagram_rectifier,
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

      return { title, chat };`;

// Split by classes
const parts = content.split('export class GoogleAIGenerator');

// In Groq part:
parts[0] = parts[0].replace('      return { title, chat };', loopLogicGroq);

// In Gemini part:
parts[1] = parts[1].replace('      return { title, chat };', loopLogicGemini);

const finalContent = parts[0] + 'export class GoogleAIGenerator' + parts[1];

fs.writeFileSync(filePath, finalContent);
console.log('Successfully injected the validation loops!');
