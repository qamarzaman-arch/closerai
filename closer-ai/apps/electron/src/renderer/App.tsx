import React, { useState } from 'react';
import { useAppStore } from './store/useAppStore';
import LeadsView from './views/LeadsView';
import CallCopilotView from './views/CallCopilotView';
import DashboardView from './views/DashboardView';
import { LayoutDashboard, Users, History, Headphones } from 'lucide-react';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<'dashboard' | 'leads'>('dashboard');
  const isCalling = useAppStore(state => state.isCalling);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-900 text-white">
      {!isCalling && (
        <div className="w-72 bg-gray-800 p-6 border-r border-gray-700/50 flex flex-col">
          <div className="flex items-center gap-4 mb-12">
            <div className="bg-blue-600 p-2.5 rounded-2xl"><Headphones size={28} /></div>
            <h1 className="text-2xl font-black">Closer<span className="text-blue-500">AI</span></h1>
          </div>
          <nav className="flex-1 space-y-2">
            <NavItem icon={<LayoutDashboard size={22} />} label="Dashboard" active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')} />
            <NavItem icon={<Users size={22} />} label="Leads" active={activeView === 'leads'} onClick={() => setActiveView('leads')} />
          </nav>
        </div>
      )}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-900">
        {isCalling ? <CallCopilotView /> : activeView === 'dashboard' ? <DashboardView /> : <LeadsView />}
      </div>
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all ${active ? 'bg-blue-600' : 'text-gray-400 hover:bg-gray-800'}`}>
    {icon}<span className="font-bold">{label}</span>
  </button>
);

export default App;
