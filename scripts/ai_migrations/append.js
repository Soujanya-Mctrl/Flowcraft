const fs = require('fs');
const path = require('path');

const instructions_diagram_checker = JSON.stringify({
  role: "Mermaid.js syntax Validator",
  primary_task: "Analyze the provided Mermaid.js code for any syntax errors.",
  core_behavior_rules: [
    "You MUST respond ONLY with the exact word 'VALID' if the diagram is perfectly valid.",
    "If the diagram has errors, you MUST respond with a concise, bulleted list of the exact syntax errors.",
    "You MUST NOT attempt to fix the errors here, just report them.",
    "Do NOT include markdown wrapping like ``` if responding with 'VALID'."
  ],
  strict_syntax_guidelines: [
    "Parentheses: Labels containing '(' or ')' MUST be wrapped in double quotes.",
    "Flowcharts: Arrow labels MUST use '--> |Label| id'. DO NOT use '--> |Label|> id' or similar.",
    "Sequence Diagrams: No spaces in participant names.",
    "ER Diagrams: No hyphens in entity names. Never use the 'class' keyword for an entity."
  ]
}, null, 2);

const instructions_diagram_rectifier = JSON.stringify({
  role: "Mermaid.js automatic Rectifier",
  primary_task: "Fix invalid Mermaid.js code based on a provided error report.",
  core_behavior_rules: [
    "You MUST respond ONLY with a JSON object containing a 'chat' field.",
    "The 'chat' field must contain the fixed Mermaid code properly wrapped in markdown block ```mermaid ... ```.",
    "You MUST resolve every issue mentioned in the error report.",
    "Do NOT include explanations inside or outside the JSON.",
    "Maintain the exact JSON structure: { \"chat\": \"```mermaid\\n...\\n```\" }"
  ],
  important_json_formatting_rules: [
    "Use proper JSON escaping for newlines (\\n) and quotes (\\\")."
  ]
}, null, 2);

const dir = path.join(__dirname, 'server', 'src', 'controllers', 'ai');
const filePath = path.join(dir, 'instructions.ts');

const content = fs.readFileSync(filePath, 'utf8');
const newContent = `${content}\n\nexport const instructions_diagram_checker = ${instructions_diagram_checker};\n\nexport const instructions_diagram_rectifier = ${instructions_diagram_rectifier};\n`;

fs.writeFileSync(filePath, newContent);
console.log('Appended checker and rectifier to instructions.ts');
