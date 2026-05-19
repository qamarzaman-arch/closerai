import React, { useState } from 'react';
import { useAppStore } from './store/useAppStore';
import LeadsView from './components/features/LeadsView';
import CallCopilotView from './components/features/CallCopilotView';
import DashboardView from './components/features/DashboardView';
import PipelineView from './components/features/PipelineView';
import SettingsView from './components/features/SettingsView';
import { Activity, KanbanSquare, LayoutDashboard, Settings, Users, Headphones } from 'lucide-react';

type AppView = 'dashboard' | 'leads' | 'pipeline' | 'settings';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const isCalling = useAppStore(state => state.isCalling);
  const currentLead = useAppStore(state => state.currentLead);
  const showCallView = isCalling || !!currentLead;

  return (
    <div className="flex h-screen overflow-hidden bg-[#0b1018] text-white selection:bg-blue-500/30">
      {!showCallView && (
        <div className="w-72 bg-[#111827] p-5 border-r border-gray-800 flex flex-col">
          <div className="flex items-center gap-4 mb-8 px-1">
            <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-900/40"><Headphones size={26} /></div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter">Closer<span className="text-blue-500">AI</span></h1>
              <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Enterprise Desk</p>
            </div>
          </div>
          <div className="mb-6 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
            <div className="flex items-center gap-2 text-blue-300 text-xs font-black uppercase mb-2"><Activity size={14} /> Live Workspace</div>
            <p className="text-sm text-gray-300 font-semibold">MySQL + OpenRouter connected sales operations.</p>
          </div>
          <nav className="flex-1 space-y-1">
            <NavItem icon={<LayoutDashboard size={20} />} label="Command" active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')} />
            <NavItem icon={<Users size={20} />} label="Prospects" active={activeView === 'leads'} onClick={() => setActiveView('leads')} />
            <NavItem icon={<KanbanSquare size={20} />} label="Pipeline" active={activeView === 'pipeline'} onClick={() => setActiveView('pipeline')} />
            <NavItem icon={<Settings size={20} />} label="Operations" active={activeView === 'settings'} onClick={() => setActiveView('settings')} />
          </nav>
          <div className="pt-4 border-t border-gray-800 text-[10px] text-gray-500 font-bold uppercase tracking-wider">Local desktop build</div>
        </div>
      )}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0b1018]">
        {showCallView ? <CallCopilotView /> : (
          activeView === 'dashboard' ? <DashboardView /> :
          activeView === 'pipeline' ? <PipelineView /> :
          activeView === 'settings' ? <SettingsView /> :
          <LeadsView />
        )}
      </div>
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${active ? 'bg-blue-600 text-white shadow-xl shadow-blue-950/40' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
    {icon}<span className="font-bold">{label}</span>
  </button>
);

export default App;
