import React from 'react';
import { Users, PhoneCall, CheckCircle, AlertTriangle } from 'lucide-react';

const DashboardView: React.FC = () => {
  return (
    <div className="p-8 max-w-6xl mx-auto w-full">
      <h2 className="text-3xl font-bold tracking-tight text-white mb-10">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={<Users className="text-blue-500" />} label="Total Leads" value="24" />
        <StatCard icon={<PhoneCall className="text-green-500" />} label="Total Calls" value="152" />
        <StatCard icon={<AlertTriangle className="text-yellow-500" />} label="Objections" value="43" />
        <StatCard icon={<CheckCircle className="text-purple-500" />} label="Success" value="12%" />
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value }: any) => (
    <div className="bg-gray-800/40 border border-gray-700/50 rounded-3xl p-6">
        <div className="p-3 bg-gray-900 w-fit rounded-2xl border border-gray-700 mb-4">{icon}</div>
        <p className="text-gray-400 text-sm font-medium">{label}</p>
        <p className="text-3xl font-bold mt-1 text-white">{value}</p>
    </div>
);

export default DashboardView;
