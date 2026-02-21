import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconUsers, IconBrain, IconMap, IconChartBar, IconChevronLeft } from '@tabler/icons-react';
import UsersView from './UsersView';
import AILogsView from './AILogsView';
import CampaignsView from './CampaignsView';
import StatsView from './StatsView';

const NAV_ITEMS = [
  { key: 'users', label: 'Users', icon: IconUsers },
  { key: 'ai-logs', label: 'AI Logs', icon: IconBrain },
  { key: 'campaigns', label: 'Campaigns', icon: IconMap },
  { key: 'stats', label: 'Stats', icon: IconChartBar },
];

export default function AdminPanel() {
  const [activeSection, setActiveSection] = useState('users');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const navigate = useNavigate();

  const renderContent = () => {
    switch (activeSection) {
      case 'users':
        return <UsersView onSelectUser={(userId) => setSelectedUserId(userId)} selectedUserId={selectedUserId} onBack={() => setSelectedUserId(null)} />;
      case 'ai-logs':
        return <AILogsView userId={selectedUserId} />;
      case 'campaigns':
        return <CampaignsView />;
      case 'stats':
        return <StatsView />;
      default:
        return <UsersView />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900/50 border-r border-gray-800 flex flex-col">
        <div className="px-5 py-4 border-b border-gray-800">
          <button
            onClick={() => navigate('/app')}
            className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors mb-3"
          >
            <IconChevronLeft size={14} /> Back to App
          </button>
          <h1 className="text-lg font-bold text-white">DM HUD Admin</h1>
        </div>

        <nav className="flex-1 py-3">
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              onClick={() => {
                setActiveSection(item.key);
                if (item.key !== 'users') setSelectedUserId(null);
              }}
              className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                activeSection === item.key
                  ? 'bg-indigo-600/10 text-indigo-400 border-r-2 border-indigo-500'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
}
