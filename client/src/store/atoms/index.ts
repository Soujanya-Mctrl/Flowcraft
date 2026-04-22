import { atom } from "recoil";
import { ChatMessage } from "../../types";

export const userNameState = atom<string>({
  key: "userNameState",
  default: "user",
});

export const cartState = atom({
  key: "cartState",
  default: [],
});

export const codeState = atom({
  key: "codeState",
  default: `flowchart TD
    A["💡 Brain"] --> C{"Creative Process"}
    B["❤️ Love"] --> C
    C --> D["🛠️ Development"]
    C --> E["🎨 Design"]
    C --> F["⚡ Innovation"]
    D --> G["🚀 Flowcraft"]
    E --> G
    F --> G
    G --> H["👥 Users"]
    H --> I["🌟 Impact"]
    
    style A fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    style B fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    style C fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    style G fill:#e8f5e8,stroke:#2e7d32,stroke-width:3px
    style I fill:#fff3e0,stroke:#ef6c00,stroke-width:2px`,
});

export const chatState = atom({
  key: "chatState",
  default: `## Hello, I am \`Flowcraft AI\` :) \n\nProfessional \`Mermaid diagram generation\` platform. Provide your specifications and receive production-ready diagrams instantly.\`\`\`mermaid\nflowchart TD\n    A["💡 Brain"] --> C{"Creative Process"}\n    B["❤️ Love"] --> C\n    C --> D["🛠️ Development"]\n    C --> E["🎨 Design"]\n    C --> F["⚡ Innovation"]\n    D --> G["🚀 Flowcraft"]\n    E --> G\n    F --> G\n    G --> H["👥 Users"]\n    H --> I["🌟 Impact"]\n    \n    style A fill:#e1f5fe,stroke:#01579b,stroke-width:2px\n    style B fill:#fce4ec,stroke:#880e4f,stroke-width:2px\n    style C fill:#f3e5f5,stroke:#4a148c,stroke-width:2px\n    style G fill:#e8f5e8,stroke:#2e7d32,stroke-width:3px\n    style I fill:#fff3e0,stroke:#ef6c00,stroke-width:2px\n\`\`\``,
});

const DEFAULT_WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: `## Hello, I am \`Flowcraft AI\` :) \n\nProfessional \`Mermaid diagram generation\` platform. Provide your specifications and receive production-ready diagrams instantly.\n\`\`\`mermaid\nflowchart TD\n    A["💡 Brain"] --> C{"Creative Process"}\n    B["❤️ Love"] --> C\n    C --> D["🛠️ Development"]\n    C --> E["🎨 Design"]\n    C --> F["⚡ Innovation"]\n    D --> G["🚀 Flowcraft"]\n    E --> G\n    F --> G\n    G --> H["👥 Users"]\n    H --> I["🌟 Impact"]\n    \n    style A fill:#e1f5fe,stroke:#01579b,stroke-width:2px\n    style B fill:#fce4ec,stroke:#880e4f,stroke-width:2px\n    style C fill:#f3e5f5,stroke:#4a148c,stroke-width:2px\n    style G fill:#e8f5e8,stroke:#2e7d32,stroke-width:3px\n    style I fill:#fff3e0,stroke:#ef6c00,stroke-width:2px\n\`\`\``,
  timestamp: new Date(),
};

export const conversationHistoryState = atom<ChatMessage[]>({
  key: "conversationHistoryState",
  default: [DEFAULT_WELCOME_MESSAGE],
});

export { DEFAULT_WELCOME_MESSAGE };
