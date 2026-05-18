import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAudioCapture } from '../../hooks/useAudioCapture';
import { PhoneOff, MessageSquare, AlertCircle, Sparkles, Copy, Mic, Brain, Zap, Target, Quote } from 'lucide-react';

const CallCopilotView: React.FC = () => {
  const { currentLead, transcript, suggestions, isCalling, confidenceMode, currentInsight, currentStrategy, setIsCalling, clearCallData, setConfidenceMode, setCurrentLead } = useAppStore();
  const { endCall, sendAudioChunk, sendTranscript } = useWebSocket();
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const [testInput, setTestInput] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<'suggested' | 'soft' | 'firm' | 'aggressive' | 'empathy'>('suggested');

  const { isRecording, startRecording, stopRecording } = useAudioCapture(sendAudioChunk);

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

  if (!currentLead) return <div className="p-10 text-center text-gray-500">Select a lead.</div>;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-900">
      <div className="w-80 border-r border-gray-700/50 flex flex-col bg-gray-800/20 backdrop-blur-xl">
          <div className="p-6 border-b border-gray-700/50">
              <h3 className="flex items-center gap-2 font-black text-xs uppercase tracking-widest text-gray-500 mb-6">
                  <Brain size={14} className="text-blue-500" /> Seller Intelligence
              </h3>
              <div className="space-y-6">
                  <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Deal Probability</p>
                      <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${(currentInsight?.dealProbability || 0.1) * 100}%` }}></div>
                      </div>
                      <p className="text-right text-[10px] font-black mt-1 text-blue-400">{Math.round((currentInsight?.dealProbability || 0.1) * 100)}% Match</p>
                  </div>
                  <InsightItem label="Personality" value={currentInsight?.personality || 'Detecting...'} icon={<Target size={14} />} />
                  <InsightItem label="Urgency" value={`${currentInsight?.urgency || 1}/10`} icon={<Zap size={14} />} />
                  <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Motivations</p>
                      <div className="flex flex-wrap gap-2">
                          {currentInsight?.motivation.map(m => (
                              <span key={m} className="px-2 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-[10px] font-bold uppercase">{m}</span>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
          <div className="p-6 flex-1 overflow-y-auto">
              <h3 className="font-black text-xs uppercase tracking-widest text-gray-500 mb-4">Call Strategy</h3>
              {currentStrategy && (
                  <div className="space-y-4">
                      <div className="p-4 bg-gray-800/50 rounded-2xl border border-gray-700/50">
                          <p className="text-[10px] font-bold text-blue-500 uppercase mb-1">Tone</p>
                          <p className="text-sm font-bold text-white">{currentStrategy.tone}</p>
                      </div>
                  </div>
              )}
          </div>
      </div>

      <div className="flex-1 flex flex-col border-r border-gray-700/50">
        <div className="p-4 border-b border-gray-700/50 flex justify-between items-center bg-gray-800/40">
          <div><h3 className="font-bold text-white">{currentLead.full_name}</h3></div>
          <div className="flex gap-2">
             {['beginner', 'intermediate', 'advanced'].map((mode) => (
                 <button key={mode} onClick={() => setConfidenceMode(mode as any)} className={`px-3 py-1 text-[10px] font-black uppercase rounded-full border transition-all ${confidenceMode === mode ? 'bg-blue-600 border-blue-500' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>{mode}</button>
             ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
          {transcript.map((entry, i) => (
            <div key={i} className={`flex ${entry.speaker === 'Caller' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${entry.speaker === 'Caller' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-100'}`}><p className="text-sm">{entry.text}</p></div>
            </div>
          ))}
          <div ref={transcriptEndRef} />
        </div>
        <div className="p-4 bg-gray-800/40 border-t border-gray-700/50 space-y-4">
          <form onSubmit={(e) => { e.preventDefault(); if(testInput) { sendTranscript(testInput, 'Client'); setTestInput(''); }}} className="flex gap-2">
              <input type="text" value={testInput} onChange={(e) => setTestInput(e.target.value)} placeholder="Simulate client response..." className="flex-1 bg-gray-900 border border-gray-700/50 rounded-xl px-4 py-2 text-sm text-white" />
              <button type="submit" className="bg-gray-700 text-white px-4 rounded-xl text-xs font-bold">Send</button>
          </form>
          <button onClick={handleEndCall} className="w-full bg-red-600 text-white py-3 rounded-xl font-black text-xs uppercase">End Session</button>
        </div>
      </div>

      <div className="w-[400px] flex flex-col bg-gray-800/20 backdrop-blur-xl">
          <div className="p-6 border-b border-gray-700/50"><h3 className="font-black text-xs uppercase tracking-widest text-blue-400">Suggestions</h3></div>
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {suggestions.map((s, i) => (
                  <div key={i} className={`p-6 rounded-3xl border ${i === 0 ? 'bg-blue-600/10 border-blue-500' : 'bg-gray-800/40 border-gray-700/50'}`}>
                      <div className="bg-black/40 p-5 rounded-2xl border border-white/5 mb-4">
                          <p className="text-lg font-bold text-white leading-relaxed">"{s.multiStyleRebuttals && selectedStyle !== 'suggested' ? (s.multiStyleRebuttals as any)[selectedStyle] : s.suggested_response}"</p>
                      </div>
                      {s.multiStyleRebuttals && (
                          <div className="flex flex-wrap gap-2">
                              {['suggested', 'soft', 'firm', 'aggressive', 'empathy'].map(style => (
                                  <button key={style} onClick={() => setSelectedStyle(style as any)} className={`px-2 py-1 rounded text-[10px] font-black uppercase border ${selectedStyle === style ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-500'}`}>{style}</button>
                              ))}
                          </div>
                      )}
                  </div>
              ))}
          </div>
      </div>
    </div>
  );
};

const InsightItem = ({ label, value, icon }: any) => (
    <div className="flex items-center gap-3">
        <div className="p-2 bg-gray-800 rounded-lg border border-gray-700/50 text-gray-400">{icon}</div>
        <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase">{label}</p>
            <p className="text-xs font-black text-white uppercase">{value}</p>
        </div>
    </div>
);

export default CallCopilotView;
