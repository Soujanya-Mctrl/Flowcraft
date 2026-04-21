import { sanitizeMermaid } from './src/utils/helpers';

const universalSuite = [
  {
    name: "🏥 Healthcare Workflow (Flowchart)",
    input: 'flowchart LR\n  A[Patient Intake] --> B{Insured?}\n  B --> |Yes| C[Process Claim]]\n  B --> |No| D[Self-Pay]]',
    expectedRegex: /C\[Process Claim\]/
  },
  {
    name: "🛒 E-commerce Data (ER Diagram)",
    input: 'erDiagram\n  CUSTOMER ||--o{ ORDER : "places orders"\n  ORDER { \n    string status \n  }}',
    expectedRegex: /ORDER \{[ \n]*string status[ \n]*\}/
  },
  {
    name: "🚢 Logistics Pipeline (State Diagram)",
    input: 'stateDiagram-v2\n  [*] --> Ordered\n  Ordered --> Shipped\n  Shipped --> Delivered))',
    expectedRegex: /Delivered\)/
  },
  {
    name: "🔐 Security Auth (Sequence Diagram)",
    input: 'sequenceDiagram\n  Client->>Server: Auth(user, pass)\n  Server-->>Client: JWT_Token]]',
    expectedRegex: /JWT_Token/
  },
  {
    name: "Market Research (Mindmap)",
    input: 'mindmap\n  root((Marketing))\n    Campaigns\n      Social Media\n      Email Marketing))',
    expectedRegex: /Email Marketing\)/
  }
];

console.log("=== Flowcraft Universal Domain Verification ===\n");

universalSuite.forEach(test => {
  const result = sanitizeMermaid(test.input);
  console.log(`Domain:    ${test.name}`);
  console.log(`Sanitized: ${result.replace(/\n/g, '\\n')}`);
  
  const passed = test.expectedRegex.test(result);
  console.log(`Status:    ${passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log("--------------------------------------------------\n");
});
