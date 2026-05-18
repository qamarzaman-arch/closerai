import { ConversationContextManager } from '../src/infrastructure/services/ConversationEngine';

describe('ConversationContextManager', () => {
  it('should maintain the message history within limits', () => {
    const manager = new ConversationContextManager();
    for (let i = 0; i < 15; i++) {
      manager.addMessage('Speaker', `Message ${i}`);
    }
    const context = manager.getContextString();
    expect(context.split('\n').length).toBe(10);
    expect(context).toContain('Message 14');
  });
});
