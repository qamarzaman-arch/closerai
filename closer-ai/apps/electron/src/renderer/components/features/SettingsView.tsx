import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Bot, CheckCircle, Database, RefreshCw, Server, ShieldCheck, XCircle } from 'lucide-react';

import { API_BASE } from '../../config/api';

const API = API_BASE;

const SettingsView: React.FC = () => {
  const [apiStatus, setApiStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [dbStatus, setDbStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [aiStatus, setAiStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [dbProvider, setDbProvider] = useState('Database');

  const refresh = async () => {
    setApiStatus('checking');
    setDbStatus('checking');
    setAiStatus('checking');

    try {
      const res = await axios.get(`${API}/health`);
      setApiStatus('ok');
      if (res.data?.aiConfigured === false) setAiStatus('error');
    } catch {
      setApiStatus('error');
    }

    try {
      const res = await axios.get(`${API}/health/db`);
      setDbStatus('ok');
      setDbProvider(res.data?.provider || 'Database');
    } catch {
      setDbStatus('error');
    }

    try {
      const res = await axios.get(`${API}/health/ai`);
      setAiStatus(res.data?.status === 'ok' ? 'ok' : 'error');
    } catch {
      setAiStatus('error');
    }

    axios.get(`${API}/api/leads/analytics/summary`).then(res => setAnalytics(res.data)).catch(() => setAnalytics(null));
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="h-full overflow-y-auto p-8 max-w-6xl w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-white">Operations</h2>
          <p className="text-sm text-gray-500 font-semibold mt-1">Runtime health, AI provider, and local database readiness.</p>
        </div>
        <button onClick={refresh} className="bg-gray-800 hover:bg-blue-600 text-white px-4 py-3 rounded-xl text-xs font-black uppercase flex items-center gap-2">
          <RefreshCw size={15} /> Check Now
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <StatusCard icon={<Server />} label="Backend API" status={apiStatus} detail="Express + WebSocket service on port 3001" />
        <StatusCard icon={<Database />} label={dbProvider.toUpperCase()} status={dbStatus} detail="Local database for leads, sessions, and transcripts" />
        <StatusCard icon={<Bot />} label="OpenRouter / AI" status={aiStatus} detail="OpenAI-compatible provider for script and call coaching" />
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-sm font-black uppercase text-white mb-5 flex items-center gap-2"><ShieldCheck size={16} /> Enterprise Controls</h3>
          <div className="space-y-3">
            <ControlLine label="Local MySQL persistence" enabled />
            <ControlLine label="OpenRouter AI generation" enabled />
            <ControlLine label="Secure Electron context isolation" enabled />
            <ControlLine label="CSV import/export" enabled />
            <ControlLine label="Lead-specific AI research context" enabled />
          </div>
        </div>
        <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-sm font-black uppercase text-white mb-5">Current Workspace</h3>
          <div className="grid grid-cols-2 gap-4">
            <Metric label="Prospects" value={analytics?.totalLeads ?? '-'} />
            <Metric label="Calls" value={analytics?.totalCalls ?? '-'} />
            <Metric label="Follow Ups" value={analytics?.dueFollowUps ?? '-'} />
            <Metric label="Avg Score" value={`${analytics?.averageDealScore ?? 0}%`} />
          </div>
        </div>
      </div>
    </div>
  );
};

const StatusCard = ({ icon, label, status, detail }: any) => (
  <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6">
    <div className="flex items-center justify-between mb-5">
      <div className="text-blue-400">{icon}</div>
      <StatusPill status={status} />
    </div>
    <h3 className="font-black text-white">{label}</h3>
    <p className="text-sm text-gray-500 font-semibold mt-2">{detail}</p>
  </div>
);

const StatusPill = ({ status }: { status: string }) => (
  <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${status === 'ok' ? 'bg-green-500/10 text-green-400' : status === 'checking' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'}`}>{status}</span>
);

const ControlLine = ({ label, enabled }: any) => (
  <div className="flex items-center justify-between bg-gray-800/60 rounded-xl px-4 py-3">
    <span className="text-sm font-bold text-gray-300">{label}</span>
    {enabled ? <CheckCircle size={17} className="text-green-400" /> : <XCircle size={17} className="text-red-400" />}
  </div>
);

const Metric = ({ label, value }: any) => (
  <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700/50">
    <p className="text-[10px] font-black uppercase text-gray-500">{label}</p>
    <p className="text-3xl font-black text-white mt-1">{value}</p>
  </div>
);

export default SettingsView;
