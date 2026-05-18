import { ConversationContextManager, SuggestionThrottler } from './services/ConversationEngine';
import { OpenAIService } from './services/OpenAIService';

async function testSuggestionLogic() {
  console.log('Testing Conversation Context & Throttling...');
  const context = new ConversationContextManager();
  const throttler = new SuggestionThrottler();
  const openAI = new OpenAIService();

  context.addMessage('Caller', 'Hello, this is CloserAI.');
  context.addMessage('Client', 'I am not interested in selling my house right now.');

  if (throttler.shouldGenerate()) {
      console.log('✅ Throttler allowed first suggestion');
  }

  if (!throttler.shouldGenerate()) {
      console.log('✅ Throttler correctly blocked rapid second suggestion');
  }

  const suggestion = await openAI.getRealtimeSuggestion(context.getContextString(), 'beginner');
  console.log('Generated Suggestion:', suggestion);

  if (suggestion.detected_objection === 'NOT_INTERESTED') {
      console.log('✅ Manual/AI Objection Detection Logic verified');
  } else {
      console.error('❌ Objection detection failed');
  }
}

testSuggestionLogic().catch(console.error);
