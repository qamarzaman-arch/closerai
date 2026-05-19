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
  res.json({ status: 'ok' });
});

app.get('/health/db', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', provider: 'mysql' });
  } catch (error: any) {
    res.status(503).json({ status: 'error', provider: 'mysql', error: error.message });
  }
});

// Error handling
app.use(globalErrorHandler);

// Initialize WebSocket Service
new WebSocketService(server);

server.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});
