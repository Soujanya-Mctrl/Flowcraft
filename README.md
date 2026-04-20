# Flowcraft

Flowcraft is a Mermaid based diagram editor that allows you to create and edit diagrams in real-time. It is a web-based application that can be accessed from any device with a web browser. Flowcraft is designed to be easy to use and intuitive, so you can create professional-looking diagrams quickly and easily.


# Architecture

```mermaid 
graph TD;
    subgraph User Interface
        User[User] -->|Edits Mermaid Code| WebEditor[Web Editor]
        WebEditor -->|Sends Request| Backend[Backend Server]
        WebEditor -->|Displays Diagram| Diagram[Diagram Output]
    end

    subgraph Backend Logic
        Backend -->|Communicates with| API[Gemini API]
        API -->|Generates Mermaid| MermaidCode[Mermaid Code]
        Backend -->|Stores/Retrieves| Database[Firebase Firestore]
    end

    subgraph Database Layer
        Database -->|Stores| CodeData[(Mermaid Code)]
        Database -->|Stores| DiagramData[(Diagram Configurations)]
    end

    WebEditor -->|Requests Diagram Generation| Backend
    Backend -->|Sends Mermaid Code| API
    API -->|Returns Generated Diagram| Backend
    Backend -->|Sends Diagram Data| WebEditor
```

# Technologies
- **Frontend**: React, Vite, TypeScript, Vanilla CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: Firebase Firestore
- **AI**: Google Gemini Pro, Groq (Llama 3)
- **Deployment**: Google Cloud Run


# Deployments and URLS
- **Client URL**: [https://flowcraft.ai](https://flowcraft.ai)
- **Server URL**: [https://api.flowcraft.ai](https://api.flowcraft.ai)