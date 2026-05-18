export interface AISuggestionResult {
    suggested_response: string;
    detected_objection: string | null;
    rebuttal: string | null;
    confidence_tips: string;
    pronunciation_score: number;
    multiStyleRebuttals?: any;
}

export interface AIProvider {
    generateCallScript(lead: any, mode: string): Promise<any>;
    getRealtimeSuggestion(context: string, mode: string, insight?: any): Promise<AISuggestionResult>;
}
