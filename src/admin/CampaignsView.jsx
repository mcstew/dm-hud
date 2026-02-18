import React, { useState, useEffect } from 'react';
import { IconSearch } from '@tabler/icons-react';
import * as dbOps from '../lib/db';

export default function CampaignsView() {
  const [campaigns, setCampaigns] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadCampaigns = async (term = '') => {
    setLoading(true);
    try {
      const data = await dbOps.adminFetchAllCampaigns(term);
      setCampaigns(data);
    } catch (err) {
      console.error('Failed to load campaigns:', err);
    }
    setLoading(false);
  };

  useEffect(() => { loadCampaigns(); }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Campaigns</h2>

      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadCampaigns(search)}
            placeholder="Search campaigns..."
            className="w-full pl-9 pr-3 py-2.5 bg-gray-900/50 border border-gray-800 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <button onClick={() => loadCampaigns(search)} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors">
          Search
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : (
        <div className="bg-gray-900/30 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="text-left px-4 py-3 font-medium">Campaign</th>
                <th className="text-left px-4 py-3 font-medium">Owner</th>
                <th className="text-left px-4 py-3 font-medium">Last Updated</th>
                <th className="text-left px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => (
                <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-white">{c.name}</p>
                    <p className="text-xs text-gray-500 font-mono">{c.id.slice(0, 8)}...</p>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {c.profiles?.display_name || c.profiles?.email || 'Unknown'}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(c.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {campaigns.length === 0 && (
            <p className="text-center text-gray-500 text-sm py-8">No campaigns found</p>
          )}
        </div>
      )}
    </div>
  );
}
