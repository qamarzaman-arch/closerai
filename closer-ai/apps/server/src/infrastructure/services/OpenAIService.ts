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
      baseURL: process.env.OPENAI_BASE_URL,
      defaultHeaders: {
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:5173',
        'X-Title': process.env.OPENROUTER_APP_NAME || 'CloserAI',
      },
    });
  }
  return openai;
}

function getModel() {
  return process.env.OPENAI_MODEL || 'meta-llama/llama-3.1-8b-instruct:free';
}

// Free/local models don't support response_format=json_object — extract JSON from text
function extractJSON(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      return JSON.parse(text.slice(start, end + 1));
    }
    throw new Error('No JSON found in response');
  }
}

export type ConfidenceMode = 'beginner' | 'intermediate' | 'advanced';

export class OpenAIService {
  async generateCallScript(lead: any, mode: ConfidenceMode = 'beginner') {
    const ai = getOpenAI();
    if (!ai) return this.getFallbackScript(lead);

    try {
        const researchContext = this.buildLeadResearchContext(lead);
        const prompt = `
          You are a professional real estate acquisition specialist.
          Generate a high-converting cold calling script for:
          Name: ${lead.full_name}
          Property: ${lead.property_address}
          LinkedIn/Profile: ${lead.linkedin_url || 'Unknown'}
          Website: ${lead.website_url || 'Unknown'}
          Motivation: ${lead.seller_motivation || 'Unknown'}
          Value: ${lead.estimated_value || 'Unknown'}
          Existing Notes: ${lead.notes || 'None'}

          Custom Research Context:
          ${researchContext}

          Confidence Mode: ${mode}

          Guidelines:
          - Style: Native American Sales (Direct, confident, yet polite).
          - Complexity: ${mode === 'beginner' ? 'EXTREMELY SIMPLE English. Short 5-word sentences. Easy pronunciation.' : 'Professional and persuasive.'}
          - Structure: Opening, Rapport, Pitch (Problem/Solution), Objection handling for "not interested", and a clear Call to Action (the "Close").
          - Tone: Empathetic but business-focused. Avoid "I was wondering if..." use "I\'m calling because..."
          - Use the custom profile notes, websites, and LinkedIn context only when it helps sound relevant and human.
          - Do not invent facts that are not in the lead profile or research context.

          Format as JSON: { opening, rapport, pitch, pain_points, objections, closing, follow_up, personalization_notes, research_used }
        `;

        const response = await ai.chat.completions.create({
          model: getModel(),
          messages: [{ role: 'system', content: 'You are a real estate sales expert. Always respond with valid JSON only.' }, { role: 'user', content: prompt }],
        }, { timeout: 8000 });

        return extractJSON(response.choices[0].message.content || '{}');
    } catch (e: any) {
        logger.error('Script generation failed', { error: e.message });
        return this.getFallbackScript(lead);
    }
  }

  async getRealtimeSuggestion(context: string, mode: ConfidenceMode = 'beginner', insight?: any) {
    const ai = getOpenAI();

    try {
        const isSimple = mode === 'beginner';
        const systemPrompt = `
You are a LIVE real estate sales copilot. User is ON AN ACTIVE CALL right now. Response must be INSTANT and USABLE in under 5 seconds.

SELLER PROFILE:
- Personality: ${insight?.personality || 'Unknown'}
- Motivations: ${insight?.motivation?.join(', ') || 'Detecting...'}
- Deal Probability: ${Math.round((insight?.dealProbability || 0.1) * 100)}%
- Urgency: ${insight?.urgency || 1}/10
- Strategy: ${insight?.strategy || 'Build rapport'}

YOUR JOB:
1. suggested_response — Say this VERBATIM. ${isSimple ? 'Max 10 simple words. Native English. Easy to say fast.' : 'Natural, confident American English. One punchy sentence.'}
2. detected_objection — Exact type or null. Types: PRICE_OBJECTION | NOT_INTERESTED | AGENT_OBJECTION | TIMING_OBJECTION | TRUST_OBJECTION | NEED_TO_THINK | SPOUSE_OBJECTION | null
3. rebuttal — Only if objection detected. One sentence. ${isSimple ? 'Short words.' : 'Sharp and direct.'}
4. confidence_tips — HOW to say it. Tone/pace/emphasis. Max 12 words.
5. pronunciation_score — How easy to pronounce fast under pressure. 1-10.
6. urgency_level — How urgent is a reply needed right now. 1=low 10=critical. Base on seller tone.

RULES:
- NO filler phrases ("I understand", "Great question")
- NO AI language ("As your copilot...")
- Real investor talk: direct, human, confident
- If seller sounds angry/frustrated: urgency_level = 8+
- If seller shows buying signal: urgency_level = 9+

Format: { suggested_response, detected_objection, rebuttal, confidence_tips, pronunciation_score, urgency_level }
        `.trim();

        if (!ai) {
            return {
                suggested_response: "Got it. How long have you owned the place?",
                detected_objection: null,
                rebuttal: null,
                confidence_tips: "Speak slow, steady voice.",
                pronunciation_score: 10,
                urgency_level: 5
            };
        }

        const response = await ai.chat.completions.create({
          model: getModel(),
          messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `LIVE TRANSCRIPT (most recent last):\n${context}\n\nRespond with valid JSON only.` }
          ],
          temperature: 0.4,
        }, { timeout: 4000 });

