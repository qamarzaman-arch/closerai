import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAppStore } from '../store/useAppStore';
import { useWebSocket } from '../hooks/useWebSocket';
import { UserPlus, Phone, Search, MoreVertical, MapPin, TrendingUp, Tag } from 'lucide-react';

const LeadsView: React.FC = () => {
  const leads = useAppStore(state => state.leads);
  const { setLeads, setCurrentLead, setIsCalling } = useAppStore();
  const { startCall } = useWebSocket();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    axios.get('http://localhost:3001/api/leads').then(res => setLeads(res.data)).catch(console.error);
  }, []);

  const handleStartCall = (lead: any) => {
      setCurrentLead(lead);
      setIsCalling(true);
      startCall(lead.id);
  };

  const filteredLeads = leads.filter(lead =>
    lead.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.phone_number.includes(searchTerm)
  );

  return (
    <div className="p-8 max-w-6xl mx-auto w-full">
      <div className="flex justify-between items-center mb-10">
        <div>
            <h2 className="text-3xl font-black tracking-tighter text-white">Prospects</h2>
            <p className="text-gray-500 mt-1 font-medium">AI-scored real estate opportunities.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-blue-900/20 active:scale-95">
          <UserPlus size={16} /> New Prospect
        </button>
      </div>

      <div className="relative mb-12 group">
        <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 text-gray-600 group-focus-within:text-blue-500 transition-colors" size={20} />
        <input
          type="text" placeholder="Search by name, phone, or address..."
          className="w-full bg-gray-800/40 border-2 border-gray-700/50 rounded-3xl py-5 pl-16 pr-6 text-white font-bold focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-gray-600"
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-6">
        {filteredLeads.map((lead) => (
          <div key={lead.id} className="bg-gray-800/40 border border-gray-700/50 rounded-[2.5rem] p-6 flex items-center justify-between hover:bg-gray-800 transition-all group relative overflow-hidden">
            <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-blue-600/10 rounded-3xl flex items-center justify-center text-blue-500 font-black text-2xl border border-blue-500/20">
                    {lead.full_name.charAt(0)}
                </div>
                <div>
                    <h3 className="font-black text-xl text-white group-hover:text-blue-400 transition-colors">{lead.full_name}</h3>
                    <div className="flex items-center gap-5 mt-1.5">
                        <span className="text-sm text-gray-500 font-bold flex items-center gap-1.5"><Phone size={14} className="text-gray-700" />{lead.phone_number}</span>
                        {lead.property_address && (
                            <span className="text-sm text-gray-500 font-bold flex items-center gap-1.5"><MapPin size={14} className="text-gray-700" />{lead.property_address}</span>
                        )}
                    </div>
                    <div className="flex gap-2 mt-3">
                        {lead.motivation_tags?.split(',').map(tag => (
                            <span key={tag} className="px-2 py-0.5 bg-gray-700/50 text-[10px] font-black uppercase text-gray-400 rounded-md border border-white/5">{tag.replace('_', ' ')}</span>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-8">
                <div className="text-right">
                    <div className="flex items-center gap-2 text-green-500 font-black text-xs uppercase mb-1 justify-end">
                        <TrendingUp size={12} /> {lead.deal_score || 0}% Score
                    </div>
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Deal Probability</p>
                </div>

                <button onClick={() => handleStartCall(lead)} className="p-5 bg-green-600/10 text-green-500 hover:bg-green-600 hover:text-white rounded-[2rem] transition-all shadow-xl shadow-green-900/0 hover:shadow-green-900/20 active:scale-90">
                    <Phone size={24} />
                </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeadsView;
