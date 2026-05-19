import { Server } from 'ws';
import { OpenAIService } from './OpenAIService';
import { TranscriptionManager } from './TranscriptionManager';
import { ConversationContextManager, SuggestionThrottler } from './ConversationEngine';
import { RealEstateIntelligenceService, SellerInsight, ObjectionLibrary } from './RealEstateIntelligenceService';
import { StrategyEngine } from './StrategyEngine';
import { PrismaClient } from '@prisma/client';
import http from 'http';
import logger from '../utils/logger';
import { WSMessageSchema } from '../utils/schemas';

const prisma = new PrismaClient();
const openAIService = new OpenAIService();
const reIntelligence = new RealEstateIntelligenceService();

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
      let callerTranscriptionManager: TranscriptionManager | null = null;
      let clientTranscriptionManager: TranscriptionManager | null = null;

      const makeTranscriber = (speaker: 'Caller' | 'Client') => {
          // Groq key takes priority — free Whisper-compatible endpoint
          const groqKey = process.env.GROQ_API_KEY;
          const whisperKey = process.env.WHISPER_API_KEY || process.env.OPENAI_API_KEY;

          let mgr: TranscriptionManager | null = null;
          if (groqKey) {
              mgr = new TranscriptionManager(groqKey, 'https://api.groq.com/openai/v1', 'whisper-large-v3-turbo');
          } else if (whisperKey && !whisperKey.startsWith('sk-or-')) {
              mgr = new TranscriptionManager(whisperKey);
          } else {
              if (whisperKey?.startsWith('sk-or-')) {
                  logger.warn('Whisper disabled: set GROQ_API_KEY (free) or WHISPER_API_KEY (real OpenAI key) to enable live transcription.');
              }
              return null;
          }

          mgr.on('transcription', async (text: string) => {
              if (currentSessionId) {
                  const mode = speaker === 'Caller' ? 'beginner' : undefined;
                  await this.handleTranscriptUpdate(ws, currentSessionId, text, speaker, contextManager, throttler, mode);
              }
          });
          return mgr;
      };

      callerTranscriptionManager = makeTranscriber('Caller');
      clientTranscriptionManager = makeTranscriber('Client');

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
                if (data.speaker === 'Caller' && callerTranscriptionManager) {
                    await callerTranscriptionManager.addAudioChunk(data.chunk);
                } else if (clientTranscriptionManager) {
                    await clientTranscriptionManager.addAudioChunk(data.chunk);
                }
                break;

              case 'TRANSCRIPT_UPDATE':
                if (!currentSessionId) return;
                await this.handleTranscriptUpdate(ws, currentSessionId, data.text, data.speaker, contextManager, throttler, data.mode as any);
                break;

              case 'END_CALL':
                if (currentSessionId) {
                  const insight = reIntelligence.analyzeConversation(contextManager.getContextString());
                  const sessionData = await prisma.callSession.findUnique({ where: { id: currentSessionId } });

                  await prisma.callSession.update({
                    where: { id: currentSessionId },
                    data: {
                      endTime: new Date(),
                      outcome: data.outcome,
                      motivation_detected: insight.motivation.join(', '),
                      urgency_level: insight.urgency,
                      deal_probability: insight.dealProbability,
                      seller_personality: insight.personality
                    }
                  });

                  if (sessionData) {
                      await prisma.lead.update({
                          where: { id: sessionData.leadId },
                          data: {
                              motivation_tags: insight.motivation.join(','),
                              deal_score: insight.dealProbability * 100
                          }
                      });
                  }

                  await prisma.transcript.create({
                    data: {
                      sessionId: currentSessionId,
                      content: contextManager.getContextString(),
                      jsonContent: contextManager.getMessagesJson()
                    }
                  });
                  logger.info('Call ended', { sessionId: currentSessionId });

                  // Generate call summary async — don't block CALL_ENDED response
                  const summaryTranscript = contextManager.getContextString();
                  const summaryInsight = insight;
                  const summaryLeadId = sessionData?.leadId;
                  setImmediate(async () => {
                    try {
                      const summary = await openAIService.generateCallSummary(summaryTranscript, summaryInsight);
                      if (ws.readyState === 1 /* OPEN */) {
                        ws.send(JSON.stringify({ type: 'CALL_SUMMARY', summary }));
                      }
                      // Auto-save summary as a lead note
                      if (summaryLeadId) {
                        const date = new Date().toLocaleDateString();
                        const noteLines = [
                          `📋 Call Summary (${date})`,
                          `Outcome: ${summary.outcome}`,
                          summary.seller_signals?.length ? `Signals: ${summary.seller_signals.join(', ')}` : '',
                          summary.objections_raised?.length ? `Objections: ${summary.objections_raised.join(', ')}` : '',
                          `Next Step: ${summary.recommended_followup}`,
                          `Callback Opener: "${summary.best_opener_for_callback}"`,
                        ].filter(Boolean).join('\n');
                        await prisma.note.create({ data: { leadId: summaryLeadId, content: noteLines } });
                      }
                    } catch (err: any) {
                      logger.error('CALL_SUMMARY generation failed', { error: err.message });
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

      ws.on('close', async () => {
        logger.info('WebSocket connection closed');
        if (currentSessionId) {
          try {
            const insight = reIntelligence.analyzeConversation(contextManager.getContextString());
            await prisma.callSession.update({
              where: { id: currentSessionId },
              data: {
                endTime: new Date(),
                outcome: 'Disconnected',
                motivation_detected: insight.motivation.join(', '),
                urgency_level: insight.urgency,
                deal_probability: insight.dealProbability,
                seller_personality: insight.personality
              }
            });
            const sessionData = await prisma.callSession.findUnique({ where: { id: currentSessionId } });
            if (sessionData) {
              await prisma.lead.update({
                where: { id: sessionData.leadId },
                data: { motivation_tags: insight.motivation.join(','), deal_score: insight.dealProbability * 100 }
              });
            }
            const existingTranscript = await prisma.transcript.findUnique({ where: { sessionId: currentSessionId } });
            if (!existingTranscript) {
              await prisma.transcript.create({
                data: {
                  sessionId: currentSessionId,
                  content: contextManager.getContextString(),
                  jsonContent: contextManager.getMessagesJson()
                }
              });
            }
            logger.info('Session auto-closed on disconnect', { sessionId: currentSessionId });
          } catch (err: any) {
            logger.error('Error auto-closing session on disconnect', { error: err.message });
          }
          currentSessionId = null;
        }
        if (callerTranscriptionManager) callerTranscriptionManager.removeAllListeners();
        if (clientTranscriptionManager) clientTranscriptionManager.removeAllListeners();
      });
    });
  }

  private async handleTranscriptUpdate(ws: any, sessionId: string, text: string, speaker: string, contextManager: ConversationContextManager, throttler: SuggestionThrottler, mode: any = 'beginner') {
      contextManager.addMessage(speaker, text);

      const fullContext = contextManager.getContextString();
      const insight = reIntelligence.analyzeConversation(fullContext);
      const strategy = StrategyEngine.getStrategy(insight);

      ws.send(JSON.stringify({
          type: 'NEW_TRANSCRIPT',
          text,
          speaker,
          timestamp: new Date(),
          insight,
          strategy
      }));

      if (speaker.toLowerCase() !== 'caller' && throttler.shouldGenerate()) {
          const suggestion = await openAIService.getRealtimeSuggestion(fullContext, mode, { ...insight, strategy: strategy.tone });

          await prisma.aISuggestion.create({
            data: {
              sessionId: sessionId,
              prompt: fullContext.slice(-200),
              response: JSON.stringify(suggestion)
            }
          });

          if (suggestion.detected_objection) {
            const rebuttals = ObjectionLibrary.getRebuttals(suggestion.detected_objection, insight.personality);

            await prisma.objection.create({
              data: {
                sessionId: sessionId,
                type: suggestion.detected_objection,
                text: text,
                rebuttal_soft: rebuttals.soft,
                rebuttal_firm: rebuttals.firm,
                rebuttal_aggressive: rebuttals.aggressive,
                rebuttal_empathy: rebuttals.empathy
              }
            });

            ws.send(JSON.stringify({
                type: 'AI_SUGGESTION',
                suggestion: {
                    ...suggestion,
                    multiStyleRebuttals: rebuttals
                }
            }));
          } else {
            ws.send(JSON.stringify({ type: 'AI_SUGGESTION', suggestion }));
          }
      }
  }
}
