# CloserAI - Realtime Sales Copilot

CloserAI is a production-grade AI-powered desktop application for real estate cold callers.

## Features
- **Realtime Audio Pipeline**: Low-latency PCM audio streaming via Web Audio API.
- **AI Transcription**: Integrated with OpenAI Whisper for live conversation text.
- **Conversation Engine**: Intelligent context management, objection classification, and suggestion throttling.
- **Confidence Mode**: Tailored suggestions for Beginner, Intermediate, and Advanced speakers.
- **Lead Management**: Full CRUD with Prisma and SQLite.
- **Dashboard**: Live performance metrics and analytics.

## Tech Stack
- **Frontend**: Electron, React, TypeScript, TailwindCSS, Zustand.
- **Backend**: Node.js, Express, WebSocket (ws), Winston, Zod.
- **Database**: Prisma ORM, SQLite.
- **AI**: OpenAI (GPT-4o, Whisper).

## Setup
1. Clone the repository.
2. Install dependencies:
   ```bash
   cd apps/server && npm install
   cd ../electron && npm install
   ```
3. Set environment variables in `apps/server/.env`:
   ```
   OPENAI_API_KEY=your_key_here
   PORT=3001
   ```
4. Setup database:
   ```bash
   cd apps/server && npx prisma db push
   ```
5. Run the application:
   - Start Backend: `cd apps/server && npm run dev`
   - Start Frontend: `cd apps/electron && npm run start`

## Testing
Run unit tests in the server:
```bash
cd apps/server && npx jest
```
