import { useRef, useState } from 'react';

export const useAudioCapture = (onAudioChunk: (base64Chunk: string) => void) => {
  const [isRecording, setIsRecording] = useState(false);
  const audioContext = useRef<AudioContext | null>(null);
  const processor = useRef<ScriptProcessorNode | null>(null);
  const stream = useRef<MediaStream | null>(null);

  const startRecording = async () => {
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext.current = new AudioContext({ sampleRate: 16000 });
      const source = audioContext.current.createMediaStreamSource(stream.current);

      processor.current = audioContext.current.createScriptProcessor(4096, 1, 1);

      source.connect(processor.current);
      processor.current.connect(audioContext.current.destination);

      processor.current.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
        }

        const base64Chunk = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
        onAudioChunk(base64Chunk);
      };

      setIsRecording(true);
    } catch (error) {
      console.error('Error starting audio capture:', error);
    }
  };

  const stopRecording = () => {
    if (processor.current) {
        processor.current.disconnect();
        processor.current = null;
    }
    if (audioContext.current) {
        audioContext.current.close();
        audioContext.current = null;
    }
    if (stream.current) {
      stream.current.getTracks().forEach(track => track.stop());
      stream.current = null;
    }
    setIsRecording(false);
  };

  return { isRecording, startRecording, stopRecording };
};
