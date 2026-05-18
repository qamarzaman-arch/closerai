import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAudioCapture } from '../hooks/useAudioCapture';
import { PhoneOff, MessageSquare, AlertCircle, Sparkles, Copy, Mic, Monitor, MicOff } from 'lucide-react';

const CallCopilotView: React.FC = () => {
  const currentLead = useAppStore(state => state.currentLead);
  const transcript = useAppStore(state => state.transcript);
  const suggestions = useAppStore(state => state.suggestions);
  const isCalling = useAppStore(state => state.isCalling);
  const confidenceMode = useAppStore(state => state.confidenceMode);

  const { setIsCalling, clearCallData, setConfidenceMode, setCurrentLead } = useAppStore();
  const { endCall, sendAudioChunk, sendTranscript } = useWebSocket();

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const [testInput, setTestInput] = useState('');

  const { isRecording, startRecording, stopRecording } = useAudioCapture(sendAudioChunk);

  useEffect(() => {
    if (isCalling && !isRecording) {
        startRecording();
    }
    return () => {
        stopRecording();
    };
  }, [isCalling]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const handleEndCall = () => {
    endCall('Call ended by user');
    stopRecording();
    setIsCalling(false);
    clearCallData();
    setCurrentLead(null);
  };

  const memoizedTranscript = useMemo(() => transcript, [transcript]);
  const memoizedSuggestions = useMemo(() => suggestions, [suggestions]);

  if (!currentLead) return <div className="p-10 text-center text-gray-500">Select a lead to start a call.</div>;

  return (
    <div className="flex h-[calc(100vh)] overflow-hidden">
      <div className="flex-1 flex flex-col bg-gray-900 border-r border-gray-700">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800/50">
          <div>
            <h3 className="font-bold text-lg">{currentLead.full_name}</h3>
            <p className="text-sm text-gray-400">{currentLead.phone_number}</p>
          </div>
          <div className="flex gap-2">
             {['beginner', 'intermediate', 'advanced'].map((mode) => (
                 <button
                    key={mode}
                    onClick={() => setConfidenceMode(mode as any)}
                    className={`px-3 py-1 text-xs rounded-full border transition-all ${confidenceMode === mode ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-900/40' : 'bg-gray-800 border-gray-700 hover:border-gray-600'}`}
                 >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                 </button>
             ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {memoizedTranscript.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-gray-600">
                  <div className="animate-pulse flex gap-2 items-center mb-4">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                  <p>Listening for audio...</p>
              </div>
          )}
          {memoizedTranscript.map((entry, i) => (
            <div key={i} className={`flex ${entry.speaker === 'Caller' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-xl ${entry.speaker === 'Caller' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-gray-800 text-gray-100 rounded-tl-none border border-gray-700'}`}>
                <div className="flex justify-between items-center gap-4 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">{entry.speaker}</span>
                    <span className="text-[10px] opacity-40">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="leading-relaxed">{entry.text}</p>
              </div>
            </div>
          ))}
          <div ref={transcriptEndRef} />
        </div>

        <div className="p-4 bg-gray-800 border-t border-gray-700 space-y-4">
          <form onSubmit={(e) => {
              e.preventDefault();
              if (testInput) {
                  sendTranscript(testInput, 'Client');
                  setTestInput('');
              }
          }} className="flex gap-2">
              <input
                type="text"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="Simulate client speech..."
                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              />
              <button type="submit" className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm transition-colors">Send</button>
          </form>

          <div className="flex gap-4">
              <div className={`flex-1 flex gap-2 items-center justify-center p-3 rounded-xl border ${isRecording ? 'bg-green-900/10 border-green-800 text-green-400' : 'bg-gray-900/50 border-gray-700 text-gray-500'} text-sm transition-all`}>
                  {isRecording ? <Mic size={16} className="animate-pulse" /> : <MicOff size={16} />}
                  {isRecording ? 'Mic Active' : 'Mic Off'}
              </div>
              <div className="flex-1 flex gap-2 items-center justify-center p-3 bg-gray-900/50 rounded-xl border border-gray-700 text-blue-400 text-sm">
                  <Monitor size={16} />
                  System Audio
              </div>
              <button
                onClick={handleEndCall}
                className="flex-[2] bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all hover:scale-[1.02] shadow-lg shadow-red-900/20"
              >
                <PhoneOff size={18} />
                End Call
              </button>
          </div>
        </div>
      </div>

      <div className="w-[400px] flex flex-col bg-gray-800">
        <div className="p-4 border-b border-gray-700 bg-gray-800/80 backdrop-blur-md sticky top-0 z-10 flex justify-between items-center">
          <h3 className="flex items-center gap-2 font-bold text-blue-400">
            <Sparkles size={20} />
            Live Copilot
          </h3>
          <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-1 rounded border border-blue-500/20 font-bold uppercase tracking-widest">v2.0</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {memoizedSuggestions.length === 0 ? (
            <div className="text-center py-20 text-gray-500 flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-750 rounded-full flex items-center justify-center mb-4">
                <MessageSquare size={32} className="opacity-20" />
              </div>
              <p className="text-sm px-10">AI is waiting for conversation context...</p>
            </div>
          ) : (
            memoizedSuggestions.map((s, i) => (
              <div key={i} className={`p-5 rounded-2xl border transition-all animate-in slide-in-from-right-4 duration-500 ${i === 0 ? 'bg-blue-600/10 border-blue-500 shadow-xl shadow-blue-900/20 ring-1 ring-blue-500/50' : 'bg-gray-750 border-gray-700 opacity-60'}`}>
                {s.detected_objection && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-start gap-3">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold mb-1 uppercase tracking-tight text-red-300">Objection Detected</p>
                        <p className="opacity-80">{s.detected_objection}</p>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center mb-3">
                    <p className="text-blue-400 text-[10px] font-bold uppercase tracking-widest">Recommended Response</p>
                    <button
                        onClick={() => navigator.clipboard.writeText(s.suggested_response)}
                        className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 transition-colors"
                    >
                        <Copy size={14} />
                    </button>
                </div>

                <div className="bg-black/20 p-4 rounded-xl text-gray-100 mb-4 border border-white/5">
                  <p className="text-lg leading-relaxed font-medium">"{s.suggested_response}"</p>
                </div>

                {s.rebuttal && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <p className="text-green-400 text-[10px] font-bold uppercase tracking-widest mb-2">Rebuttal Strategy</p>
                    <p className="text-sm text-gray-300 leading-relaxed italic border-l-2 border-green-500/30 pl-3">
                      {s.rebuttal}
                    </p>
                  </div>
                )}

                {s.confidence_tips && (
                  <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-blue-300/60 uppercase tracking-tighter">
                    <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                    {s.confidence_tips}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CallCopilotView;
