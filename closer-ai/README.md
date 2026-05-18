# CloserAI - Enterprise Real Estate Sales Copilot

CloserAI is a production-ready, AI-powered desktop application designed for real estate cold callers, specifically optimized for non-native English speakers.

## Core Architecture
- **Backend**: Node.js/Express with a modular layered architecture (API/Domain/Infrastructure).
- **Frontend**: Electron/React/Tailwind with secure IPC and context isolation.
- **Intelligence**: Real-time seller motivation detection, personality-aware strategy engine, and multi-style objection handling.
- **Audio**: Low-latency PCM streaming with OpenAI Whisper integration.
- **Database**: Prisma ORM with optimized SQLite/Postgres support.

## Security & Hardening
- **Electron**: Context Isolation, Sandbox mode, and secure Preload scripts enabled.
- **Data**: Zod schema validation and structured Winston logging.
- **Resilience**: Global Error Boundaries and automatic WebSocket reconnection.

## Production Setup
### Standard Build
1. Install dependencies: `npm install` in both `apps/server` and `apps/electron`.
2. Configure `.env`: Set `OPENAI_API_KEY`.
3. Build & Run:
   - Backend: `cd apps/server && npm run build && npm start`
   - Desktop: `cd apps/electron && npm run build && npm run electron`

### Docker Build
```bash
docker-compose up --build
```

## Build for Windows
```bash
cd apps/electron && npm run build
```
Output will be in `apps/electron/dist/build`.

## License
Enterprise Proprietary
