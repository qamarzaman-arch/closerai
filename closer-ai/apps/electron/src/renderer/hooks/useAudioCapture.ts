import { useRef, useState } from 'react';

type Speaker = 'Caller' | 'Client';

// Inline AudioWorklet processor — avoids separate file and ScriptProcessorNode deprecation
const WORKLET_CODE = `
class PCMProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0]?.[0];
    if (ch) this.port.postMessage(ch);
    return true;
  }
}
registerProcessor('pcm-processor', PCMProcessor);
`;

function floatToPCMBase64(floatData: Float32Array): string {
  const pcm = new Int16Array(floatData.length);
  for (let i = 0; i < floatData.length; i++) {
    pcm[i] = Math.max(-1, Math.min(1, floatData[i])) * 0x7fff;
  }
  const bytes = new Uint8Array(pcm.buffer);
  let binary = '';
  for (let j = 0; j < bytes.byteLength; j++) {
    binary += String.fromCharCode(bytes[j]);
  }
  return btoa(binary);
}

async function buildAudioWorklet(
  stream: MediaStream,
  onChunk: (base64: string) => void
): Promise<{ ctx: AudioContext; worklet: AudioWorkletNode }> {
  const ctx = new AudioContext({ sampleRate: 16000 });

  // Load worklet from a blob URL — no external file needed
  const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' });
  const blobUrl = URL.createObjectURL(blob);
  try {
    await ctx.audioWorklet.addModule(blobUrl);
  } finally {
    URL.revokeObjectURL(blobUrl);
  }

  const source = ctx.createMediaStreamSource(stream);
  const worklet = new AudioWorkletNode(ctx, 'pcm-processor');

  worklet.port.onmessage = (e: MessageEvent<Float32Array>) => {
    onChunk(floatToPCMBase64(e.data));
  };

  source.connect(worklet);
  worklet.connect(ctx.destination);

  return { ctx, worklet };
}

export const useAudioCapture = (
  onAudioChunk: (base64Chunk: string, speaker: Speaker) => void
) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isListeningToCall, setIsListeningToCall] = useState(false);

  const micCtx = useRef<AudioContext | null>(null);
  const micWorklet = useRef<AudioWorkletNode | null>(null);
  const micStream = useRef<MediaStream | null>(null);

  const sysCtx = useRef<AudioContext | null>(null);
  const sysWorklet = useRef<AudioWorkletNode | null>(null);
  const sysStream = useRef<MediaStream | null>(null);

  // Lock prevents concurrent start calls (the 30× click problem)
  const startingSystem = useRef(false);

  // ── Microphone ────────────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      micStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      const { ctx, worklet } = await buildAudioWorklet(
        micStream.current,
        (chunk) => onAudioChunk(chunk, 'Caller')
      );
      micCtx.current = ctx;
      micWorklet.current = worklet;
      setIsRecording(true);
    } catch (err) {
      console.error('Mic capture failed:', err);
    }
  };

  const stopRecording = () => {
    micWorklet.current?.disconnect();
    micWorklet.current = null;
    micCtx.current?.close();
    micCtx.current = null;
    micStream.current?.getTracks().forEach((t) => t.stop());
    micStream.current = null;
    setIsRecording(false);
  };

  // ── System audio (Zoom / Google Meet / any platform) ─────────────────────
  // Requires setDisplayMediaRequestHandler in main process (main.js).
  // On Windows: 'loopback' captures all system audio automatically.
  // On Mac/Linux: user chooses the window to share + enables "Share audio" in the dialog.
  const startListeningToCall = async (): Promise<boolean> => {
    if (startingSystem.current || isListeningToCall) return false;
    startingSystem.current = true;
    try {
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: { width: 1, height: 1, frameRate: 1 },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          sampleRate: 16000,
        },
      });

      // Drop video — audio only
      stream.getVideoTracks().forEach((t: MediaStreamTrack) => t.stop());

      const audioTracks: MediaStreamTrack[] = stream.getAudioTracks();
      if (!audioTracks.length) {
        console.warn('No audio track — user may not have enabled audio sharing.');
        return false;
      }

      sysStream.current = stream;
      const { ctx, worklet } = await buildAudioWorklet(
        stream,
        (chunk) => onAudioChunk(chunk, 'Client')
      );
      sysCtx.current = ctx;
      sysWorklet.current = worklet;

      // Auto-stop if user ends sharing from browser toolbar
      audioTracks[0].addEventListener('ended', () => stopListeningToCall(), { once: true });

      setIsListeningToCall(true);
      return true;
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        console.error('System audio capture failed:', err);
      }
      return false;
    } finally {
      startingSystem.current = false;
    }
  };

  const stopListeningToCall = () => {
    sysWorklet.current?.disconnect();
    sysWorklet.current = null;
    sysCtx.current?.close();
    sysCtx.current = null;
    sysStream.current?.getTracks().forEach((t) => t.stop());
    sysStream.current = null;
    setIsListeningToCall(false);
  };

  return {
    isRecording,
    isListeningToCall,
    startRecording,
    stopRecording,
    startListeningToCall,
    stopListeningToCall,
  };
};
