"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ConversationEngine_1 = require("../src/services/ConversationEngine");
describe('ConversationContextManager', () => {
    it('should maintain the message history within limits', () => {
        const manager = new ConversationEngine_1.ConversationContextManager();
        for (let i = 0; i < 15; i++) {
            manager.addMessage('Speaker', `Message ${i}`);
        }
        const context = manager.getContextString();
        expect(context.split('\n').length).toBe(10);
        expect(context).toContain('Message 14');
        expect(context).not.toContain('Message 0');
    });
});
