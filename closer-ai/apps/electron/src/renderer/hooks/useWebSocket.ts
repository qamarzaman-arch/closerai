import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';

let globalWs: WebSocket | null = null;
let reconnectTimer: number | null = null;
const pendingMessages: string[] = [];

export const useWebSocket = () => {
  const { addTranscriptEntry, addSuggestion, setIsCalling, setCurrentLead, confidenceMode, setInsight, setStrategy } = useAppStore();
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const storeRef = useRef({ addTranscriptEntry, addSuggestion, setIsCalling, setCurrentLead, setInsight, setStrategy });

  // Keep refs up to date without triggering effects
  storeRef.current = { addTranscriptEntry, addSuggestion, setIsCalling, setCurrentLead, setInsight, setStrategy };

  const connect = () => {
    if (globalWs?.readyState === WebSocket.OPEN || globalWs?.readyState === WebSocket.CONNECTING) return;

      setConnectionStatus('connecting');
      globalWs = new WebSocket('ws://localhost:3001');

      globalWs.onopen = () => {
        setConnectionStatus('connected');
        while (pendingMessages.length && globalWs?.readyState === WebSocket.OPEN) {
          globalWs.send(pendingMessages.shift() as string);
        }
      };

      globalWs.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            const { addTranscriptEntry, addSuggestion, setIsCalling, setCurrentLead, setInsight, setStrategy } = storeRef.current;

            switch (message.type) {
              case 'NEW_TRANSCRIPT':
                addTranscriptEntry({
                  text: message.text,
                  speaker: message.speaker,
                  timestamp: new Date(message.timestamp),
                });
                if (message.insight) setInsight(message.insight);
                if (message.strategy) setStrategy(message.strategy);
                break;
              case 'AI_SUGGESTION':
                addSuggestion(message.suggestion);
                break;
              case 'CALL_STARTED':
                setIsCalling(true);
                break;
              case 'CALL_ENDED':
                setIsCalling(false);
                setCurrentLead(null);
                break;
            }
        } catch (e) { console.error(e); }
      };

      globalWs.onclose = () => {
        setConnectionStatus('disconnected');
        if (reconnectTimer) window.clearTimeout(reconnectTimer);
        reconnectTimer = window.setTimeout(connect, 1000);
      };
  };

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
    }
  }, []);

  const sendMessage = (message: object) => {
    const payload = JSON.stringify(message);
    if (globalWs?.readyState === WebSocket.OPEN) {
      globalWs.send(payload);
      return;
    }
    pendingMessages.push(payload);
    connect();
  };

  const startCall = (leadId: string) => sendMessage({ type: 'START_CALL', leadId });
  const endCall = (outcome: string) => sendMessage({ type: 'END_CALL', outcome });
  const sendAudioChunk = (chunk: string) => sendMessage({ type: 'AUDIO_CHUNK', chunk });
  const sendTranscript = (text: string, speaker: string) => {
      sendMessage({ type: 'TRANSCRIPT_UPDATE', text, speaker, mode: confidenceMode });
  };

  return { startCall, endCall, sendAudioChunk, sendTranscript, connectionStatus };
};
