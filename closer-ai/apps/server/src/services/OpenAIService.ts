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
          Generate a cold calling script for a real estate lead.
          Lead Info:
          Name: ${lead.full_name}
          Property: ${lead.property_address}
          Motivation: ${lead.seller_motivation}
          Value: ${lead.estimated_value}

          Confidence Mode: ${mode}

          Requirements:
          - Sound natural and like a native American sales person.
          - Use SIMPLE English (crucial for non-native speakers).
          - Avoid corporate jargon.
          - Use short sentences.
          - Include: opening, rapport-building, personalized pitch, pain-point references, objection handling, closing, and follow-up questions.

          Format the response as JSON with these keys: opening, rapport, pitch, pain_points, objections, closing, follow_up.
        `;

        const response = await ai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        }, { timeout: 5000 });

        return JSON.parse(response.choices[0].message.content || '{}');
    } catch (e: any) {
        logger.error('Script generation failed', { error: e.message });
        return this.getFallbackScript(lead);
    }
  }

  async getRealtimeSuggestion(context: string, mode: ConfidenceMode = 'beginner') {
    const ai = getOpenAI();
    const detection = this.detectObjectionManual(context);

    if (!ai) return {
        suggested_response: detection.rebuttal || 'That makes sense. Can you tell me more?',
        detected_objection: detection.type,
        rebuttal: detection.rebuttal,
        confidence_tips: 'Keep listening carefully.'
    };

    try {
        const prompt = `
          You are a real-time sales copilot for a non-native English speaker.
          Current conversation context:
          "${context}"

          Confidence Mode: ${mode}

          Provide:
          1. A suggested next response.
          2. Detection of any objections.
          3. A rebuttal for the objection.

          Prioritize easy-to-speak English and natural tone.

          Format the response as JSON with keys: suggested_response, detected_objection, rebuttal, confidence_tips.
        `;

        const response = await ai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'system', content: 'You are a concise sales coach.' }, { role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        }, { timeout: 3000 });

        const aiResult = JSON.parse(response.choices[0].message.content || '{}');
        return {
            ...aiResult,
            detected_objection: aiResult.detected_objection || detection.type,
            rebuttal: aiResult.rebuttal || detection.rebuttal
        };
    } catch (e: any) {
        logger.error('AI Suggestion failed', { error: e.message });
        return {
            suggested_response: detection.rebuttal || 'I see. How long have you lived there?',
            detected_objection: detection.type,
            rebuttal: detection.rebuttal,
            confidence_tips: 'Stay calm and professional.'
        };
    }
  }

  private detectObjectionManual(context: string) {
    const lower = context.toLowerCase();
    if (lower.includes('not interested') || lower.includes('don\'t want to sell')) {
        return { type: 'NOT_INTERESTED', rebuttal: 'I understand. Are you staying for the long term or just not ready yet?' };
    }
    if (lower.includes('working with an agent') || lower.includes('have a realtor')) {
        return { type: 'ALREADY_HAS_AGENT', rebuttal: 'Great! Is that a family friend, or someone you found recently?' };
    }
    if (lower.includes('price') || lower.includes('too low') || lower.includes('money')) {
        return { type: 'PRICE_OBJECTION', rebuttal: 'I hear you. What number did you have in mind for a hassle-free cash offer?' };
    }
    return { type: null, rebuttal: null };
  }

  private getFallbackScript(lead: any) {
      return {
        opening: `Hi, is this ${lead.full_name}? I'm calling about ${lead.property_address || 'your property'}.`,
        rapport: "I was just looking at some houses in your neighborhood and yours caught my eye.",
        pitch: "I'm a local investor and I'm looking to buy a few more properties. Would you be open to an offer?",
        pain_points: "We buy as-is, so you don't have to worry about repairs or commissions.",
        objections: "If they say no, ask if they know anyone else who might be selling.",
        closing: "I'd love to send you a no-obligation offer. What's the best email for you?",
        follow_up: "I'll follow up with you in a couple of days."
    };
  }
}
