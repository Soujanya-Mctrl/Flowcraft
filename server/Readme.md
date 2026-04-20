# Flowcraft API (Server)

The backend engine for **flowcraft.ai**, responsible for AI diagram generation, enhancement, and database management.

## 🚀 Technology Stack
- **Framework**: Express (Node.js) with TypeScript
- **AI Models**: Google Gemini & Groq (Llama 3.3, DeepSeek)
- **Database**: Firebase Firestore (via Firebase Admin SDK)
- **Deployment**: Google Cloud Run (Containerized via Docker)
- **CI/CD**: GitHub Actions

## 📂 Architecture
- `src/api/`: Main API router and endpoint definitions.
- `src/controllers/`: Business logic for AI processing and diagram management.
- `src/db/`: Firestore initialization and database helpers.
- `src/services/`: External AI service integrations (Gemini, Groq).

## 🛠️ Local Development

As part of the Flowcraft monorepo, it is recommended to run this from the root directory:

```bash
# Run server in dev mode from root
npm run dev:server
```

Otherwise, manually:
```bash
cd server
npm install
npm run dev
```

## ⚙️ Environment Variables
Required variables in `.env`:
- `GOOGLE_GEMINI_API_KEY`: API key from Google AI Studio.
- `GROQ_API_KEY`: API key from Groq Console.
- `FIREBASE_PROJECT_ID`: `flowcraft-95bf4`
- `PORT`: (Default: 3000, Cloud Run will provide 8080)
