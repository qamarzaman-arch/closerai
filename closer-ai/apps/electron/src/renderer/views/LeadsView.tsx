import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAppStore } from '../store/useAppStore';
import { useWebSocket } from '../hooks/useWebSocket';
import { UserPlus, Phone, Search, MoreVertical, MapPin } from 'lucide-react';

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
            <h2 className="text-3xl font-bold tracking-tight text-white">Leads</h2>
            <p className="text-gray-400 mt-1">Manage your prospects and start calls.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold transition-all shadow-lg shadow-blue-900/20">
          <UserPlus size={20} />
          New Lead
        </button>
      </div>

      <div className="relative mb-8 group">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
        <input
          type="text"
          placeholder="Search leads..."
          className="w-full bg-gray-800/50 border border-gray-700 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500/50"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-4">
        {filteredLeads.map((lead) => (
          <div key={lead.id} className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-5 flex items-center justify-between hover:bg-gray-800 transition-all group">
            <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-500 font-bold text-xl border border-blue-500/20">
                    {lead.full_name.charAt(0)}
                </div>
                <div>
                    <h3 className="font-bold text-lg text-white">{lead.full_name}</h3>
                    <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm text-gray-400 flex items-center gap-1"><Phone size={14} />{lead.phone_number}</span>
                    </div>
                </div>
            </div>
            <button onClick={() => handleStartCall(lead)} className="p-3 bg-green-600/10 text-green-500 hover:bg-green-600 hover:text-white rounded-xl transition-all">
                <Phone size={22} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeadsView;
