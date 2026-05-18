import OpenAI from 'openai';
import logger from '../utils/logger';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

export class TranscriptionManager extends EventEmitter {
  private openai: OpenAI;
  private audioBuffer: Buffer[] = [];
  private isProcessing = false;
  private readonly CHUNK_THRESHOLD = 16000 * 2 * 2; // 2 seconds of 16kHz 16-bit mono

  constructor(apiKey: string) {
    super();
    this.openai = new OpenAI({ apiKey });
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
    try {
      const bufferToProcess = Buffer.concat(this.audioBuffer);
      // Keep a small overlap for better transcription continuity
      this.audioBuffer = [bufferToProcess.slice(-4096)];

      const tempFile = path.join(__dirname, `../../temp_${Date.now()}.wav`);

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

      const transcription = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(tempFile),
        model: 'whisper-1',
        language: 'en',
      });

      fs.unlinkSync(tempFile);

      if (transcription.text.trim()) {
        this.emit('transcription', transcription.text);
      }
    } catch (error: any) {
      logger.error('Transcription error', { error: error.message });
    } finally {
      this.isProcessing = false;
    }
  }
}
