import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { CalendarClock, Phone, RefreshCw, TrendingUp } from 'lucide-react';
import { API_BASE } from '../../config/api';
import { useAppStore } from '../../store/useAppStore';
import { useWebSocket } from '../../hooks/useWebSocket';

const stages = [
  { id: 'NEW', label: 'New', hint: 'Fresh records' },
  { id: 'CONTACTED', label: 'Contacted', hint: 'Conversation started' },
  { id: 'FOLLOW_UP', label: 'Follow Up', hint: 'Needs next touch' },
  { id: 'QUALIFIED', label: 'Qualified', hint: 'Potential deal' },
  { id: 'NOT_INTERESTED', label: 'Closed Lost', hint: 'Do not pursue' },
];

const PipelineView: React.FC = () => {
  const leads = useAppStore(state => state.leads);
  const { setLeads, setCurrentLead, setIsCalling } = useAppStore();
  const { startCall } = useWebSocket();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const loadLeads = async () => {
    const res = await axios.get(`${API_BASE}/api/leads`);
    setLeads(res.data);
  };

  useEffect(() => {
    loadLeads().catch(console.error);
  }, []);

  const grouped = useMemo(() => stages.map(stage => ({
    ...stage,
    leads: leads.filter((lead: any) => (lead.call_status || 'NEW') === stage.id),
  })), [leads]);

  const moveLead = async (lead: any, status: string) => {
    setUpdatingId(lead.id);
    try {
      const payload: any = { call_status: status };
      if (status === 'FOLLOW_UP' && !lead.follow_up_date) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        payload.follow_up_date = tomorrow.toISOString().slice(0, 10);
      }
      await axios.put(`${API_BASE}/api/leads/${lead.id}`, payload);
      await loadLeads();
      setMessage(`${lead.full_name} moved to ${status.replace('_', ' ')}.`);
    } finally {
      setUpdatingId(null);
    }
  };

  const callLead = (lead: any) => {
    setCurrentLead(lead);
    setIsCalling(true);
    startCall(lead.id);
  };

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-white">Pipeline</h2>
          <p className="text-sm text-gray-500 font-semibold mt-1">Move prospects through the sales workflow.</p>
        </div>
        <button onClick={loadLeads} className="bg-gray-800 hover:bg-blue-600 text-white px-4 py-3 rounded-xl text-xs font-black uppercase flex items-center gap-2">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {message && <div className="mb-6 bg-green-500/10 border border-green-500/30 text-green-300 rounded-xl p-4 text-sm font-bold">{message}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {grouped.map(stage => (
          <section key={stage.id} className="bg-gray-900/60 border border-gray-800 rounded-2xl min-h-[540px] flex flex-col">
            <div className="p-4 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase text-white">{stage.label}</h3>
                <span className="bg-gray-800 text-gray-300 rounded-full px-2 py-1 text-[10px] font-black">{stage.leads.length}</span>
              </div>
              <p className="text-xs text-gray-500 font-semibold mt-1">{stage.hint}</p>
            </div>
            <div className="p-3 space-y-3 flex-1 overflow-y-auto">
              {stage.leads.map((lead: any) => (
                <article key={lead.id} className="bg-gray-800/70 border border-gray-700/50 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="font-black text-white truncate">{lead.full_name}</h4>
                      <p className="text-xs text-gray-500 font-bold truncate">{lead.phone_number}</p>
                    </div>
                    <button onClick={() => callLead(lead)} className="p-2 bg-green-500/10 text-green-400 hover:bg-green-600 hover:text-white rounded-lg">
                      <Phone size={14} />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[10px] font-black uppercase">
                    <span className="text-green-400 flex items-center gap-1"><TrendingUp size={12} /> {Math.round(Number(lead.deal_score || 0))}%</span>
                    {lead.follow_up_date && <span className="text-blue-300 flex items-center gap-1"><CalendarClock size={12} /> {new Date(lead.follow_up_date).toLocaleDateString()}</span>}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {stages.filter(target => target.id !== stage.id).slice(0, 4).map(target => (
                      <button
                        key={target.id}
                        disabled={updatingId === lead.id}
                        onClick={() => moveLead(lead, target.id)}
                        className="bg-gray-900 hover:bg-blue-600 disabled:opacity-50 text-gray-300 hover:text-white rounded-lg py-2 text-[10px] font-black uppercase"
                      >
                        {target.label}
                      </button>
                    ))}
                  </div>
                </article>
              ))}
              {!stage.leads.length && <div className="text-center text-sm text-gray-600 font-bold py-10">No prospects</div>}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default PipelineView;
