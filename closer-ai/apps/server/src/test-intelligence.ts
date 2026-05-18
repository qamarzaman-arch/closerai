import { RealEstateIntelligenceService } from './services/RealEstateIntelligenceService';
import { StrategyEngine } from './services/StrategyEngine';
import { ObjectionLibrary } from './services/RealEstateIntelligenceService';

async function testIntelligence() {
  const intel = new RealEstateIntelligenceService();

  console.log('Testing Foreclosure/Urgency Detection...');
  const foreclosureInsight = intel.analyzeConversation('I am behind on my mortgage payments and the bank is starting a foreclosure.');
  console.log('Insight:', foreclosureInsight);
  if (foreclosureInsight.motivation.includes('Financial Stress') && foreclosureInsight.urgency > 5) {
      console.log('✅ Foreclosure motivation and urgency detected correctly.');
  }

  console.log('\nTesting Analytical Personality Detection...');
  const analyticalInsight = intel.analyzeConversation('I need to see the exact numbers and math before I make a decision.');
  console.log('Personality:', analyticalInsight.personality);
  if (analyticalInsight.personality === 'Analytical') {
      console.log('✅ Analytical personality detected.');
  }

  console.log('\nTesting Strategy Generation...');
  const strategy = StrategyEngine.getStrategy(foreclosureInsight);
  console.log('Strategy:', strategy);
  if (strategy.tone === 'Urgent') {
      console.log('✅ Urgent strategy generated for foreclosure.');
  }

  console.log('\nTesting Multi-Style Rebuttals...');
  const rebuttals = ObjectionLibrary.getRebuttals('PRICE_OBJECTION', 'Analytical');
  console.log('Rebuttals:', rebuttals);
  if (rebuttals.aggressive && rebuttals.empathy) {
      console.log('✅ Multi-style rebuttals retrieved.');
  }
}

testIntelligence().catch(console.error);
