import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';

let globalWs: WebSocket | null = null;

export const useWebSocket = () => {
  const { addTranscriptEntry, addSuggestion, setIsCalling, setCurrentLead, confidenceMode, setInsight, setStrategy } = useAppStore();
  const storeRef = useRef({ addTranscriptEntry, addSuggestion, setIsCalling, setCurrentLead, setInsight, setStrategy });

  // Keep refs up to date without triggering effects
  storeRef.current = { addTranscriptEntry, addSuggestion, setIsCalling, setCurrentLead, setInsight, setStrategy };

  useEffect(() => {
    if (!globalWs || globalWs.readyState === WebSocket.CLOSED) {
      globalWs = new WebSocket('ws://localhost:3001');

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
    }
  }, []);

  const startCall = (leadId: string) => globalWs?.send(JSON.stringify({ type: 'START_CALL', leadId }));
  const endCall = (outcome: string) => globalWs?.send(JSON.stringify({ type: 'END_CALL', outcome }));
  const sendAudioChunk = (chunk: string) => globalWs?.send(JSON.stringify({ type: 'AUDIO_CHUNK', chunk }));
  const sendTranscript = (text: string, speaker: string) => {
      globalWs?.send(JSON.stringify({ type: 'TRANSCRIPT_UPDATE', text, speaker, mode: confidenceMode }));
  };

  return { startCall, endCall, sendAudioChunk, sendTranscript };
};
