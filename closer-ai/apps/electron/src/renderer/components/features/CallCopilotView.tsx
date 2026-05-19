import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAudioCapture } from '../../hooks/useAudioCapture';
import { Brain, CheckCircle, Copy, Mic, PhoneOff, Send, ShieldAlert, Sparkles, Target, Volume2, Zap } from 'lucide-react';

const quickCallerLines = [
  'That makes sense.',
  'I hear you.',
  'What would make this easy for you?',
  'Are you open to a simple cash offer?',
];

const CallCopilotView: React.FC = () => {
  const { currentLead, transcript, suggestions, isCalling, confidenceMode, currentInsight, currentStrategy, setIsCalling, clearCallData, setConfidenceMode, setCurrentLead, addTranscriptEntry } = useAppStore();
  const { endCall, sendAudioChunk, sendTranscript, connectionStatus } = useWebSocket();
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const [testInput, setTestInput] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<'suggested' | 'soft' | 'firm' | 'aggressive' | 'empathy'>('suggested');
  const { isRecording, startRecording, stopRecording } = useAudioCapture(sendAudioChunk);

  const activeSuggestion = suggestions[0];
  const suggestionText = useMemo(() => {
    if (!activeSuggestion) return '';
    if (activeSuggestion.multiStyleRebuttals && selectedStyle !== 'suggested') {
      return (activeSuggestion.multiStyleRebuttals as any)[selectedStyle] || activeSuggestion.suggested_response;
    }
    return activeSuggestion.suggested_response;
  }, [activeSuggestion, selectedStyle]);

  useEffect(() => {
    if (isCalling && !isRecording) startRecording();
    return () => stopRecording();
  }, [isCalling]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const handleEndCall = () => {
    endCall('Manual close');
    stopRecording();
    setIsCalling(false);
    clearCallData();
    setCurrentLead(null);
  };

  const sendSimulatedClient = (event: React.FormEvent) => {
    event.preventDefault();
    if (!testInput.trim()) return;
    sendTranscript(testInput.trim(), 'Client');
    setTestInput('');
  };

  const sendCallerLine = (line: string) => {
    addTranscriptEntry({ text: line, speaker: 'Caller', timestamp: new Date() });
    sendTranscript(line, 'Caller');
  };

  const copySuggestion = async () => {
    if (suggestionText) await navigator.clipboard.writeText(suggestionText);
  };

  if (!currentLead) return <div className="p-10 text-center text-gray-500">Select a lead.</div>;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-900">
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
                <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${(currentInsight?.dealProbability || 0.1) * 100}%` }} />
              </div>
              <p className="text-right text-[10px] font-black mt-1 text-blue-400">{Math.round((currentInsight?.dealProbability || 0.1) * 100)}% Match</p>
            </div>
            <InsightItem label="Personality" value={currentInsight?.personality || 'Detecting'} icon={<Target size={14} />} />
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
                  {currentStrategy.keyPoints.map(point => <li key={point} className="text-sm font-semibold text-white flex gap-2"><CheckCircle size={14} className="text-green-500 shrink-0 mt-0.5" /> {point}</li>)}
                </ul>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">Strategy appears after the seller starts talking.</p>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col border-r border-gray-700/50">
        <div className="p-4 border-b border-gray-700/50 flex justify-between items-center bg-gray-800/40">
          <div>
            <h3 className="font-black text-white">{currentLead.full_name}</h3>
            <p className="text-xs text-gray-500 font-bold">{currentLead.phone_number} {currentLead.property_address ? `- ${currentLead.property_address}` : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1 text-[10px] font-black uppercase ${isRecording ? 'text-green-400' : 'text-gray-500'}`}><Mic size={13} /> {isRecording ? 'Live' : 'Muted'}</span>
            {['beginner', 'intermediate', 'advanced'].map((mode) => (
              <button key={mode} onClick={() => setConfidenceMode(mode as any)} className={`px-3 py-1 text-[10px] font-black uppercase rounded-full border ${confidenceMode === mode ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>{mode}</button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 scroll-smooth">
          {transcript.length === 0 && (
            <div className="h-full flex items-center justify-center text-center text-gray-500">
              <div>
                <Volume2 className="mx-auto mb-3" />
                <p className="font-bold">Start speaking or simulate a seller response.</p>
              </div>
            </div>
          )}
          {transcript.map((entry, i) => (
            <div key={`${entry.timestamp}-${i}`} className={`flex ${entry.speaker === 'Caller' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[78%] rounded-2xl px-4 py-3 ${entry.speaker === 'Caller' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-100'}`}>
                <p className="text-[10px] font-black uppercase opacity-60 mb-1">{entry.speaker}</p>
                <p className="text-sm leading-relaxed">{entry.text}</p>
              </div>
            </div>
          ))}
          <div ref={transcriptEndRef} />
        </div>

        <div className="p-4 bg-gray-800/40 border-t border-gray-700/50 space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {quickCallerLines.map(line => <button key={line} onClick={() => sendCallerLine(line)} className="bg-gray-700 hover:bg-blue-600 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase truncate">{line}</button>)}
          </div>
          <form onSubmit={sendSimulatedClient} className="flex gap-2">
            <input type="text" value={testInput} onChange={(e) => setTestInput(e.target.value)} placeholder="Simulate seller response..." className="flex-1 bg-gray-900 border border-gray-700/50 rounded-xl px-4 py-3 text-sm text-white" />
            <button type="submit" className="bg-gray-700 hover:bg-blue-600 text-white px-4 rounded-xl"><Send size={16} /></button>
          </form>
          <button onClick={handleEndCall} className="w-full bg-red-600 text-white py-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2"><PhoneOff size={16} /> End Session</button>
        </div>
      </div>

      <div className="w-[420px] flex flex-col bg-gray-800/20">
        <div className="p-6 border-b border-gray-700/50 flex items-center justify-between">
          <h3 className="font-black text-xs uppercase tracking-widest text-blue-400 flex items-center gap-2"><Sparkles size={14} /> Next Best Move</h3>
          <button onClick={copySuggestion} className="p-2 bg-gray-700 text-gray-200 hover:text-white hover:bg-blue-600 rounded-lg"><Copy size={15} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeSuggestion ? (
            <div className="p-5 rounded-2xl border bg-blue-600/10 border-blue-500">
              <p className="text-lg font-black text-white leading-relaxed">"{suggestionText}"</p>
              {activeSuggestion.detected_objection && <p className="mt-4 text-xs font-black uppercase text-yellow-400 flex gap-2"><ShieldAlert size={14} /> {activeSuggestion.detected_objection.replace('_', ' ')}</p>}
              {activeSuggestion.confidence_tips && <p className="mt-3 text-sm text-gray-300">{activeSuggestion.confidence_tips}</p>}
              {activeSuggestion.multiStyleRebuttals && (
                <div className="flex flex-wrap gap-2 mt-5">
                  {['suggested', 'soft', 'firm', 'aggressive', 'empathy'].map(style => (
                    <button key={style} onClick={() => setSelectedStyle(style as any)} className={`px-2 py-1 rounded text-[10px] font-black uppercase border ${selectedStyle === style ? 'bg-blue-500 text-white border-blue-400' : 'bg-gray-800 text-gray-500 border-gray-700'}`}>{style}</button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-5 rounded-2xl border bg-gray-800/40 border-gray-700/50 text-gray-400 text-sm font-semibold">AI suggestions appear after the first seller message.</div>
          )}

          <div className="space-y-4">
            {suggestions.slice(1).map((s, i) => (
              <div key={i} className="p-4 rounded-2xl border bg-gray-800/40 border-gray-700/50">
                <p className="text-sm font-bold text-white">"{s.suggested_response}"</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatusPill = ({ status }: { status: string }) => (
  <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${status === 'connected' ? 'bg-green-500/10 text-green-400' : status === 'connecting' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'}`}>{status}</span>
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

export default CallCopilotView;
