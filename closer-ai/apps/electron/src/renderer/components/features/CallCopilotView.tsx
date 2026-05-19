import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAudioCapture } from '../../hooks/useAudioCapture';
import { API_BASE } from '../../config/api';
import {
  Brain, CheckCircle, Copy, FileText, Flame, Loader2, Mic, MicOff,
  Monitor, MonitorOff, PhoneOff, Send, ShieldAlert, Sparkles,
  Target, Timer, Volume2, VolumeX, Zap,
} from 'lucide-react';

const quickCallerLines = [
  'That makes sense.',
  'I hear you.',
  'What would make this easy for you?',
  'Are you open to a simple cash offer?',
];

interface SellerKeyword {
  pattern: RegExp;
  label: string;
  cls: string;
}

const SELLER_KEYWORDS: SellerKeyword[] = [
  { pattern: /foreclos/i,                                 label: 'FORECLOSURE',      cls: 'bg-red-500/20 text-red-400 border-red-500/40' },
  { pattern: /divorc/i,                                   label: 'DIVORCE',           cls: 'bg-red-500/20 text-red-400 border-red-500/40' },
  { pattern: /inherit|probate/i,                          label: 'PROBATE',           cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' },
  { pattern: /behind.*pay|pay.*behind|can.?t afford/i,   label: 'PAYMENT ISSUES',    cls: 'bg-red-500/20 text-red-400 border-red-500/40' },
  { pattern: /not interested/i,                           label: 'NOT INTERESTED',    cls: 'bg-red-500/20 text-red-400 border-red-500/40' },
  { pattern: /relocat/i,                                  label: 'RELOCATION',        cls: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
  { pattern: /think.*(about|it)|need.*time/i,             label: 'THINKING IT OVER',  cls: 'bg-orange-500/20 text-orange-400 border-orange-500/40' },
  { pattern: /agent|realtor|listed/i,                     label: 'HAS AGENT',         cls: 'bg-purple-500/20 text-purple-400 border-purple-500/40' },
  { pattern: /as.is|no repair/i,                          label: 'AS-IS',             cls: 'bg-green-500/20 text-green-400 border-green-500/40' },
  { pattern: /quick.*sale|sell.*fast|fast.*sell/i,        label: 'QUICK SALE',        cls: 'bg-green-500/20 text-green-400 border-green-500/40' },
  { pattern: /cash/i,                                     label: 'CASH MENTION',      cls: 'bg-green-500/20 text-green-400 border-green-500/40' },
];

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

const CallCopilotView: React.FC = () => {
  const {
    currentLead, transcript, suggestions, isCalling,
    confidenceMode, currentInsight, currentStrategy, callSummary,
    setIsCalling, clearCallData, setConfidenceMode, setCurrentLead, setCallSummary,
  } = useAppStore();

  const { endCall, sendAudioChunk, sendTranscript, connectionStatus } = useWebSocket();
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // UI state
  const [testInput, setTestInput] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<'suggested' | 'soft' | 'firm' | 'aggressive' | 'empathy'>('suggested');
  const [isNewSuggestion, setIsNewSuggestion] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isStartingListen, setIsStartingListen] = useState(false);
  const prevSuggestionId = useRef<string | null>(null);

  // ── Enhancement 1: TTS ──
  const [isSpeaking, setIsSpeaking] = useState(false);

  // ── Enhancement 2: live call timer ──
  const [callSeconds, setCallSeconds] = useState(0);

  // ── Enhancement 3: keyword badges ──
  const [detectedKeywords, setDetectedKeywords] = useState<Map<string, string>>(new Map()); // label → cls

  // ── Enhancement 4: post-call summary overlay ──
  const [showingSummary, setShowingSummary] = useState(false);

  // ── Enhancement 5: live call notes ──
  const [notes, setNotes] = useState('');

  const {
    isRecording,
    isListeningToCall,
    startRecording,
    stopRecording,
    startListeningToCall,
    stopListeningToCall,
  } = useAudioCapture(sendAudioChunk);

  const activeSuggestion = suggestions[0];

  // Pulse highlight when suggestion changes
  useEffect(() => {
    if (!activeSuggestion) return;
    const id = activeSuggestion.suggested_response;
    if (id !== prevSuggestionId.current) {
      prevSuggestionId.current = id;
      setIsNewSuggestion(true);
      setSelectedStyle('suggested');
      const t = setTimeout(() => setIsNewSuggestion(false), 4000);
      return () => clearTimeout(t);
    }
  }, [activeSuggestion]);

  const suggestionText = useMemo(() => {
    if (!activeSuggestion) return '';
    if (activeSuggestion.multiStyleRebuttals && selectedStyle !== 'suggested') {
      return (activeSuggestion.multiStyleRebuttals as any)[selectedStyle] || activeSuggestion.suggested_response;
    }
    return activeSuggestion.suggested_response;
  }, [activeSuggestion, selectedStyle]);

  // Auto-start mic when call begins
  useEffect(() => {
    if (isCalling && !isRecording) startRecording();
    return () => {
      stopRecording();
      stopListeningToCall();
    };
  }, [isCalling]);

  // Timer
  useEffect(() => {
    if (!isCalling) return;
    setCallSeconds(0);
    const id = setInterval(() => setCallSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [isCalling]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Keyword detection — only check client (seller) speech
  useEffect(() => {
    if (!transcript.length) return;
    const latest = transcript[transcript.length - 1];
    if (latest.speaker.toLowerCase() === 'caller') return;
    const newEntries: [string, string][] = [];
    SELLER_KEYWORDS.forEach(({ pattern, label, cls }) => {
      if (pattern.test(latest.text)) newEntries.push([label, cls]);
    });
    if (newEntries.length) {
      setDetectedKeywords(prev => new Map([...prev, ...newEntries]));
    }
  }, [transcript]);

  // Show summary overlay when callSummary arrives after call ends
  useEffect(() => {
    if (callSummary && !isCalling) setShowingSummary(true);
  }, [callSummary, isCalling]);

  // TTS
  const speakSuggestion = () => {
    if (!suggestionText || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(suggestionText);
    utt.rate = confidenceMode === 'beginner' ? 0.8 : 1.0;
    utt.onstart = () => setIsSpeaking(true);
    utt.onend = () => setIsSpeaking(false);
    utt.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utt);
  };
  const stopSpeaking = () => { window.speechSynthesis.cancel(); setIsSpeaking(false); };

  const handleEndCall = () => {
    endCall('Manual close');
    stopRecording();
    stopListeningToCall();
    setIsCalling(false);
    setShowingSummary(true); // show loading overlay while summary generates
  };

  const handleDismissSummary = async () => {
    // Save notes as lead note if any text entered
    if (notes.trim() && currentLead?.id) {
      try {
        await fetch(`${API_BASE}/api/leads/${currentLead.id}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: `📝 Call Notes:\n${notes.trim()}` }),
        });
      } catch (e) {
        console.error('[CloserAI] Failed to save call notes:', e);
      }
    }
    setShowingSummary(false);
    setCallSummary(null);
    clearCallData();
    setCurrentLead(null);
    setDetectedKeywords(new Map());
    setNotes('');
  };

  const handleToggleSystemAudio = async () => {
    if (isListeningToCall) { stopListeningToCall(); return; }
    if (isStartingListen) return;
    setIsStartingListen(true);
    try { await startListeningToCall(); }
    finally { setIsStartingListen(false); }
  };

  const sendSimulatedClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testInput.trim()) return;
    sendTranscript(testInput.trim(), 'Client');
    setTestInput('');
  };

  const sendCallerLine = (line: string) => sendTranscript(line, 'Caller');

  const copySuggestion = async () => {
    if (!suggestionText) return;
    await navigator.clipboard.writeText(suggestionText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const urgencyLevel = (activeSuggestion as any)?.urgency_level ?? 0;
  const isUrgent = urgencyLevel >= 7 || !!activeSuggestion?.detected_objection;

  if (!currentLead) return <div className="p-10 text-center text-gray-500">Select a lead.</div>;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-900 relative">

      {/* ── POST-CALL SUMMARY OVERLAY ── */}
      {showingSummary && (
        <div className="absolute inset-0 z-50 bg-gray-900/95 backdrop-blur-sm flex items-center justify-center p-8">
          <div className="w-full max-w-2xl bg-gray-800 rounded-2xl border border-gray-700 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Sparkles size={18} className="text-blue-400" />
                Call Summary — {currentLead.full_name}
              </h2>
              <span className="text-xs text-gray-500 font-bold">{formatTime(callSeconds)} call</span>
            </div>

            {!callSummary ? (
              <div className="p-12 flex flex-col items-center gap-4 text-gray-400">
                <Loader2 size={32} className="animate-spin text-blue-500" />
                <p className="font-bold text-sm">Generating AI summary...</p>
              </div>
            ) : (
              <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
                <SummaryBlock label="Outcome" value={callSummary.outcome} accent="blue" />

                {callSummary.seller_signals?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black uppercase text-gray-500 mb-2">Seller Signals</p>
                    <ul className="space-y-1">
                      {callSummary.seller_signals.map((s, i) => (
                        <li key={i} className="flex gap-2 text-sm text-green-300 font-semibold">
                          <CheckCircle size={14} className="shrink-0 mt-0.5 text-green-500" /> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {callSummary.objections_raised?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black uppercase text-gray-500 mb-2">Objections Raised</p>
                    <ul className="space-y-1">
                      {callSummary.objections_raised.map((o, i) => (
                        <li key={i} className="flex gap-2 text-sm text-red-300 font-semibold">
                          <ShieldAlert size={14} className="shrink-0 mt-0.5 text-red-400" /> {o}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <SummaryBlock label="Recommended Follow-Up" value={callSummary.recommended_followup} accent="yellow" />

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                  <p className="text-[10px] font-black uppercase text-blue-400 mb-2">Best Opener for Callback</p>
                  <p className="text-sm font-black text-white">"{callSummary.best_opener_for_callback}"</p>
                  <button
                    onClick={() => navigator.clipboard.writeText(callSummary.best_opener_for_callback)}
                    className="mt-3 text-[10px] font-black uppercase text-blue-400 hover:text-blue-200 flex items-center gap-1"
                  >
                    <Copy size={11} /> Copy opener
                  </button>
                </div>

                {/* Notes textarea in summary */}
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-500 mb-2 flex items-center gap-1">
                    <FileText size={11} /> Call Notes (saved to lead on dismiss)
                  </p>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Anything to remember about this call..."
                    rows={3}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white resize-none focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            )}

            <div className="p-6 border-t border-gray-700">
              <button
                onClick={handleDismissSummary}
                disabled={!callSummary}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-wait text-white py-3 rounded-xl font-black text-sm uppercase"
              >
                {notes.trim() ? 'Save Notes & Close' : 'Close Summary'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LEFT — Seller Intel + Strategy ── */}
      <div className="w-80 border-r border-gray-700/50 flex flex-col bg-gray-800/20">
        <div className="p-6 border-b border-gray-700/50">
          <div className="flex items-center justify-between mb-6">
            <h3 className="flex items-center gap-2 font-black text-xs uppercase tracking-widest text-gray-500">
              <Brain size={14} className="text-blue-500" /> Seller Intel
            </h3>
            <StatusPill status={connectionStatus} />
          </div>
          <div className="space-y-5">
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Deal Probability</p>
              <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-1000"
                  style={{ width: `${(currentInsight?.dealProbability || 0.1) * 100}%` }}
                />
              </div>
              <p className="text-right text-[10px] font-black mt-1 text-blue-400">
                {Math.round((currentInsight?.dealProbability || 0.1) * 100)}% Match
              </p>
            </div>
            <InsightItem label="Personality" value={currentInsight?.personality || 'Detecting...'} icon={<Target size={14} />} />
            <InsightItem label="Urgency" value={`${currentInsight?.urgency || 1}/10`} icon={<Zap size={14} />} />
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Motivations</p>
              <div className="flex flex-wrap gap-2">
                {(currentInsight?.motivation?.length ? currentInsight.motivation : ['Listening']).map(m => (
                  <span key={m} className="px-2 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-[10px] font-bold uppercase">{m}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-5">
          <h3 className="font-black text-xs uppercase tracking-widest text-gray-500">Call Strategy</h3>
          {currentStrategy ? (
            <>
              <StrategyBlock label="Tone" value={currentStrategy.tone} />
              <StrategyBlock label="Pacing" value={currentStrategy.pacing} />
              <StrategyBlock label="Closing" value={currentStrategy.closingStyle} />
              <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-4">
                <p className="text-[10px] font-black uppercase text-blue-400 mb-2">Key Points</p>
                <ul className="space-y-2">
                  {currentStrategy.keyPoints.map(point => (
                    <li key={point} className="text-sm font-semibold text-white flex gap-2">
                      <CheckCircle size={14} className="text-green-500 shrink-0 mt-0.5" /> {point}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">Strategy appears after seller starts talking.</p>
          )}
        </div>
      </div>

      {/* ── CENTRE — Transcript ── */}
      <div className="flex-1 flex flex-col border-r border-gray-700/50">
        {/* Header with timer */}
        <div className="p-4 border-b border-gray-700/50 flex justify-between items-center bg-gray-800/40">
          <div>
            <h3 className="font-black text-white flex items-center gap-2">
              {currentLead.full_name}
              {isCalling && (
                <span className="flex items-center gap-1 text-green-400 text-xs font-black">
                  <Timer size={12} className="animate-pulse" /> {formatTime(callSeconds)}
                </span>
              )}
            </h3>
            <p className="text-xs text-gray-500 font-bold">
              {currentLead.phone_number}
              {currentLead.property_address ? ` — ${currentLead.property_address}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <span className={`flex items-center gap-1 text-[10px] font-black uppercase ${isRecording ? 'text-green-400' : 'text-gray-600'}`}>
              {isRecording ? <Mic size={12} /> : <MicOff size={12} />}
              {isRecording ? 'Mic' : 'Muted'}
            </span>

            <button
              onClick={handleToggleSystemAudio}
              disabled={isStartingListen}
              title={isListeningToCall ? 'Stop listening to call audio' : 'Listen to Zoom / Meet / any call audio'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border transition-all disabled:opacity-50 disabled:cursor-wait ${
                isListeningToCall
                  ? 'bg-green-600 border-green-500 text-white animate-pulse'
                  : isStartingListen
                  ? 'bg-yellow-600/30 border-yellow-500 text-yellow-400'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-green-500 hover:text-green-400'
              }`}
            >
              {isListeningToCall ? <Monitor size={12} /> : <MonitorOff size={12} />}
              {isListeningToCall ? 'Listening' : isStartingListen ? 'Starting...' : 'Listen to Call'}
            </button>

            {(['beginner', 'intermediate', 'advanced'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setConfidenceMode(mode)}
                className={`px-3 py-1 text-[10px] font-black uppercase rounded-full border ${
                  confidenceMode === mode
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-500'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* ── Enhancement 3: keyword flash badges ── */}
        {detectedKeywords.size > 0 && (
          <div className="px-4 pt-2 pb-1 flex flex-wrap gap-2">
            {Array.from(detectedKeywords.entries()).map(([label, cls]) => (
              <span
                key={label}
                className={`px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wide ${cls}`}
              >
                {label}
              </span>
            ))}
          </div>
        )}

        {!isListeningToCall && (
          <div className="mx-4 mt-2 px-4 py-2 bg-yellow-500/5 border border-yellow-500/20 rounded-xl text-xs text-yellow-400 font-bold flex items-center gap-2">
            <Monitor size={13} />
            Click "Listen to Call" to capture Zoom / Google Meet / phone audio for AI suggestions.
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-5 scroll-smooth">
          {transcript.length === 0 && (
            <div className="h-full flex items-center justify-center text-center text-gray-500">
              <div>
                <Volume2 className="mx-auto mb-3 opacity-40" />
                <p className="font-bold">Enable "Listen to Call" then speak on Zoom / Meet.</p>
                <p className="text-xs mt-1 opacity-60">Or simulate seller response below.</p>
              </div>
            </div>
          )}
          {transcript.map((entry, i) => (
            <div
              key={`${entry.timestamp}-${i}`}
              className={`flex ${entry.speaker === 'Caller' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[78%] rounded-2xl px-4 py-3 ${
                entry.speaker === 'Caller'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-100'
              }`}>
                <p className="text-[10px] font-black uppercase opacity-60 mb-1">{entry.speaker}</p>
                <p className="text-sm leading-relaxed">{entry.text}</p>
              </div>
            </div>
          ))}
          <div ref={transcriptEndRef} />
        </div>

        <div className="p-4 bg-gray-800/40 border-t border-gray-700/50 space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {quickCallerLines.map(line => (
              <button
                key={line}
                onClick={() => sendCallerLine(line)}
                className="bg-gray-700 hover:bg-blue-600 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase truncate"
              >
                {line}
              </button>
            ))}
          </div>
          <form onSubmit={sendSimulatedClient} className="flex gap-2">
            <input
              type="text"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="Simulate seller response..."
              className="flex-1 bg-gray-900 border border-gray-700/50 rounded-xl px-4 py-3 text-sm text-white"
            />
            <button type="submit" className="bg-gray-700 hover:bg-blue-600 text-white px-4 rounded-xl">
              <Send size={16} />
            </button>
          </form>
          {isCalling && (
            <button
              onClick={handleEndCall}
              className="w-full bg-red-600 text-white py-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2"
            >
              <PhoneOff size={16} /> End Session
            </button>
          )}
        </div>
      </div>

      {/* ── RIGHT — AI Suggestions + Live Notes ── */}
      <div className="w-[440px] flex flex-col bg-gray-800/20">
        <div className="p-6 border-b border-gray-700/50 flex items-center justify-between">
          <h3 className="font-black text-xs uppercase tracking-widest text-blue-400 flex items-center gap-2">
            <Sparkles size={14} /> Next Best Move
          </h3>
          {isNewSuggestion && (
            <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded-full text-[10px] font-black uppercase animate-pulse">
              New
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeSuggestion ? (
            <div className={`rounded-2xl border p-5 transition-all duration-300 ${
              isNewSuggestion
                ? isUrgent
                  ? 'bg-red-600/15 border-red-500 shadow-lg shadow-red-900/30 scale-[1.01]'
                  : 'bg-blue-600/15 border-blue-400 shadow-lg shadow-blue-900/30 scale-[1.01]'
                : 'bg-gray-800/50 border-gray-700/50'
            }`}>

              {isUrgent && (
                <div className={`flex items-center gap-2 mb-3 ${
                  activeSuggestion.detected_objection ? 'text-red-400' : 'text-orange-400'
                }`}>
                  {activeSuggestion.detected_objection
                    ? <><ShieldAlert size={14} /> <span className="text-xs font-black uppercase">{activeSuggestion.detected_objection.replace(/_/g, ' ')}</span></>
                    : <><Flame size={14} /> <span className="text-xs font-black uppercase">High Urgency — Reply Fast</span></>
                  }
                </div>
              )}

              <p className={`text-lg font-black leading-relaxed ${isNewSuggestion ? 'text-white' : 'text-gray-200'}`}>
                "{suggestionText}"
              </p>

              {activeSuggestion.confidence_tips && (
                <p className="mt-3 text-xs text-gray-400 italic leading-relaxed">
                  {activeSuggestion.confidence_tips}
                </p>
              )}

              {activeSuggestion.pronunciation_score != null && (
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-black uppercase text-gray-500">Ease of Saying</span>
                    <span className="text-[10px] font-black text-green-400">{activeSuggestion.pronunciation_score}/10</span>
                  </div>
                  <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all duration-500"
                      style={{ width: `${(activeSuggestion.pronunciation_score / 10) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action buttons row */}
              <div className="mt-5 flex gap-2">
                {/* Copy & Fire */}
                <button
                  onClick={copySuggestion}
                  className={`flex-1 py-3 rounded-xl font-black text-sm uppercase flex items-center justify-center gap-2 transition-all ${
                    copied
                      ? 'bg-green-600 text-white'
                      : isNewSuggestion
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/40 animate-pulse'
                      : 'bg-gray-700 hover:bg-blue-600 text-white'
                  }`}
                >
                  <Copy size={15} />
                  {copied ? 'Copied!' : 'Copy & Fire'}
                </button>

                {/* ── Enhancement 1: TTS Speak It ── */}
                <button
                  onClick={isSpeaking ? stopSpeaking : speakSuggestion}
                  title={isSpeaking ? 'Stop speaking' : 'Speak it aloud (TTS)'}
                  className={`px-4 py-3 rounded-xl font-black text-sm uppercase flex items-center justify-center gap-1 border transition-all ${
                    isSpeaking
                      ? 'bg-orange-600 border-orange-500 text-white animate-pulse'
                      : 'bg-gray-700 border-gray-700 text-gray-400 hover:border-orange-500 hover:text-orange-400'
                  }`}
                >
                  {isSpeaking ? <VolumeX size={15} /> : <Volume2 size={15} />}
                </button>
              </div>

              {/* Style selector */}
              {activeSuggestion.multiStyleRebuttals && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {(['suggested', 'soft', 'firm', 'aggressive', 'empathy'] as const).map(style => (
                    <button
                      key={style}
                      onClick={() => setSelectedStyle(style)}
                      className={`px-2 py-1 rounded text-[10px] font-black uppercase border transition-all ${
                        selectedStyle === style
                          ? 'bg-blue-500 text-white border-blue-400'
                          : 'bg-gray-800 text-gray-500 border-gray-700 hover:border-blue-500'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-5 rounded-2xl border bg-gray-800/40 border-gray-700/50 text-center">
              <Sparkles size={28} className="mx-auto mb-3 text-gray-600" />
              <p className="text-gray-400 text-sm font-semibold">
                {isListeningToCall
                  ? 'Listening... AI reply appears when seller speaks.'
                  : 'Enable "Listen to Call" for automatic suggestions.'}
              </p>
            </div>
          )}

          {/* Previous suggestions (subtle) */}
          <div className="space-y-3">
            {suggestions.slice(1, 4).map((s, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl border bg-gray-800/30 border-gray-700/30 cursor-pointer hover:border-gray-600 transition-all"
                onClick={() => navigator.clipboard.writeText(s.suggested_response)}
                title="Click to copy"
              >
                <p className="text-sm text-gray-400 font-semibold">"{s.suggested_response}"</p>
                {s.detected_objection && (
                  <p className="text-[10px] text-yellow-500 font-black uppercase mt-1">{s.detected_objection.replace(/_/g, ' ')}</p>
                )}
              </div>
            ))}
          </div>

          {/* ── Enhancement 5: Live Call Notes ── */}
          <div className="border-t border-gray-700/50 pt-4">
            <p className="text-[10px] font-black uppercase text-gray-500 mb-2 flex items-center gap-1">
              <FileText size={11} /> Live Notes
            </p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Jot down anything important..."
              rows={4}
              className="w-full bg-gray-900/70 border border-gray-700/50 rounded-xl px-4 py-3 text-sm text-white resize-none focus:border-blue-500 outline-none placeholder-gray-600"
            />
            {notes.trim() && (
              <p className="text-[10px] text-gray-600 font-bold mt-1">Saved to lead when you end the call.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatusPill = ({ status }: { status: string }) => (
  <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${
    status === 'connected' ? 'bg-green-500/10 text-green-400' :
    status === 'connecting' ? 'bg-yellow-500/10 text-yellow-400' :
    'bg-red-500/10 text-red-400'
  }`}>{status}</span>
);

const InsightItem = ({ label, value, icon }: any) => (
  <div className="flex items-center gap-3">
    <div className="p-2 bg-gray-800 rounded-lg border border-gray-700/50 text-gray-400">{icon}</div>
    <div>
      <p className="text-[10px] font-bold text-gray-500 uppercase">{label}</p>
      <p className="text-xs font-black text-white uppercase">{value}</p>
    </div>
  </div>
);

const StrategyBlock = ({ label, value }: { label: string; value: string }) => (
  <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
    <p className="text-[10px] font-bold text-blue-500 uppercase mb-1">{label}</p>
    <p className="text-sm font-bold text-white">{value}</p>
  </div>
);

const SummaryBlock = ({ label, value, accent }: { label: string; value: string; accent: 'blue' | 'yellow' }) => (
  <div className={`p-4 rounded-xl border ${
    accent === 'blue' ? 'bg-blue-500/5 border-blue-500/20' : 'bg-yellow-500/5 border-yellow-500/20'
  }`}>
    <p className={`text-[10px] font-black uppercase mb-1 ${accent === 'blue' ? 'text-blue-400' : 'text-yellow-400'}`}>{label}</p>
    <p className="text-sm font-semibold text-white">{value}</p>
  </div>
);

export default CallCopilotView;
