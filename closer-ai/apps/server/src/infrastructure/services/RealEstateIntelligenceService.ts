import { EventEmitter } from 'events';
import logger from '../utils/logger';

export interface SellerInsight {
    motivation: string[];
    urgency: number; // 1-10
    dealProbability: number; // 0-1
    personality: 'Analytical' | 'Skeptical' | 'Motivated' | 'Emotional' | 'Aggressive';
    distressedSignals: string[];
}

export class RealEstateIntelligenceService {
    analyzeConversation(transcript: string): SellerInsight {
        const lower = transcript.toLowerCase();
        const insight: SellerInsight = {
            motivation: [],
            urgency: 1,
            dealProbability: 0.1,
            personality: 'Motivated',
            distressedSignals: []
        };

        // Motivation Detection
        if (lower.includes('foreclosure') || lower.includes('behind on payments') || lower.includes('short sale')) {
            insight.motivation.push('Financial Stress');
            insight.distressedSignals.push('Pre-foreclosure');
            insight.urgency += 5;
        }
        if (lower.includes('inherited') || lower.includes('probate') || lower.includes('passed away') || lower.includes('estate')) {
            insight.motivation.push('Probate/Inherited');
            insight.urgency += 2;
        }
        if (lower.includes('divorce') || lower.includes('splitting up') || lower.includes('separation')) {
            insight.motivation.push('Divorce');
            insight.urgency += 4;
        }
        if (lower.includes('relocating') || lower.includes('moving for work') || lower.includes('job') || lower.includes('transfer')) {
            insight.motivation.push('Relocation');
            insight.urgency += 3;
        }
        if (lower.includes('tenant') || lower.includes('rent') || lower.includes('landlord') || lower.includes('eviction')) {
            insight.motivation.push('Tired Landlord');
        }
        if (lower.includes('for sale by owner') || lower.includes('fsbo') || lower.includes('without an agent')) {
            insight.motivation.push('FSBO');
        }
        if (lower.includes('vacant') || lower.includes('empty') || lower.includes('nobody lives there')) {
            insight.motivation.push('Vacant Property');
            insight.urgency += 1;
        }

        // Personality Detection
        if (lower.includes('exactly') || lower.includes('numbers') || lower.includes('math') || lower.includes('interest rate') || lower.includes('market data')) {
            insight.personality = 'Analytical';
        } else if (lower.includes('scam') || lower.includes('how did you get my number') || lower.includes('don\'t believe') || lower.includes('who are you')) {
            insight.personality = 'Skeptical';
        } else if (lower.includes('quick') || lower.includes('how soon') || lower.includes('cash offer') || lower.includes('close fast')) {
            insight.personality = 'Motivated';
        } else if (lower.includes('not interested') || lower.includes('stop calling') || lower.includes('take me off the list')) {
            insight.personality = 'Aggressive';
        } else if (lower.includes('sad') || lower.includes('hard time') || lower.includes('memories')) {
            insight.personality = 'Emotional';
        }

        // Urgency & Probability Math
        insight.urgency = Math.min(10, insight.urgency);
        // Base probability starts at 0.1, goes up with motivations and urgency
        insight.dealProbability = Math.min(0.98, (insight.motivation.length * 0.15) + (insight.urgency * 0.08));

        return insight;
    }

}

export class ObjectionLibrary {
    static getRebuttals(type: string, personality: string) {
        const baseRebuttals: any = {
            'PRICE_OBJECTION': {
                soft: "I hear you, price is important. Aside from the price, what else is keeping you from selling?",
                firm: "We pay all cash and close on your timeline. To get that convenience, where do we need to be on price?",
                aggressive: "I can\'t pay retail price because I\'m taking all the risk and doing the work. What\'s the absolute lowest you\'d take for a fast cash close?",
                empathy: "I completely understand you want to get the most for your home. It\'s a huge asset."
            },
            'NOT_INTERESTED': {
                soft: "No problem at all. If you were to sell in the future, when would that be?",
                firm: "I understand. Most people I call aren\'t interested until they see our offer. Is there any harm in just knowing the number?",
                aggressive: "I only need 30 seconds to show you why selling to us is better than listing with an agent. Do you have a moment?",
                empathy: "I get it, I\'m just a random caller. I\'ll make this brief so you can get back to your day."
            },
            'AGENT_OBJECTION': {
                soft: "Agents are great. We just provide a different option without the commissions and house showings.",
                firm: "If you list with an agent, you\'ll pay 6% in fees. We pay that for you. Does that change things?",
                aggressive: "Why pay an agent to do what I can do for you right now for free?",
                empathy: "I totally respect that you want professional representation. Our process is designed to be just as secure."
            },
            'TIMING_OBJECTION': {
                soft: "I understand. Is there a specific date you had in mind for when things might change?",
                firm: "Timing is everything. However, markets change fast. Would you want to know what your house is worth today just in case?",
                aggressive: "Waiting usually costs people money in this market. Why not get an offer now and decide later?",
                empathy: "I completely get it. Life is busy. When would be a less hectic time for us to chat?"
            }
        };

        return baseRebuttals[type] || baseRebuttals['NOT_INTERESTED'];
    }
}
