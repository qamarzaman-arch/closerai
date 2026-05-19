import logger from '../utils/logger';

export interface Message {
  speaker: string;
  text: string;
}

export class ConversationContextManager {
  private messages: Message[] = [];
  private readonly MAX_MESSAGES = 10;

  addMessage(speaker: string, text: string) {
    this.messages.push({ speaker, text });
    if (this.messages.length > this.MAX_MESSAGES) {
      this.messages.shift();
    }
  }

  getContextString(): string {
    return this.messages.map(m => `${m.speaker}: ${m.text}`).join('\n');
  }

  getMessagesJson(): string {
    return JSON.stringify(this.messages);
  }

  getRecentClientMessage(): string | null {
    const clientMessages = this.messages.filter(m => m.speaker.toLowerCase() === 'client');
    return clientMessages.length > 0 ? clientMessages[clientMessages.length - 1].text : null;
  }
}

export class SuggestionThrottler {
  private lastSuggestionTime = 0;
  private readonly MIN_INTERVAL = 1500; // 1.5 seconds — fast enough for live call response

  shouldGenerate(): boolean {
    const now = Date.now();
    if (now - this.lastSuggestionTime > this.MIN_INTERVAL) {
      this.lastSuggestionTime = now;
      return true;
    }
    return false;
  }
}
