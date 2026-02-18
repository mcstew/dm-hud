import React, { useState, useEffect } from 'react';
import { IconUsers, IconActivity, IconBrain, IconFlame } from '@tabler/icons-react';
import * as dbOps from '../lib/db';

export default function StatsView() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dbOps.adminFetchStats().then(data => {
      setStats(data);
      setLoading(false);
    }).catch(err => {
      console.error('Failed to load stats:', err);
      setLoading(false);
    });
  }, []);

  if (loading) return <p className="text-gray-400 text-sm">Loading...</p>;

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers || 0, icon: IconUsers, color: 'indigo' },
    { label: 'Daily Active Users', value: stats?.dau || 0, icon: IconFlame, color: 'amber' },
    { label: 'Total AI Calls', value: stats?.totalAICalls || 0, icon: IconBrain, color: 'emerald' },
    { label: 'AI Calls Today', value: stats?.aiCallsToday || 0, icon: IconActivity, color: 'pink' },
  ];

  const colorMap = {
    indigo: { bg: 'bg-indigo-900/30', border: 'border-indigo-500/40', text: 'text-indigo-400', icon: 'text-indigo-400' },
    amber: { bg: 'bg-amber-900/30', border: 'border-amber-500/40', text: 'text-amber-400', icon: 'text-amber-400' },
    emerald: { bg: 'bg-emerald-900/30', border: 'border-emerald-500/40', text: 'text-emerald-400', icon: 'text-emerald-400' },
    pink: { bg: 'bg-pink-900/30', border: 'border-pink-500/40', text: 'text-pink-400', icon: 'text-pink-400' },
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Stats</h2>

      <div className="grid grid-cols-2 gap-4">
        {statCards.map(card => {
          const colors = colorMap[card.color];
          return (
            <div key={card.label} className={`${colors.bg} border ${colors.border} rounded-xl p-6`}>
              <div className="flex items-center gap-3 mb-3">
                <card.icon size={20} className={colors.icon} />
                <span className="text-sm text-gray-400">{card.label}</span>
              </div>
              <p className={`text-3xl font-bold ${colors.text}`}>{card.value.toLocaleString()}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
