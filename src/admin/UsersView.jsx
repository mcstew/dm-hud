import React, { useState, useEffect } from 'react';
import { IconSearch, IconChevronLeft, IconToggleRight, IconToggleLeft } from '@tabler/icons-react';
import * as dbOps from '../lib/db';
import AILogsView from './AILogsView';

export default function UsersView({ onSelectUser, selectedUserId, onBack }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [userDetail, setUserDetail] = useState(null);

  const loadUsers = async (term = '') => {
    setLoading(true);
    try {
      const data = await dbOps.adminFetchUsers(term);
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const handleSearch = () => loadUsers(search);

  const loadUserDetail = async (userId) => {
    try {
      const detail = await dbOps.adminFetchUserDetail(userId);
      setUserDetail(detail);
      onSelectUser?.(userId);
    } catch (err) {
      console.error('Failed to load user detail:', err);
    }
  };

  const toggleKeyMode = async (userId, currentMode) => {
    const newMode = currentMode === 'managed' ? 'byok' : 'managed';
    try {
      await dbOps.updateProfile(userId, { key_mode: newMode });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, key_mode: newMode } : u));
      if (userDetail?.profile?.id === userId) {
        setUserDetail(prev => ({ ...prev, profile: { ...prev.profile, key_mode: newMode } }));
      }
    } catch (err) {
      console.error('Failed to toggle key mode:', err);
    }
  };

  // User detail view
  if (selectedUserId && userDetail) {
    const { profile, campaigns } = userDetail;
    return (
      <div>
        <button onClick={() => { onBack?.(); setUserDetail(null); }} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-4 transition-colors">
          <IconChevronLeft size={14} /> Back to Users
        </button>

        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">{profile.display_name || profile.email}</h2>
              <p className="text-sm text-gray-400 mt-1">{profile.email}</p>
              <p className="text-xs text-gray-500 mt-2 font-mono">{profile.id}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-400">Key Mode:</span>
                <button
                  onClick={() => toggleKeyMode(profile.id, profile.key_mode)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    profile.key_mode === 'managed'
                      ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-900/40 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {profile.key_mode === 'managed' ? <IconToggleLeft size={14} /> : <IconToggleRight size={14} />}
                  {profile.key_mode === 'managed' ? 'Managed' : 'BYOK'}
                </button>
              </div>
              <p className="text-xs text-gray-500">Joined {new Date(profile.created_at).toLocaleDateString()}</p>
              <p className="text-xs text-gray-500">Active {new Date(profile.last_active_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* User's campaigns */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Campaigns ({campaigns.length})</h3>
          {campaigns.length === 0 ? (
            <p className="text-xs text-gray-500 italic">No campaigns</p>
          ) : (
            <div className="space-y-2">
              {campaigns.map(c => (
                <div key={c.id} className="bg-gray-900/30 border border-gray-800 rounded-lg px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white">{c.name}</p>
                    <p className="text-xs text-gray-500">Updated {new Date(c.updated_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User's AI logs */}
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-3">AI Logs</h3>
          <AILogsView userId={profile.id} compact />
        </div>
      </div>
    );
  }

  // Users list view
  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Users</h2>

      {/* Search */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by email, display name, or user ID..."
            className="w-full pl-9 pr-3 py-2.5 bg-gray-900/50 border border-gray-800 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <button onClick={handleSearch} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors">
          Search
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : (
        <div className="bg-gray-900/30 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="text-left px-4 py-3 font-medium">User</th>
                <th className="text-left px-4 py-3 font-medium">Key Mode</th>
                <th className="text-left px-4 py-3 font-medium">Last Active</th>
                <th className="text-left px-4 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr
                  key={user.id}
                  onClick={() => loadUserDetail(user.id)}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="text-white">{user.display_name || user.email}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      user.key_mode === 'managed'
                        ? 'bg-emerald-900/40 text-emerald-300'
                        : 'bg-amber-900/40 text-amber-300'
                    }`}>
                      {user.key_mode === 'managed' ? 'Managed' : 'BYOK'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(user.last_active_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <p className="text-center text-gray-500 text-sm py-8">No users found</p>
          )}
        </div>
      )}
    </div>
  );
}
