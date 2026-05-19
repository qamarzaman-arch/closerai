import { SellerInsight } from './RealEstateIntelligenceService';
import logger from '../utils/logger';

export interface CallStrategy {
    tone: 'Empathetic' | 'Direct' | 'Educational' | 'Urgent';
    pacing: 'Slow' | 'Moderate' | 'Fast';
    closingStyle: 'Soft' | 'Presumptive' | 'Take-away';
    keyPoints: string[];
}

export class StrategyEngine {
    static getStrategy(insight: SellerInsight): CallStrategy {
        const strategy: CallStrategy = {
            tone: 'Educational',
            pacing: 'Moderate',
            closingStyle: 'Soft',
            keyPoints: ['No commission', 'Fast closing']
        };

        if (insight.personality === 'Aggressive') {
            strategy.tone = 'Direct';
            strategy.pacing = 'Fast';
            strategy.closingStyle = 'Presumptive';
            strategy.keyPoints = ['Net cash to you', 'Immediate proof of funds'];
        } else if (insight.personality === 'Analytical') {
            strategy.tone = 'Educational';
            strategy.pacing = 'Slow';
            strategy.closingStyle = 'Soft';
            strategy.keyPoints = ['Market data comparison', 'Detailed closing timeline'];
        } else if (insight.personality === 'Skeptical') {
            strategy.tone = 'Educational';
            strategy.pacing = 'Slow';
            strategy.closingStyle = 'Soft';
            strategy.keyPoints = ['No obligation offer', 'Local references available', 'Transparent process'];
        } else if (insight.personality === 'Emotional') {
            strategy.tone = 'Empathetic';
            strategy.pacing = 'Slow';
            strategy.closingStyle = 'Soft';
            strategy.keyPoints = ['Hassle-free process', 'We handle everything', 'Respectful timeline'];
        } else if (insight.urgency > 7) {
            strategy.tone = 'Urgent';
            strategy.pacing = 'Fast';
            strategy.closingStyle = 'Take-away';
            strategy.keyPoints = ['Stop foreclosure', 'Close in 7 days'];
        } else if (insight.motivation.includes('Probate/Inherited') || insight.motivation.includes('Divorce')) {
            strategy.tone = 'Empathetic';
            strategy.pacing = 'Slow';
            strategy.closingStyle = 'Soft';
            strategy.keyPoints = ['Hassle-free process', 'Respectful handling'];
        }

        return strategy;
    }
}
