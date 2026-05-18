import { TranscriptionManager } from './services/TranscriptionManager';
import fs from 'fs';
import path from 'path';

async function testAudioPipeline() {
  console.log('Testing Audio Pipeline & Transcription Manager...');

  if (!process.env.OPENAI_API_KEY) {
      console.log('Skipping real Whisper test: OPENAI_API_KEY not set.');
      return;
  }

  const manager = new TranscriptionManager(process.env.OPENAI_API_KEY);

  // Create a dummy PCM chunk (silence)
  const dummyPCM = new Int16Array(4096).fill(0);
  const base64Chunk = Buffer.from(dummyPCM.buffer).toString('base64');

  manager.on('transcription', (text) => {
      console.log('✅ Received transcription:', text);
  });

  console.log('Adding audio chunks...');
  // Add enough chunks to trigger processing
  for (let i = 0; i < 20; i++) {
      await manager.addAudioChunk(base64Chunk);
  }
}

testAudioPipeline().catch(console.error);
