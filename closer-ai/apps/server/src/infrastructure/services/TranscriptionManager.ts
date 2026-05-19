import OpenAI from 'openai';
import logger from '../utils/logger';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

// Whisper hallucinates these phrases on silence — discard them
const WHISPER_HALLUCINATIONS = new Set([
  'thank you', 'thanks', 'thank you.', 'thanks.', 'thank you!',
  'you', 'you.', 'bye', 'bye.', 'goodbye', 'goodbye.',
  'thanks for watching', 'thanks for watching.', 'thank you for watching.',
  'please subscribe', 'like and subscribe',
  'uh', 'um', 'hmm', '...', '. . .', 'silence',
  'subtitles by', 'transcribed by', '[music]', '[applause]',
]);

function isHallucination(text: string): boolean {
  const t = text.trim().toLowerCase().replace(/[^\w\s]/g, '').trim();
  return WHISPER_HALLUCINATIONS.has(t) || WHISPER_HALLUCINATIONS.has(text.trim().toLowerCase());
}

// RMS energy of 16-bit PCM buffer — returns 0.0–1.0
function rmsEnergy(buf: Buffer): number {
  let sum = 0;
  for (let i = 0; i < buf.length - 1; i += 2) {
    const sample = buf.readInt16LE(i);
    sum += sample * sample;
  }
  return Math.sqrt(sum / (buf.length / 2)) / 32768;
}

export class TranscriptionManager extends EventEmitter {
  private openai: OpenAI;
  private audioBuffer: Buffer[] = [];
  private isProcessing = false;
  private readonly CHUNK_THRESHOLD = 16000 * 2 * 6; // 6 seconds of 16kHz 16-bit mono — stays under Groq 20 RPM with 2 channels
  private readonly model: string;
  private readonly SILENCE_THRESHOLD = 0.01; // RMS below this = silence, skip

  constructor(apiKey: string, baseURL?: string, model?: string) {
    super();
    this.model = model || 'whisper-1';
    this.openai = new OpenAI({ apiKey, baseURL: baseURL || 'https://api.openai.com/v1' });
  }

  async addAudioChunk(base64Chunk: string) {
    const chunk = Buffer.from(base64Chunk, 'base64');
    this.audioBuffer.push(chunk);

    const totalSize = this.audioBuffer.reduce((acc, curr) => acc + curr.length, 0);
    if (totalSize >= this.CHUNK_THRESHOLD && !this.isProcessing) {
      await this.processBuffer();
    }
  }

  private async processBuffer() {
    this.isProcessing = true;
    const tempFile = path.join(__dirname, `../../temp_${Date.now()}.wav`);
    try {
      const bufferToProcess = Buffer.concat(this.audioBuffer);
      // Keep a small overlap for better transcription continuity
      this.audioBuffer = [bufferToProcess.slice(-4096)];

      // Skip silent chunks — prevents Whisper hallucinations on silence
      if (rmsEnergy(bufferToProcess) < this.SILENCE_THRESHOLD) {
        return;
      }

      // Simple WAV header for 16kHz 16-bit Mono
      const wavHeader = Buffer.alloc(44);
      wavHeader.write('RIFF', 0);
      wavHeader.writeUInt32LE(36 + bufferToProcess.length, 4);
      wavHeader.write('WAVE', 8);
      wavHeader.write('fmt ', 12);
      wavHeader.writeUInt32LE(16, 16);
      wavHeader.writeUInt16LE(1, 20);
      wavHeader.writeUInt16LE(1, 22);
      wavHeader.writeUInt32LE(16000, 24);
      wavHeader.writeUInt32LE(16000 * 2, 28);
      wavHeader.writeUInt16LE(2, 32);
      wavHeader.writeUInt16LE(16, 34);
      wavHeader.write('data', 36);
      wavHeader.writeUInt32LE(bufferToProcess.length, 40);

      fs.writeFileSync(tempFile, Buffer.concat([wavHeader, bufferToProcess]));

      let transcription: any;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          transcription = await this.openai.audio.transcriptions.create({
            file: fs.createReadStream(tempFile),
            model: this.model,
            language: 'en',
          });
          break;
        } catch (err: any) {
          if (err.status === 429 && attempt < 2) {
            // Extract retry-after from error message (Groq says "try again in Xs")
            const seconds = parseInt(err.message?.match(/in (\d+)s/)?.[1] || '5', 10);
            await new Promise(r => setTimeout(r, seconds * 1000 + 500));
          } else {
            throw err;
          }
        }
      }

      const text = transcription?.text?.trim();
      if (text && !isHallucination(text)) {
        this.emit('transcription', text);
      } else if (text) {
        logger.debug('Whisper hallucination filtered', { text });
      }
    } catch (error: any) {
      logger.error('Transcription error', { error: error.message });
    } finally {
      // Always clean up temp file regardless of success or failure
      if (fs.existsSync(tempFile)) {
        try { fs.unlinkSync(tempFile); } catch (_) {}
      }
      this.isProcessing = false;
    }
  }
}
