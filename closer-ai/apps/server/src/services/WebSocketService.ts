import { Server } from 'ws';
import { OpenAIService } from './OpenAIService';
import { TranscriptionManager } from './TranscriptionManager';
import { ConversationContextManager, SuggestionThrottler } from './ConversationEngine';
import { PrismaClient } from '@prisma/client';
import http from 'http';
import logger from '../utils/logger';
import { WSMessageSchema } from '../utils/schemas';

const prisma = new PrismaClient();
const openAIService = new OpenAIService();

export class WebSocketService {
  private wss: Server;

  constructor(server: http.Server) {
    this.wss = new Server({ server });
    this.init();
  }

  private init() {
    this.wss.on('connection', (ws) => {
      logger.info('New WebSocket connection');
      let currentSessionId: string | null = null;
      let contextManager = new ConversationContextManager();
      let throttler = new SuggestionThrottler();
      let transcriptionManager: TranscriptionManager | null = null;

      if (process.env.OPENAI_API_KEY) {
          transcriptionManager = new TranscriptionManager(process.env.OPENAI_API_KEY);
          transcriptionManager.on('transcription', async (text) => {
              if (currentSessionId) {
                  await this.handleTranscriptUpdate(ws, currentSessionId, text, 'Client', contextManager, throttler);
              }
          });
      }

      ws.on('message', async (message: any) => {
        try {
            const rawData = JSON.parse(message.toString());
            const data = WSMessageSchema.parse(rawData);

            switch (data.type) {
              case 'PING':
                ws.send(JSON.stringify({ type: 'PONG' }));
                break;

              case 'START_CALL':
                const session = await prisma.callSession.create({
                  data: { leadId: data.leadId }
                });
                currentSessionId = session.id;
                contextManager = new ConversationContextManager();
                throttler = new SuggestionThrottler();
                ws.send(JSON.stringify({ type: 'CALL_STARTED', sessionId: currentSessionId }));
                logger.info('Call started', { sessionId: currentSessionId });
                break;

              case 'AUDIO_CHUNK':
                if (transcriptionManager) {
                    await transcriptionManager.addAudioChunk(data.chunk);
                }
                break;

              case 'TRANSCRIPT_UPDATE':
                if (!currentSessionId) return;
                await this.handleTranscriptUpdate(ws, currentSessionId, data.text, data.speaker, contextManager, throttler, data.mode as any);
                break;

              case 'END_CALL':
                if (currentSessionId) {
                  const duration = 0; // Calculate duration
                  await prisma.callSession.update({
                    where: { id: currentSessionId },
                    data: {
                      endTime: new Date(),
                      outcome: data.outcome,
                    }
                  });
                  await prisma.transcript.create({
                    data: {
                      sessionId: currentSessionId,
                      content: contextManager.getContextString(),
                      jsonContent: JSON.stringify([])
                    }
                  });
                }
                ws.send(JSON.stringify({ type: 'CALL_ENDED' }));
                currentSessionId = null;
                break;
            }
        } catch (error: any) {
            logger.error('WS Message error', { error: error.message });
        }
      });

      ws.on('close', () => {
        logger.info('WebSocket connection closed');
      });
    });
  }

  private async handleTranscriptUpdate(ws: any, sessionId: string, text: string, speaker: string, contextManager: ConversationContextManager, throttler: SuggestionThrottler, mode: any = 'beginner') {
      contextManager.addMessage(speaker, text);
      ws.send(JSON.stringify({ type: 'NEW_TRANSCRIPT', text, speaker, timestamp: new Date() }));

      if (throttler.shouldGenerate()) {
          const context = contextManager.getContextString();
          const suggestion = await openAIService.getRealtimeSuggestion(context, mode);

          await prisma.aISuggestion.create({
            data: {
              sessionId: sessionId,
              prompt: context.slice(-200),
              response: JSON.stringify(suggestion)
            }
          });

          if (suggestion.detected_objection) {
            await prisma.objection.create({
              data: {
                sessionId: sessionId,
                type: suggestion.detected_objection,
                text: text,
                rebuttal: suggestion.rebuttal
              }
            });
          }

          ws.send(JSON.stringify({ type: 'AI_SUGGESTION', suggestion }));
      }
  }
}
