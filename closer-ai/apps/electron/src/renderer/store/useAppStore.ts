import { create } from 'zustand';

interface Lead {
  id: string;
  full_name: string;
  phone_number: string;
  email?: string;
  call_status: string;
  property_address?: string;
  sessions?: any[];
}

interface Suggestion {
  suggested_response: string;
  detected_objection?: string;
  rebuttal?: string;
  confidence_tips?: string;
}

interface TranscriptEntry {
  text: string;
  speaker: string;
  timestamp: Date;
}

interface AppState {
  leads: Lead[];
  currentLead: Lead | null;
  isCalling: boolean;
  transcript: TranscriptEntry[];
  suggestions: Suggestion[];
  confidenceMode: 'beginner' | 'intermediate' | 'advanced';

  setLeads: (leads: Lead[]) => void;
  setCurrentLead: (lead: Lead | null) => void;
  setIsCalling: (isCalling: boolean) => void;
  addTranscriptEntry: (entry: TranscriptEntry) => void;
  addSuggestion: (suggestion: Suggestion) => void;
  setConfidenceMode: (mode: 'beginner' | 'intermediate' | 'advanced') => void;
  clearCallData: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  leads: [],
  currentLead: null,
  isCalling: false,
  transcript: [],
  suggestions: [],
  confidenceMode: 'beginner',

  setLeads: (leads) => set({ leads }),
  setCurrentLead: (lead) => set({ currentLead: lead }),
  setIsCalling: (isCalling) => set({ isCalling }),
  addTranscriptEntry: (entry) => set((state) => ({
    transcript: [...state.transcript, entry].slice(-50)
  })),
  addSuggestion: (suggestion) => set((state) => ({
    suggestions: [suggestion, ...state.suggestions].slice(0, 20)
  })),
  setConfidenceMode: (confidenceMode) => set({ confidenceMode }),
  clearCallData: () => set({ transcript: [], suggestions: [] }),
}));
