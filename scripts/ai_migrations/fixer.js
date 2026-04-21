const fs = require('fs');
const path = require('path');

// Fix index.ts
const indexTsPath = path.join(__dirname, 'server', 'src', 'controllers', 'ai', 'index.ts');
let indexContent = fs.readFileSync(indexTsPath, 'utf8');

indexContent = indexContent.replace(
  'const { title, chat } = parseJSON(\n        response.choices[0].message.content || "{}"\n      );',
  'let { title, chat } = parseJSON(\n        response.choices[0].message.content || "{}"\n      );'
);

indexContent = indexContent.replace(
  'const { title, chat } = parseJSON(response.text);',
  'let { title, chat } = parseJSON(response.text);'
);

// Fix Groq role issue: instructions_diagram_checker was output as an object literal in append.js 
// We need to change `content: instructions_diagram_checker` to `content: JSON.stringify(instructions_diagram_checker)` 
// in index.ts since they're currently exported as objects. 
// Alternatively, edit instructions.ts to export them as JSON strings. I'll edit index.ts to just stringify them.
indexContent = indexContent.replace(/content: instructions_diagram_checker/g, 'content: JSON.stringify(instructions_diagram_checker)');
indexContent = indexContent.replace(/content: instructions_diagram_rectifier/g, 'content: JSON.stringify(instructions_diagram_rectifier)');
// And for Gemini:
indexContent = indexContent.replace(/systemInstruction: instructions_diagram_checker/g, 'systemInstruction: JSON.stringify(instructions_diagram_checker)');
indexContent = indexContent.replace(/systemInstruction: instructions_diagram_rectifier/g, 'systemInstruction: JSON.stringify(instructions_diagram_rectifier)');

fs.writeFileSync(indexTsPath, indexContent);
console.log('Fixed index.ts successfully');
