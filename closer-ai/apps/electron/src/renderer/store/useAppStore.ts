import { create } from 'zustand';

interface Lead {
  id: string;
  full_name: string;
  phone_number: string;
  email?: string;
  linkedin_url?: string;
  website_url?: string;
  call_status: string;
  property_address?: string;
  property_type?: string;
  estimated_value?: number;
  seller_motivation?: string;
  deal_score?: number;
  motivation_tags?: string;
  notes?: string;
  tags?: string;
  follow_up_date?: string;
}

interface Suggestion {
  suggested_response: string;
  detected_objection?: string;
  rebuttal?: string;
  confidence_tips?: string;
  pronunciation_score?: number;
  urgency_level?: number;
  multiStyleRebuttals?: {
      soft: string;
      firm: string;
      aggressive: string;
      empathy: string;
  };
}

interface TranscriptEntry {
  text: string;
  speaker: string;
  timestamp: Date;
}

interface AppInsight {
    motivation: string[];
    urgency: number;
    dealProbability: number;
    personality: string;
}

interface AppStrategy {
    tone: string;
    pacing: string;
    closingStyle: string;
    keyPoints: string[];
}

interface CallSummary {
  outcome: string;
  seller_signals: string[];
  objections_raised: string[];
  recommended_followup: string;
  best_opener_for_callback: string;
}

interface AppState {
  leads: Lead[];
  currentLead: Lead | null;
  isCalling: boolean;
  transcript: TranscriptEntry[];
  suggestions: Suggestion[];
  confidenceMode: 'beginner' | 'intermediate' | 'advanced';
  currentInsight: AppInsight | null;
  currentStrategy: AppStrategy | null;
  callSummary: CallSummary | null;

  setLeads: (leads: Lead[]) => void;
  setCurrentLead: (lead: Lead | null) => void;
  setIsCalling: (isCalling: boolean) => void;
  addTranscriptEntry: (entry: TranscriptEntry) => void;
  addSuggestion: (suggestion: Suggestion) => void;
  setConfidenceMode: (mode: 'beginner' | 'intermediate' | 'advanced') => void;
  setInsight: (insight: AppInsight) => void;
  setStrategy: (strategy: AppStrategy) => void;
  setCallSummary: (summary: CallSummary | null) => void;
  clearCallData: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  leads: [],
  currentLead: null,
  isCalling: false,
  transcript: [],
  suggestions: [],
  confidenceMode: 'beginner',
  currentInsight: null,
  currentStrategy: null,
  callSummary: null,

  setLeads: (leads) => set({ leads }),
  setCurrentLead: (lead) => set({ currentLead: lead }),
  setIsCalling: (isCalling) => set({ isCalling }),
  addTranscriptEntry: (entry) => set((state) => ({
    transcript: [...state.transcript, entry].slice(-50)
  })),
  addSuggestion: (suggestion) => set((state) => ({
    suggestions: [suggestion, ...state.suggestions].slice(0, 10)
  })),
  setConfidenceMode: (confidenceMode) => set({ confidenceMode }),
  setInsight: (currentInsight) => set({ currentInsight }),
  setStrategy: (currentStrategy) => set({ currentStrategy }),
  setCallSummary: (callSummary) => set({ callSummary }),
  clearCallData: () => set({ transcript: [], suggestions: [], currentInsight: null, currentStrategy: null, callSummary: null }),
}));
