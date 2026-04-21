import { sanitizeMermaid } from './src/utils/helpers';

const testSuite = [
  {
    name: "Flowchart - Recursion (Fibonacci Hallucination)",
    input: 'id1["Start: Calculate Fibonacci(n"]] --> id2{Base Case}}',
    expectedRegex: /id1\["Start: Calculate Fibonacci\(n"\] --> id2\{Base Case\}/
  },
  {
    name: "Sequence Diagram - API Auth",
    input: 'sequenceDiagram\n  User->>API: Login("user")\n  API-->>User: Token]]',
    expectedRegex: /API-->>User: Token/
  },
  {
    name: "ER Diagram - E-commerce",
    input: 'erDiagram\n  CUSTOMER ||--o{ ORDER : places\n  ORDER { string status }}',
    expectedRegex: /ORDER \{ string status \}/
  },
  {
    name: "Arrow Label Typos",
    input: 'A --> |Valid Label|> B',
    expectedRegex: /A --> \|Valid Label\| B/
  },
  {
    name: "Unquoted logic with parentheses",
    input: 'node1[Check(Value)] --> node2',
    expectedRegex: /node1\["Check\(Value\)"\]/
  }
];

console.log("=== Flowcraft General-Purpose Logic Stress Test ===\n");

testSuite.forEach(test => {
  const result = sanitizeMermaid(test.input);
  console.log(`Test Case: ${test.name}`);
  console.log(`Input:     ${test.input.replace(/\n/g, '\\n')}`);
  console.log(`Sanitized: ${result.replace(/\n/g, '\\n')}`);
  
  const passed = test.expectedRegex.test(result);
  console.log(`Status:    ${passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log("--------------------------------------------------\n");
});
