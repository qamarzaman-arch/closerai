import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';

export const useWebSocket = () => {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<any>(null);
  const { addTranscriptEntry, addSuggestion, setIsCalling, setCurrentLead, confidenceMode } = useAppStore();

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    ws.current = new WebSocket('ws://localhost:3001');

    ws.current.onopen = () => {
      console.log('Connected to WebSocket');
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    };

    ws.current.onmessage = (event) => {
      try {
          const message = JSON.parse(event.data);
          switch (message.type) {
            case 'NEW_TRANSCRIPT':
              addTranscriptEntry({
                text: message.text,
                speaker: message.speaker,
                timestamp: new Date(message.timestamp),
              });
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
      } catch (e) {
          console.error('WS parse error:', e);
      }
    };

    ws.current.onclose = () => {
      console.log('WebSocket disconnected, retrying in 3s...');
      reconnectTimeout.current = setTimeout(connect, 3000);
    };

    ws.current.onerror = (err) => {
        console.error('WS Error:', err);
    };
  }, [addTranscriptEntry, addSuggestion, setIsCalling, setCurrentLead]);

  useEffect(() => {
    connect();
    const heartbeat = setInterval(() => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'PING' }));
        }
    }, 30000);

    return () => {
        clearInterval(heartbeat);
        if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
        ws.current?.close();
    };
  }, [connect]);

  const startCall = (leadId: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'START_CALL', leadId }));
    }
  };

  const endCall = (outcome: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'END_CALL', outcome }));
    }
  };

  const sendAudioChunk = (chunk: string) => {
      if (ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({
              type: 'AUDIO_CHUNK',
              chunk
          }));
      }
  };

  const sendTranscript = (text: string, speaker: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({
            type: 'TRANSCRIPT_UPDATE',
            text,
            speaker,
            mode: confidenceMode
        }));
    }
};

  return { startCall, endCall, sendAudioChunk, sendTranscript };
};