        return extractJSON(response.choices[0].message.content || '{}');
    } catch (e: any) {
        logger.error('AI Suggestion failed', { error: e.message });
        return {
            suggested_response: "Are you open to a quick cash offer?",
            detected_objection: null,
            rebuttal: null,
            confidence_tips: "Keep the momentum going.",
            pronunciation_score: 9,
            urgency_level: 5
        };
    }
  }

  async generateCallSummary(transcript: string, insight: any): Promise<any> {
    const ai = getOpenAI();
    const fallback = {
      outcome: 'Call completed. Review transcript for details.',
      seller_signals: insight?.motivation || [],
      objections_raised: [],
      recommended_followup: insight?.urgency > 5 ? 'Call back within 24 hours' : 'Follow up in 3–5 days',
      best_opener_for_callback: `Hi, I called earlier about your property. Did you get a chance to think about it?`,
    };
    if (!ai || !transcript.trim()) return fallback;

    try {
      const prompt = `You are a real estate acquisition analyst. Analyze this cold call transcript.

TRANSCRIPT:
${transcript.slice(-3000)}

SELLER INSIGHT:
- Personality: ${insight?.personality || 'Unknown'}
- Motivations: ${insight?.motivation?.join(', ') || 'None detected'}
- Urgency: ${insight?.urgency || 1}/10
- Deal Probability: ${Math.round((insight?.dealProbability || 0.1) * 100)}%

Return JSON with:
{
  "outcome": "one sentence: how call went, seller's mood, key result",
  "seller_signals": ["max 3 specific things seller said that signal intent"],
  "objections_raised": ["each objection the seller gave"],
  "recommended_followup": "specific next action with exact timing (e.g. 'Call back Thursday morning')",
  "best_opener_for_callback": "exact verbatim first line to use on next call, personalized to what was said"
}`;

      const res = await ai.chat.completions.create({
        model: getModel(),
        messages: [{ role: 'user', content: prompt + '\n\nRespond with valid JSON only.' }],
        temperature: 0.3,
      }, { timeout: 15000 });

      return extractJSON(res.choices[0].message.content || '{}');
    } catch (e: any) {
      logger.error('Call summary generation failed', { error: e.message });
      return fallback;
    }
  }

  async analyzeLeadProfile(lead: any): Promise<{ title: string; content: string }> {
    const ai = getOpenAI();
    const fallback = {
      title: 'AI Research — ' + lead.full_name,
      content: JSON.stringify({
        personality_profile: 'AI not configured — add OPENAI_API_KEY to enable research.',
        likely_motivations: [lead.seller_motivation || 'Unknown'].filter(Boolean),
        pain_points: [],
        talking_points: [],
        personalized_opener: `Hi ${lead.full_name}, I\'m calling about ${lead.property_address || 'your property'}.`,
        rapport_hooks: lead.notes ? [lead.notes] : [],
        expected_objections: [],
        approach_recommendation: 'No AI configured.',
        red_flags: [],
      }),
    };
    if (!ai) return fallback;

    try {
      const prompt = `You are a real estate acquisition specialist preparing for a cold call.
Analyze this lead profile and create a detailed, actionable research document.

LEAD PROFILE:
- Name: ${lead.full_name}
- Property: ${lead.property_address || 'Unknown'}
- Property Type: ${lead.property_type || 'Unknown'}
- Estimated Value: ${lead.estimated_value ? '$' + lead.estimated_value.toLocaleString() : 'Unknown'}
- Seller Motivation (self-reported): ${lead.seller_motivation || 'Unknown'}
- LinkedIn URL: ${lead.linkedin_url || 'Not provided'}
- Website URL: ${lead.website_url || 'Not provided'}
- Notes / Background: ${lead.notes || 'None'}
- Current Tags: ${lead.motivation_tags || 'None'}

Based on this profile, create a comprehensive research document. Infer what you can from the name, property location, URLs, and notes. If LinkedIn/website URLs are provided, infer what you can from the domain/path even without scraping.

Return JSON:
{
  "personality_profile": "2-3 sentences on likely personality and communication style",
  "likely_motivations": ["motivation 1", "motivation 2", "motivation 3"],
  "pain_points": ["specific pain point 1", "pain point 2", "pain point 3"],
  "talking_points": ["personalized talking point referencing their situation", "..."],
  "personalized_opener": "exact verbatim first sentence to say that references something specific about them",
  "rapport_hooks": ["personal detail or context to build rapport", "..."],
  "expected_objections": ["likely objection 1 and how to counter", "..."],
  "approach_recommendation": "1-2 sentences: best overall strategy for this specific person",
  "red_flags": ["anything to watch out for if any"]
}`;

      const res = await ai.chat.completions.create({
        model: getModel(),
        messages: [{ role: 'user', content: prompt + '\n\nRespond with valid JSON only.' }],
        temperature: 0.4,
      }, { timeout: 20000 });

      const data = extractJSON(res.choices[0].message.content || '{}');
      // Store raw JSON so the frontend modal can render structured sections
      return { title: `AI Research — ${lead.full_name}`, content: JSON.stringify(data) };
    } catch (e: any) {
      logger.error('Lead profile analysis failed', { error: e.message });
      return fallback;
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
        follow_up: "I\'ll check back in a few days.",
        personalization_notes: lead.linkedin_url || lead.website_url ? "Mention only public profile or website context if it feels natural." : "No extra research context available.",
        research_used: this.buildLeadResearchContext(lead)
    };
  }

  private buildLeadResearchContext(lead: any) {
    const resources = Array.isArray(lead.resources) ? lead.resources : [];
    const lines = [
      lead.linkedin_url ? `LinkedIn/Profile URL: ${lead.linkedin_url}` : '',
      lead.website_url ? `Website URL: ${lead.website_url}` : '',
      ...resources.map((resource: any) => {
        const url = resource.url ? ` (${resource.url})` : '';
        return `- ${resource.type}: ${resource.title}${url}\n${resource.content}`;
      }),
    ].filter(Boolean);

    return lines.length ? lines.join('\n') : 'No custom research resources attached.';
  }
}
