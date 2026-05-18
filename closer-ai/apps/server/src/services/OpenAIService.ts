import OpenAI from 'openai';
import dotenv from 'dotenv';
import logger from '../utils/logger';

dotenv.config();

let openai: OpenAI | null = null;

function getOpenAI() {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      logger.warn('OPENAI_API_KEY is not set. AI features will not work.');
      return null;
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

export type ConfidenceMode = 'beginner' | 'intermediate' | 'advanced';

export class OpenAIService {
  async generateCallScript(lead: any, mode: ConfidenceMode = 'beginner') {
    const ai = getOpenAI();
    if (!ai) return this.getFallbackScript(lead);

    try {
        const prompt = `
          You are a professional real estate acquisition specialist.
          Generate a high-converting cold calling script for:
          Name: ${lead.full_name}
          Property: ${lead.property_address}
          Motivation: ${lead.seller_motivation || 'Unknown'}
          Value: ${lead.estimated_value || 'Unknown'}

          Confidence Mode: ${mode}

          Guidelines:
          - Style: Native American Sales (Direct, confident, yet polite).
          - Complexity: ${mode === 'beginner' ? 'EXTREMELY SIMPLE English. Short 5-word sentences. Easy pronunciation.' : 'Professional and persuasive.'}
          - Structure: Opening, Rapport, Pitch (Problem/Solution), Objection handling for "not interested", and a clear Call to Action (the "Close").
          - Tone: Empathetic but business-focused. Avoid "I was wondering if..." use "I\'m calling because..."

          Format as JSON: { opening, rapport, pitch, pain_points, objections, closing, follow_up }
        `;

        const response = await ai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'system', content: 'You are a real estate sales expert.' }, { role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        }, { timeout: 5000 });

        return JSON.parse(response.choices[0].message.content || '{}');
    } catch (e: any) {
        logger.error('Script generation failed', { error: e.message });
        return this.getFallbackScript(lead);
    }
  }

  async getRealtimeSuggestion(context: string, mode: ConfidenceMode = 'beginner', insight?: any) {
    const ai = getOpenAI();

    try {
        const systemPrompt = `
            You are a Real Estate Sales Copilot for a non-native speaker.

            Seller Context:
            - Personality: ${insight?.personality || 'Unknown'}
            - Motivation: ${insight?.motivation?.join(', ') || 'Unknown'}
            - Strategy: ${insight?.strategy || 'Build rapport'}

            Task:
            1. Suggest the next best response.
            2. Detect objections.
            3. Provide a rebuttal tailored to their personality.
            4. Provide "Confidence Tips" (how to say it, what to emphasize).

            Constraints:
            - Language: ${mode === 'beginner' ? 'Level 1 English. No big words. Max 7 words per sentence.' : 'Natural conversational American English.'}
            - Style: Real estate investor style (We buy houses).
            - Avoid: "I am an AI", "How can I help you", robotic formal language.

            Format as JSON: { suggested_response, detected_objection, rebuttal, confidence_tips, pronunciation_score (1-10) }
        `;

        if (!ai) {
            return {
                suggested_response: "Got it. How long have you owned the place?",
                detected_objection: null,
                rebuttal: null,
                confidence_tips: "Speak slowly and clearly.",
                pronunciation_score: 10
            };
        }

        const response = await ai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Recent Transcript:\n${context}` }
          ],
          response_format: { type: 'json_object' },
          timeout: 3000,
        });

        return JSON.parse(response.choices[0].message.content || '{}');
    } catch (e: any) {
        logger.error('AI Suggestion failed', { error: e.message });
        return {
            suggested_response: "I see. Are you open to a cash offer?",
            detected_objection: null,
            rebuttal: null,
            confidence_tips: "Keep the momentum going.",
            pronunciation_score: 9
        };
    }
  }

  private getFallbackScript(lead: any) {
      return {
        opening: `Hi, is this ${lead.full_name}? I\'m calling about ${lead.property_address || 'your house'}.`,
        rapport: "I was looking at some houses in your area and yours caught my eye.",
        pitch: "I\'m a local investor and I buy houses for cash. Would you be open to an offer?",
        pain_points: "We buy as-is. No repairs. No fees.",
        objections: "If they aren\'t selling, ask if they have any other properties.",
        closing: "I\'d love to send you a simple offer. What\'s your email?",
        follow_up: "I\'ll check back in a few days."
    };
  }
}
