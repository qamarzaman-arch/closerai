import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import leadRoutes from './api/routes/leadRoutes';
import { WebSocketService } from './infrastructure/services/WebSocketService';
import { globalErrorHandler } from './infrastructure/utils/errorHandler';
import logger from './infrastructure/utils/logger';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

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

// Error handling
app.use(globalErrorHandler);

// Initialize WebSocket Service
new WebSocketService(server);

server.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});
