import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import leadRoutes from './api/routes/leadRoutes';
import { WebSocketService } from './infrastructure/services/WebSocketService';
import { globalErrorHandler } from './infrastructure/utils/errorHandler';
import logger from './infrastructure/utils/logger';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/leads', leadRoutes);

// Basic health check
app.get('/health', (req, res) => {
  const whisperKey = process.env.WHISPER_API_KEY || process.env.OPENAI_API_KEY;
  const whisperReady = !!whisperKey && !whisperKey.startsWith('sk-or-');
  res.json({
    status: 'ok',
    aiConfigured: !!process.env.OPENAI_API_KEY,
    whisperReady,
    whisperNote: !whisperReady ? 'Set WHISPER_API_KEY to a real OpenAI key to enable live transcription' : undefined,
  });
});

app.get('/health/db', async (req, res) => {
  const provider = process.env.DATABASE_URL?.startsWith('file:') ? 'sqlite' : 'mysql';
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', provider });
  } catch (error: any) {
    res.status(503).json({ status: 'error', provider, error: error.message });
  }
});

app.get('/health/ai', async (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ status: 'error', reason: 'OPENAI_API_KEY not configured' });
  }
  try {
    const { default: OpenAI } = await import('openai');
    const ai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL });
    await ai.models.list();
    res.json({ status: 'ok', model: process.env.OPENAI_MODEL || 'gpt-4o-mini' });
  } catch (error: any) {
    res.status(503).json({ status: 'error', reason: error.message });
  }
});

// Error handling
app.use(globalErrorHandler);

// Initialize WebSocket Service
new WebSocketService(server);

const httpServer = server.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});

// Graceful shutdown — lets ts-node-dev hot-reload without EADDRINUSE
const shutdown = () => {
  httpServer.close(() => {
    prisma.$disconnect().then(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 3000); // force-exit if not clean in 3s
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
