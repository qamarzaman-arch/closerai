import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAppStore } from '../../store/useAppStore';
import { useWebSocket } from '../../hooks/useWebSocket';
import { UserPlus, Phone, Search, TrendingUp } from 'lucide-react';

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
        <div><h2 className="text-3xl font-black tracking-tighter text-white">Prospects</h2></div>
        <button className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase shadow-xl shadow-blue-900/20">New Prospect</button>
      </div>
      <div className="relative mb-12">
        <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 text-gray-600" size={20} />
        <input type="text" placeholder="Search..." className="w-full bg-gray-800/40 border-2 border-gray-700/50 rounded-3xl py-5 pl-16 pr-6 text-white font-bold focus:outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>
      <div className="grid gap-6">
        {filteredLeads.map((lead) => (
          <div key={lead.id} className="bg-gray-800/40 border border-gray-700/50 rounded-[2.5rem] p-6 flex items-center justify-between hover:bg-gray-800 transition-all">
            <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-blue-600/10 rounded-3xl flex items-center justify-center text-blue-500 font-black text-2xl border border-blue-500/20">{lead.full_name.charAt(0)}</div>
                <div>
                    <h3 className="font-black text-xl text-white">{lead.full_name}</h3>
                    <div className="flex items-center gap-5 mt-1.5"><span className="text-sm text-gray-500 font-bold">{lead.phone_number}</span></div>
                </div>
            </div>
            <div className="flex items-center gap-8">
                <div className="text-right"><div className="flex items-center gap-2 text-green-500 font-black text-xs uppercase mb-1 justify-end"><TrendingUp size={12} /> {lead.deal_score || 0}% Score</div></div>
                <button onClick={() => handleStartCall(lead)} className="p-5 bg-green-600/10 text-green-500 hover:bg-green-600 hover:text-white rounded-[2rem] transition-all"><Phone size={24} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeadsView;
