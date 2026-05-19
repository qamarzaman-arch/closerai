import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Activity, CalendarClock, Database, Users, PhoneCall, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

type Analytics = {
  totalLeads: number;
  totalCalls: number;
  totalObjections: number;
  dueFollowUps: number;
  recentLeads: number;
  recentSessions: number;
  averageDealScore: number;
  statusBreakdown: Array<{ status: string; count: number }>;
  hotLeads: Array<{ id: string; full_name: string; deal_score?: number; call_status: string }>;
};

const DashboardView: React.FC = () => {
  const leads = useAppStore(state => state.leads);
  const setLeads = useAppStore(state => state.setLeads);
  const [dbStatus, setDbStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  useEffect(() => {
    axios.get('http://localhost:3001/api/leads').then(res => setLeads(res.data)).catch(console.error);
    axios.get('http://localhost:3001/api/leads/analytics/summary').then(res => setAnalytics(res.data)).catch(console.error);
    axios.get('http://localhost:3001/health/db')
      .then(() => setDbStatus('ok'))
      .catch(() => setDbStatus('error'));
  }, [setLeads]);

  const stats = useMemo(() => {
    if (analytics) {
      return {
        totalLeads: analytics.totalLeads,
        totalCalls: analytics.totalCalls,
        objections: analytics.totalObjections,
        averageScore: analytics.averageDealScore,
        dueFollowUps: analytics.dueFollowUps,
        recentLeads: analytics.recentLeads,
        recentSessions: analytics.recentSessions,
        statusBreakdown: analytics.statusBreakdown,
        hotLeads: analytics.hotLeads,
      };
    }

    const sessions = leads.flatMap((lead: any) => lead.sessions || []);
    const objections = sessions.reduce((total: number, session: any) => total + (session.objections?.length || 0), 0);
    const scoredLeads = leads.filter((lead: any) => Number(lead.deal_score) > 0);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const dueFollowUps = leads.filter((lead: any) => lead.follow_up_date && new Date(lead.follow_up_date) <= today).length;
    const averageScore = scoredLeads.length
      ? Math.round(scoredLeads.reduce((total: number, lead: any) => total + Number(lead.deal_score), 0) / scoredLeads.length)
      : 0;

    return {
      totalLeads: leads.length,
      totalCalls: sessions.length,
      objections,
      averageScore,
      dueFollowUps,
      recentLeads: 0,
      recentSessions: 0,
      statusBreakdown: [],
      hotLeads: [...leads].sort((a: any, b: any) => Number(b.deal_score || 0) - Number(a.deal_score || 0)).slice(0, 5),
    };
  }, [analytics, leads]);

  return (
    <div className="p-8 max-w-7xl mx-auto w-full overflow-y-auto">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-white">Command Center</h2>
          <p className="text-sm text-gray-500 font-semibold mt-1">Pipeline health, call activity, and follow-up pressure.</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black uppercase ${dbStatus === 'ok' ? 'bg-green-500/10 text-green-400' : dbStatus === 'checking' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'}`}>
          <Database size={15} /> MySQL {dbStatus}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={<Users className="text-blue-500" />} label="Total Leads" value={stats.totalLeads} />
        <StatCard icon={<PhoneCall className="text-green-500" />} label="Total Calls" value={stats.totalCalls} />
        <StatCard icon={<AlertTriangle className="text-yellow-500" />} label="Objections" value={stats.objections} />
        <StatCard icon={<CalendarClock className="text-purple-500" />} label="Follow Ups Due" value={stats.dueFollowUps} />
      </div>
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-3xl p-6">
          <p className="text-gray-400 text-sm font-medium">Average Deal Score</p>
          <p className="text-4xl font-black mt-2 text-white">{stats.averageScore}%</p>
          <div className="h-2 bg-gray-900 rounded-full overflow-hidden mt-5">
            <div className="h-full bg-green-500" style={{ width: `${Math.min(100, stats.averageScore)}%` }} />
          </div>
        </div>
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-3xl p-6">
          <p className="text-gray-400 text-sm font-medium mb-4 flex items-center gap-2"><Activity size={16} /> Last 7 Days</p>
          <div className="grid grid-cols-2 gap-4">
            <MiniMetric label="New Leads" value={stats.recentLeads} />
            <MiniMetric label="Calls" value={stats.recentSessions} />
          </div>
          <div className="mt-5 space-y-2">
            {stats.statusBreakdown.map((item: any) => (
              <div key={item.status} className="flex items-center justify-between text-xs">
                <span className="text-gray-400 font-bold">{item.status.replace('_', ' ')}</span>
                <span className="text-white font-black">{item.count}</span>
              </div>
            ))}
            {!stats.statusBreakdown.length && <p className="text-sm text-gray-500">No status data yet.</p>}
          </div>
        </div>
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-3xl p-6">
          <p className="text-gray-400 text-sm font-medium mb-4">Hot Prospects</p>
          <div className="space-y-3">
            {stats.hotLeads.map((lead: any) => (
              <div key={lead.id} className="flex items-center justify-between text-sm">
                <span className="font-bold text-white">{lead.full_name}</span>
                <span className="font-black text-green-400">{Math.round(Number(lead.deal_score || 0))}%</span>
              </div>
            ))}
            {!leads.length && <p className="text-sm text-gray-500">No prospects yet.</p>}
          </div>
        </div>
      </div>
      <div className="mt-6 bg-gray-800/40 border border-gray-700/50 rounded-3xl p-6">
        <p className="text-gray-400 text-sm font-medium mb-4">Pipeline Distribution</p>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {['NEW', 'CONTACTED', 'FOLLOW_UP', 'QUALIFIED', 'NOT_INTERESTED'].map(status => {
            const count = stats.statusBreakdown.find((item: any) => item.status === status)?.count || 0;
            const width = stats.totalLeads ? Math.max(6, Math.round((count / stats.totalLeads) * 100)) : 0;
            return (
              <div key={status} className="bg-gray-900/60 border border-gray-700/50 rounded-2xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-black uppercase text-gray-500">{status.replace('_', ' ')}</span>
                  <span className="text-sm font-black text-white">{count}</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${width}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value }: any) => (
    <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-6">
        <div className="p-3 bg-gray-900 w-fit rounded-xl border border-gray-700 mb-4">{icon}</div>
        <p className="text-gray-400 text-sm font-medium">{label}</p>
        <p className="text-3xl font-bold mt-1 text-white">{value}</p>
    </div>
);

const MiniMetric = ({ label, value }: any) => (
  <div className="bg-gray-900/60 rounded-2xl p-4 border border-gray-700/50">
    <p className="text-[10px] font-black uppercase text-gray-500">{label}</p>
    <p className="text-2xl font-black text-white mt-1">{value}</p>
  </div>
);

export default DashboardView;
