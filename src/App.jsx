import React, { useState, useCallback, useEffect, useRef, Component } from 'react';
import {
  IconUsers,
  IconSwords,
  IconUser,
  IconMapPin,
  IconBackpack,
  IconBook,
  IconCompass,
  IconSword,
  IconSettings,
  IconMicrophone,
  IconMessageCircle,
  IconTrash,
  IconCheck,
  IconX,
  IconPlayerPlay,
  IconPlayerStop,
  IconCircleFilled,
  IconChevronLeft,
  IconPlus,
  IconKey,
  IconDice5,
  IconWorld,
  IconCalendar,
  IconChevronDown,
  IconHeart,
  IconShield,
  IconActivity,
  IconAlertTriangle,
  IconFileText,
  IconSend,
  IconUserPlus,
  IconGhost2,
  IconRefresh,
  IconDownload,
  IconLogout,
} from '@tabler/icons-react';
import { useAuth } from './lib/auth';
import * as dbOps from './lib/db';
import * as aiService from './lib/ai';
import { dbCardToFrontend, dbSessionToFrontend, dbTranscriptToFrontend, dbEventToFrontend, dbRosterToFrontend, dbCampaignToFrontend } from './lib/mappers';

// ============================================
// DM HUD v3.0 - Multi-User + Supabase
// ============================================

// Error Boundary to catch crashes and prevent white screen
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('💥 App crashed:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-red-500 rounded-xl p-6 max-w-lg">
            <h2 className="text-red-400 font-semibold text-lg mb-2 flex items-center gap-2">
              <IconAlertTriangle size={20} /> Something went wrong
            </h2>
            <p className="text-gray-300 text-sm mb-4">
              The app encountered an error. Your data is safe - try refreshing the page.
            </p>
            <div className="bg-gray-950 border border-gray-800 rounded p-3 mb-4">
              <p className="text-xs text-gray-400 font-mono">{this.state.error?.toString()}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium transition-colors"
              >
                Refresh App
              </button>
              <button
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded transition-colors"
              >
                Try to Continue
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Icon wrapper for consistent sizing
const Icons = {
  party: <IconUsers size={16} stroke={2} />,
  enemy: <IconSwords size={16} stroke={2} />,
  character: <IconUser size={16} stroke={2} />,
  location: <IconMapPin size={16} stroke={2} />,
  item: <IconBackpack size={16} stroke={2} />,
  plot: <IconBook size={16} stroke={2} />,
  exploration: <IconCompass size={16} stroke={2} />,
  combat: <IconSword size={16} stroke={2} />,
  settings: <IconSettings size={16} stroke={2} />,
  audio: <IconMicrophone size={16} stroke={2} />,
  transcript: <IconMessageCircle size={16} stroke={2} />,
  delete: <IconTrash size={14} stroke={2} />,
  check: <IconCheck size={12} stroke={2.5} />,
  close: <IconX size={16} stroke={2} />,
  play: <IconPlayerPlay size={12} stroke={2} />,
  stop: <IconPlayerStop size={16} stroke={2} />,
  record: <IconCircleFilled size={16} />,
  back: <IconChevronLeft size={16} stroke={2} />,
  plus: <IconPlus size={20} stroke={2} />,
  key: <IconKey size={16} stroke={2} />,
  book: <IconBook size={16} stroke={2} />,
  dice: <IconDice5 size={40} stroke={1.5} />,
  world: <IconWorld size={16} stroke={2} />,
  calendar: <IconCalendar size={16} stroke={2} />,
  chevronDown: <IconChevronDown size={16} stroke={2} />,
  heart: <IconHeart size={16} stroke={2} />,
  shield: <IconShield size={16} stroke={2} />,
  activity: <IconActivity size={16} stroke={2} />,
  fileText: <IconFileText size={16} stroke={2} />,
  send: <IconSend size={16} stroke={2} />,
  userPlus: <IconUserPlus size={16} stroke={2} />,
};

// D&D 5.5e Conditions
const DND_CONDITIONS = ['Blinded', 'Charmed', 'Deafened', 'Frightened', 'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious', 'Exhaustion'];

// Card types
const CARD_TYPES = {
  CHARACTER: { label: 'Character', icon: 'character', color: 'indigo' },
  LOCATION: { label: 'Location', icon: 'location', color: 'emerald' },
  ITEM: { label: 'Item', icon: 'item', color: 'amber' },
  PLOT: { label: 'Plot', icon: 'plot', color: 'pink' },
  ENEMY: { label: 'Enemy', icon: 'enemy', color: 'red' },
};

// Riff templates
const RIFF_TEMPLATES = {
  CHARACTER: [
    { key: 'fullName', label: 'Full Name', prompt: 'a fitting full name' },
    { key: 'appearance', label: 'Appearance', prompt: 'a brief physical description' },
    { key: 'voice', label: 'Voice', prompt: 'their voice quality or accent' },
    { key: 'secret', label: 'Secret', prompt: 'a hidden motivation' },
  ],
  LOCATION: [
    { key: 'atmosphere', label: 'Atmosphere', prompt: 'the mood of this place' },
    { key: 'sounds', label: 'Sounds', prompt: 'what sounds can be heard' },
    { key: 'notable', label: 'Notable Feature', prompt: 'a distinctive feature' },
  ],
  ITEM: [
    { key: 'origin', label: 'Origin', prompt: 'where this came from' },
    { key: 'property', label: 'Hidden Property', prompt: 'a secret property' },
  ],
  ENEMY: [
    { key: 'distinguishing', label: 'Distinguishing', prompt: 'what makes this one distinct' },
    { key: 'tactics', label: 'Tactics', prompt: 'how they fight' },
    { key: 'weakness', label: 'Weakness', prompt: 'a vulnerability' },
  ],
  PLOT: [
    { key: 'twist', label: 'Twist', prompt: 'an unexpected development' },
    { key: 'connection', label: 'Connection', prompt: 'how this connects elsewhere' },
  ],
};

// Storage hook removed — data now stored in Supabase
// See src/lib/db.js for data access and src/hooks/useCampaign.js for React hooks

// Utility components
const Badge = ({ children, variant = 'default', size = 'md' }) => {
  const variants = {
    default: 'bg-gray-800 text-gray-300',
    canon: 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/40',
    riff: 'bg-amber-900/40 text-amber-300 border border-dashed border-amber-500/50',
    status: 'bg-purple-900/50 text-purple-300 border border-purple-500/40',
    pc: 'bg-indigo-900/50 text-indigo-300 border border-indigo-500/40',
  };
  const sizes = { sm: 'px-1.5 py-0.5 text-[10px]', md: 'px-2 py-0.5 text-xs' };
  return <span className={`rounded font-medium ${variants[variant]} ${sizes[size]}`}>{children}</span>;
};

const Button = ({ children, onClick, variant = 'default', size = 'md', className = '', disabled = false }) => {
  const variants = {
    default: 'bg-gray-800 hover:bg-gray-700 text-gray-200',
    primary: 'bg-indigo-600 hover:bg-indigo-500 text-white',
    danger: 'bg-red-600/80 hover:bg-red-500 text-white',
    ghost: 'bg-transparent hover:bg-gray-800/50 text-gray-400 hover:text-gray-200',
    success: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    riff: 'bg-amber-600/80 hover:bg-amber-500 text-white',
  };
  const sizes = { xs: 'px-1.5 py-0.5 text-[10px]', sm: 'px-2 py-1 text-xs', md: 'px-3 py-1.5 text-sm', lg: 'px-4 py-2 text-base' };
  return (
    <button onClick={onClick} disabled={disabled}
      className={`rounded font-medium transition-all ${variants[variant]} ${sizes[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      {children}
    </button>
  );
};

const IconButton = ({ icon, onClick, variant = 'ghost', title = '' }) => {
  const variants = { ghost: 'hover:bg-gray-800/50 text-gray-400 hover:text-gray-200', danger: 'hover:bg-red-900/50 text-gray-400 hover:text-red-400' };
  return <button onClick={onClick} title={title} className={`p-1.5 rounded transition-all ${variants[variant]}`}>{Icons[icon]}</button>;
};

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100]">
      <div className="bg-gray-900 rounded-lg border border-gray-700 p-4 max-w-sm mx-4">
        <h3 className="font-semibold text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-300 mb-4">{message}</p>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" size="sm" onClick={onConfirm}>Delete</Button>
        </div>
      </div>
    </div>
  );
};

// Player Roster Modal
const PlayerRosterModal = ({ isOpen, onClose, playerRoster, onSave }) => {
  const [roster, setRoster] = useState(playerRoster || []);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    setRoster(playerRoster || []);
  }, [playerRoster, isOpen]);

  const addPlayer = () => {
    const newPlayer = {
      id: `player-${Date.now()}`,
      playerName: '',
      characterName: '',
      characterId: null, // Will link to character card
      aliases: []
    };
    setRoster([...roster, newPlayer]);
    setEditingId(newPlayer.id);
  };

  const updatePlayer = (id, updates) => {
    setRoster(roster.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const removePlayer = (id) => {
    setRoster(roster.filter(p => p.id !== id));
  };

  const addAlias = (id) => {
    const player = roster.find(p => p.id === id);
    if (player) {
      const alias = prompt('Add character alias/nickname:');
      if (alias && alias.trim()) {
        updatePlayer(id, { aliases: [...(player.aliases || []), alias.trim()] });
      }
    }
  };

  const removeAlias = (playerId, alias) => {
    const player = roster.find(p => p.id === playerId);
    if (player) {
      updatePlayer(playerId, { aliases: player.aliases.filter(a => a !== alias) });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-800 w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <IconUsers size={18} /> Player Roster
          </h2>
          <IconButton icon="close" onClick={onClose} />
        </div>

        <div className="flex-1 overflow-auto p-4">
          <p className="text-xs text-gray-500 mb-4">
            Define your players and their characters to prevent AI from creating duplicates. Include common aliases and mispronunciations.
          </p>

          <div className="space-y-3">
            {roster.map(player => (
              <div key={player.id} className="bg-gray-950 border border-gray-800 rounded-lg p-3">
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Player Name (Real)</label>
                    <input
                      type="text"
                      value={player.playerName}
                      onChange={(e) => updatePlayer(player.id, { playerName: e.target.value })}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:border-indigo-500 focus:outline-none transition-colors"
                      placeholder="Michael"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Character Name (In-Game)</label>
                    <input
                      type="text"
                      value={player.characterName}
                      onChange={(e) => updatePlayer(player.id, { characterName: e.target.value })}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:border-indigo-500 focus:outline-none transition-colors"
                      placeholder="Kermit the Barbarian"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Aliases / Common Mispronunciations</label>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {(player.aliases || []).map((alias, i) => (
                      <span key={i} className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 flex items-center gap-1">
                        {alias}
                        <button onClick={() => removeAlias(player.id, alias)} className="text-gray-500 hover:text-red-400">×</button>
                      </span>
                    ))}
                    <button
                      onClick={() => addAlias(player.id)}
                      className="bg-gray-900 border border-dashed border-gray-700 rounded px-2 py-1 text-xs text-gray-400 hover:text-indigo-400 hover:border-indigo-500 transition-colors"
                    >
                      + Add alias
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => removePlayer(player.id)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Remove Player
                </button>
              </div>
            ))}
          </div>

          <Button variant="ghost" onClick={addPlayer} className="w-full mt-3">+ Add Player</Button>
        </div>

        <div className="p-4 border-t border-gray-800 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => { onSave(roster); onClose(); }}>Save Roster</Button>
        </div>
      </div>
    </div>
  );
};

// Arc Modal (DM Context)
const ArcModal = ({ isOpen, onClose, arc, onSave }) => {
  const [localArc, setLocalArc] = useState(arc);

  useEffect(() => { setLocalArc(arc); }, [arc, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-800 w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">{Icons.book} Campaign Arc</h2>
          <IconButton icon="close" onClick={onClose} />
        </div>

        <div className="flex-1 overflow-auto p-4">
          <p className="text-xs text-gray-500 mb-3">Campaign secrets, plot threads, and DM-only context. Never revealed to players but used by AI for suggestions.</p>
          <textarea
            value={localArc}
            onChange={(e) => setLocalArc(e.target.value)}
            className="w-full h-64 bg-gray-950 border border-gray-700 rounded-lg p-3 text-sm text-white resize-none focus:border-indigo-500 focus:outline-none transition-colors"
            placeholder="The BBEG is actually the king's advisor. The ancient artifact they seek is cursed..."
          />
        </div>

        <div className="p-4 border-t border-gray-800 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => { onSave(localArc); onClose(); }}>Save Arc</Button>
        </div>
      </div>
    </div>
  );
};

// Unified Tools Panel - Account, Campaign, Session tabs
const ToolsPanel = ({ isOpen, onClose, campaign, sessions, currentSession, cards, settings, onSaveSettings, onGenerateReport }) => {
  const [activeTab, setActiveTab] = useState('account'); // 'account', 'campaign', 'session'
  const [activeSubTab, setActiveSubTab] = useState('artifacts'); // 'artifacts', 'settings'
  const [localSettings, setLocalSettings] = useState(settings);
  const [report, setReport] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [exportingTranscript, setExportingTranscript] = useState(false);

  useEffect(() => { setLocalSettings(settings); }, [settings, isOpen]);
  useEffect(() => { if (!isOpen) setReport(null); }, [isOpen]);

  if (!isOpen) return null;

  const campaignName = campaign?.name || 'Campaign';
  const sessionTranscript = currentSession?.transcript || [];

  // Get all transcripts across all sessions for campaign-level export
  const getAllTranscripts = () => {
    return (sessions || []).flatMap(s =>
      (s.transcript || []).map(t => ({ ...t, sessionName: s.name || 'Session' }))
    );
  };

  // Client-side merge: combine consecutive same-speaker entries within time threshold
  const mergeTranscript = (entries) => {
    if (!entries.length) return [];
    const merged = [];
    let current = { ...entries[0], text: entries[0].text };

    const parseTime = (timestamp) => {
      const match = timestamp.match(/(\d+):(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return 0;
      let [, hours, mins, secs, period] = match;
      hours = parseInt(hours);
      mins = parseInt(mins);
      secs = parseInt(secs);
      if (period.toUpperCase() === 'PM' && hours !== 12) hours += 12;
      if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;
      return hours * 3600 + mins * 60 + secs;
    };

    for (let i = 1; i < entries.length; i++) {
      const entry = entries[i];
      const lastTextTime = parseTime(entries[i - 1].timestamp);
      const gapFromLast = parseTime(entry.timestamp) - lastTextTime;
      if (entry.speaker === current.speaker && gapFromLast < 5 && gapFromLast >= 0) {
        current.text += ' ' + entry.text;
      } else {
        merged.push(current);
        current = { ...entry, text: entry.text };
      }
    }
    merged.push(current);
    return merged;
  };

  // AI polish pass for clean transcript — via Edge Function
  const polishTranscript = async (mergedEntries, isCampaign = false) => {
    const data = await aiService.polishTranscript({
      campaignId: campaign?.id,
      transcriptEntries: mergedEntries,
      isCampaign,
    });
    return data.polishedText;
  };

  const exportTranscript = async (scope = 'session') => {
    const transcriptData = scope === 'campaign' ? getAllTranscripts() : sessionTranscript;
    if (!transcriptData.length) return;

    setExportingTranscript(true);
    try {
      const merged = mergeTranscript(transcriptData);
      const polished = await polishTranscript(merged, scope === 'campaign');
      const date = new Date().toLocaleDateString();
      const sessionName = currentSession?.name || 'Session';

      let markdown = scope === 'campaign'
        ? `# ${campaignName} - Complete Campaign Transcript\n`
        : `# ${campaignName} - ${sessionName}\n`;
      markdown += `**Exported:** ${date}\n\n`;
      markdown += `---\n\n`;
      markdown += polished;

      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = scope === 'campaign'
        ? `${campaignName.replace(/\s+/g, '_')}_full_transcript.md`
        : `${campaignName.replace(/\s+/g, '_')}_${sessionName.replace(/\s+/g, '_')}_transcript.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export transcript:', error);
      alert('Failed to export transcript: ' + error.message);
    } finally {
      setExportingTranscript(false);
    }
  };

  const generateReportHandler = async (scope = 'session') => {
    setGenerating(true);
    try {
      // For now, session-level only; campaign report could aggregate all sessions
      const generatedReport = await onGenerateReport(currentSession, cards);
      setReport(generatedReport);
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setGenerating(false);
    }
  };

  const exportReport = () => {
    if (!report) return;
    const sessionName = currentSession?.name || 'Session';
    const markdown = `# ${sessionName} - Session Report\n\n${report.recap ? `## Recap\n${report.recap}\n\n` : ''}${report.mvp ? `## MVP\n**${report.mvp.character}** - ${report.mvp.reason}\n\n` : ''}${report.highlights?.length ? `## Highlights\n${report.highlights.map(h => `- ${h}`).join('\n')}\n\n` : ''}${report.quotes?.length ? `## Memorable Quotes\n${report.quotes.map(q => `> "${q.text}" - ${q.character}`).join('\n\n')}\n\n` : ''}${report.events?.length ? `## Key Events\n${report.events.map(e => `- **${e.character}**: ${e.detail}`).join('\n')}\n` : ''}`;

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(currentSession?.name || 'Session').replace(/\s+/g, '-')}-report.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalTranscriptEntries = getAllTranscripts().length;

  // Artifacts Section Component
  const ArtifactsSection = ({ scope }) => {
    const isSession = scope === 'session';
    const transcriptCount = isSession ? sessionTranscript.length : totalTranscriptEntries;

    return (
      <div className="space-y-6">
        {/* Transcript Export */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <IconMessageCircle size={20} className="text-indigo-400" />
            <div>
              <h4 className="font-medium text-white">{isSession ? 'Session' : 'Campaign'} Transcript</h4>
              <p className="text-xs text-gray-500">{transcriptCount} entries</p>
            </div>
          </div>
          <p className="text-sm text-gray-400 mb-3">
            Export a polished {isSession ? 'session' : 'full campaign'} transcript. AI merges fragments and fixes formatting while preserving everything spoken.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => exportTranscript(scope)}
            disabled={exportingTranscript || !settings.anthropicKey || transcriptCount === 0}
          >
            {exportingTranscript ? 'Processing...' : 'Export Transcript'}
          </Button>
          {!settings.anthropicKey && <p className="text-xs text-amber-400 mt-2">API key required</p>}
        </div>

        {/* Report Generation */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <IconFileText size={20} className="text-emerald-400" />
            <div>
              <h4 className="font-medium text-white">{isSession ? 'Session' : 'Campaign'} Report</h4>
              <p className="text-xs text-gray-500">AI-generated summary</p>
            </div>
          </div>
          <p className="text-sm text-gray-400 mb-3">
            Generate a report with highlights, MVP, memorable quotes, and key events.
          </p>
          {!report ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => generateReportHandler(scope)}
              disabled={generating || !settings.anthropicKey}
            >
              {generating ? 'Generating...' : 'Generate Report'}
            </Button>
          ) : (
            <div className="space-y-3">
              {report.recap && (
                <div className="text-sm text-gray-300 bg-gray-900 rounded p-3">
                  <span className="text-indigo-400 font-medium">Recap:</span> {report.recap}
                </div>
              )}
              {report.mvp && (
                <div className="text-sm bg-amber-900/20 border border-amber-500/30 rounded p-3">
                  <span className="text-amber-400 font-medium">MVP:</span> {report.mvp.character} — {report.mvp.reason}
                </div>
              )}
              <Button variant="ghost" size="sm" onClick={exportReport}>Export Report</Button>
              <Button variant="ghost" size="sm" onClick={() => setReport(null)}>Generate New</Button>
            </div>
          )}
          {!settings.anthropicKey && <p className="text-xs text-amber-400 mt-2">API key required</p>}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-800 w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="font-semibold text-white flex items-center gap-2">{Icons.settings} {campaign ? 'Tools' : 'Settings'}</h2>
          <IconButton icon="close" onClick={onClose} />
        </div>

        {/* Main Tab Navigation: Account | Campaign | Session (Campaign/Session hidden when no campaign) */}
        <div className="flex border-b border-gray-800">
          <button
            onClick={() => setActiveTab('account')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === 'account' ? 'text-indigo-400 border-b-2 border-indigo-400 bg-gray-800/30' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Account
          </button>
          {campaign && (
            <>
              <button
                onClick={() => setActiveTab('campaign')}
                className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === 'campaign' ? 'text-indigo-400 border-b-2 border-indigo-400 bg-gray-800/30' : 'text-gray-400 hover:text-gray-200'}`}
              >
                Campaign
              </button>
              <button
                onClick={() => setActiveTab('session')}
                className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === 'session' ? 'text-indigo-400 border-b-2 border-indigo-400 bg-gray-800/30' : 'text-gray-400 hover:text-gray-200'}`}
              >
                Session
              </button>
            </>
          )}
        </div>

        <div className="flex-1 overflow-auto p-4">
          {/* Account Tab */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                  <IconKey size={16} /> API Keys
                </h3>
                <p className="text-xs text-gray-500 mb-4">Stored locally in your browser only. Never sent to our servers.</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Anthropic API Key</label>
                    <input
                      type="password"
                      value={localSettings.anthropicKey || ''}
                      onChange={(e) => setLocalSettings({ ...localSettings, anthropicKey: e.target.value })}
                      className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none transition-colors"
                      placeholder="sk-ant-..."
                    />
                    <p className="text-xs text-gray-500 mt-1">For AI suggestions, reports, and transcript processing</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Deepgram API Key</label>
                    <input
                      type="password"
                      value={localSettings.deepgramKey || ''}
                      onChange={(e) => setLocalSettings({ ...localSettings, deepgramKey: e.target.value })}
                      className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none transition-colors"
                      placeholder="Your Deepgram key"
                    />
                    <p className="text-xs text-gray-500 mt-1">For real-time voice transcription</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-800">
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`w-2 h-2 rounded-full ${localSettings.anthropicKey ? 'bg-emerald-500' : 'bg-gray-600'}`} />
                    <span className="text-gray-400">Anthropic: {localSettings.anthropicKey ? 'Configured' : 'Not set'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs mt-1">
                    <span className={`w-2 h-2 rounded-full ${localSettings.deepgramKey ? 'bg-emerald-500' : 'bg-gray-600'}`} />
                    <span className="text-gray-400">Deepgram: {localSettings.deepgramKey ? 'Configured' : 'Not set'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-800">
                <h3 className="text-sm font-medium text-gray-300 mb-3">Preferences</h3>
                <p className="text-xs text-gray-500 italic">Coming soon: theme, defaults, data management</p>
              </div>
            </div>
          )}

          {/* Campaign Tab */}
          {activeTab === 'campaign' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-800">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center text-white font-bold">
                  {campaignName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-medium text-white">{campaignName}</h3>
                  <p className="text-xs text-gray-500">{sessions?.length || 0} sessions • {cards?.length || 0} cards</p>
                </div>
              </div>

              <h4 className="text-xs text-gray-500 uppercase tracking-wide mb-3">Campaign Artifacts</h4>
              <ArtifactsSection scope="campaign" />
            </div>
          )}

          {/* Session Tab */}
          {activeTab === 'session' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-800">
                <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400">
                  <IconCalendar size={20} />
                </div>
                <div>
                  <h3 className="font-medium text-white">{currentSession?.name || 'Current Session'}</h3>
                  <p className="text-xs text-gray-500">{sessionTranscript.length} transcript entries</p>
                </div>
              </div>

              <h4 className="text-xs text-gray-500 uppercase tracking-wide mb-3">Session Artifacts</h4>
              <ArtifactsSection scope="session" />
            </div>
          )}
        </div>

        {/* Footer with Save (for Account tab) */}
        {activeTab === 'account' && (
          <div className="p-4 border-t border-gray-800 flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={() => { onSaveSettings(localSettings); onClose(); }}>Save Settings</Button>
          </div>
        )}
      </div>
    </div>
  );
};

// Campaign Card
const CampaignCard = ({ campaign, onClick, onDelete }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const chars = campaign.cards?.filter(c => c.type === 'CHARACTER').length || 0;
  const locs = campaign.cards?.filter(c => c.type === 'LOCATION').length || 0;
  const plots = campaign.cards?.filter(c => c.type === 'PLOT').length || 0;
  const initial = campaign.name?.charAt(0)?.toUpperCase() || '?';

  return (
    <>
      <div onClick={onClick} className="bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-xl p-5 cursor-pointer transition-all group relative">
        <button onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }}
          className="absolute top-3 right-3 p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-900/50 text-gray-500 hover:text-red-400 transition-all">
          {Icons.delete}
        </button>

        {/* Badge */}
        <div className="absolute top-4 right-12 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[10px] text-gray-500 font-mono bg-gray-800 px-2 py-0.5 rounded">D&D 5.5e</span>
        </div>

        {/* Initial Avatar */}
        <div className="flex items-start gap-4 mb-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            {initial}
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <h3 className="font-semibold text-white text-lg truncate">{campaign.name}</h3>
            <p className="text-xs text-gray-500">Last played: {new Date(campaign.updatedAt).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-4 pt-3 border-t border-gray-800">
          <div className="text-center">
            <div className="text-lg font-semibold text-white">{chars}</div>
            <div className="text-[10px] text-gray-500 uppercase">Chars</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-white">{locs}</div>
            <div className="text-[10px] text-gray-500 uppercase">Locs</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-white">{plots}</div>
            <div className="text-[10px] text-gray-500 uppercase">Threads</div>
          </div>
        </div>
      </div>
      <ConfirmModal isOpen={showConfirm} title="Delete Campaign?" message={`Delete "${campaign.name}"? This cannot be undone.`}
        onConfirm={() => { onDelete(campaign.id); setShowConfirm(false); }} onCancel={() => setShowConfirm(false)} />
    </>
  );
};

// Campaigns Home
const CampaignsHome = ({ campaigns, onSelect, onCreate, onDelete, settings, onOpenSettings, onSignOut, profile }) => {
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-950/80 backdrop-blur-md border-b border-gray-800 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">DM HUD</h1>
          <div className="flex items-center gap-4">
            {profile?.is_superuser && (
              <a href="/admin" className="text-xs text-purple-400 hover:text-purple-300 transition-colors">Admin</a>
            )}
            <button onClick={onOpenSettings} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">{Icons.settings} Settings</button>
            <button onClick={onSignOut} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"><IconLogout size={16} /> Sign Out</button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-200">Your Campaigns</h2>
          <Button variant="primary" onClick={() => setShowNew(true)} className="flex items-center gap-2">{Icons.plus} New Campaign</Button>
        </div>

        {campaigns.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-gray-900 flex items-center justify-center mx-auto mb-4 text-gray-600">{Icons.dice}</div>
            <h3 className="text-lg font-medium text-gray-300 mb-2">No campaigns yet</h3>
            <p className="text-sm text-gray-500 mb-4">Create your first campaign to get started</p>
            <Button variant="primary" onClick={() => setShowNew(true)}>Create Campaign</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map(c => <CampaignCard key={c.id} campaign={c} onClick={() => onSelect(c.id)} onDelete={onDelete} />)}
          </div>
        )}

        {settings.keyMode === 'byok' && (!settings.anthropicKey || settings.anthropicKey === '__managed__') && (
          <div className="mt-8 p-4 bg-amber-900/20 border border-amber-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-amber-400">{Icons.key}</span>
              <div>
                <h4 className="font-medium text-amber-200 text-sm">API Keys Required</h4>
                <p className="text-xs text-amber-300/70 mt-1">Your account is set to bring-your-own-key mode. Add your API keys in Settings to enable AI features.</p>
                <button onClick={onOpenSettings} className="text-xs text-amber-400 hover:text-amber-300 mt-2 underline">Configure →</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showNew && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 w-full max-w-md p-6">
            <h3 className="font-semibold text-lg mb-4">New Campaign</h3>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && newName.trim() && (onCreate(newName.trim()), setNewName(''), setShowNew(false))}
              className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white mb-4 focus:border-indigo-500 focus:outline-none transition-colors" placeholder="Campaign name..." autoFocus />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => { if (newName.trim()) { onCreate(newName.trim()); setNewName(''); setShowNew(false); } }} disabled={!newName.trim()}>Create</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Compact Card
const CompactCard = ({ card, onClick, onQuickHP, onDelete, isInCombat, onReorder }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const cardType = CARD_TYPES[card.type] || CARD_TYPES.CHARACTER;
  const hasRiffs = Object.keys(card.riffs || {}).length > 0;
  const colorClass = { indigo: 'text-indigo-400', emerald: 'text-emerald-400', amber: 'text-amber-400', pink: 'text-pink-400', red: 'text-red-400' }[cardType.color] || 'text-gray-400';

  const handleDragStart = (e) => {
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', card.id);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    if (draggedId !== card.id && onReorder) {
      onReorder(draggedId, card.id);
    }
  };

  return (
    <>
      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={onClick}
        className={`relative rounded-lg p-2.5 cursor-move transition-all group ${card.isCanon ? 'bg-gray-900/50 border border-transparent hover:bg-gray-800 hover:border-gray-700' : 'bg-gray-900/30 border-2 border-dashed border-amber-500/40 hover:border-amber-500/60'} ${card.hp?.current === 0 ? 'opacity-50' : ''} ${isDragging ? 'opacity-40' : ''}`}>
        {!card.isPC && (
          <button onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-800 border border-gray-700 text-gray-400 text-xs opacity-0 group-hover:opacity-100 hover:bg-red-600 hover:border-red-600 hover:text-white flex items-center justify-center z-10 transition-all">
            <IconX size={12} />
          </button>
        )}
        <div className="flex items-center gap-2">
          <span className={colorClass}>{Icons[cardType.icon]}</span>
          <span className="font-medium text-gray-200 text-sm truncate flex-1">{card.name}</span>
          {/* Inline HP/AC display for characters */}
          {(card.type === 'CHARACTER' || card.type === 'ENEMY') && (card.hp || card.ac) && (
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-mono">
              {card.hp && (
                <span className={card.hp.current / card.hp.max > 0.5 ? 'text-emerald-400' : card.hp.current / card.hp.max > 0.25 ? 'text-amber-400' : 'text-red-400'}>
                  HP {card.hp.current}/{card.hp.max}
                </span>
              )}
              {card.ac && <span>AC {card.ac}</span>}
            </div>
          )}
          <div className="flex items-center gap-1 flex-shrink-0">
            {card.isPC && <Badge variant="pc" size="sm">PC</Badge>}
            {card.type === 'CHARACTER' && card.inParty && <Badge variant="status" size="sm">Party</Badge>}
            {!card.isCanon && <Badge variant="riff" size="sm">Riff</Badge>}
            {hasRiffs && card.isCanon && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
          </div>
        </div>
        {card.status?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5 ml-5">
            {card.status.map((s, i) => <Badge key={i} variant="status" size="sm">{s}</Badge>)}
          </div>
        )}
        {card.hp && (
          <div className="mt-2 flex items-center gap-2 ml-5">
            <div className="flex-1 h-1.5 bg-gray-950 rounded-full overflow-hidden">
              <div className={`h-full transition-all ${card.hp.current / card.hp.max > 0.5 ? 'bg-emerald-500' : card.hp.current / card.hp.max > 0.25 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${(card.hp.current / card.hp.max) * 100}%` }} />
            </div>
            <span className="text-[10px] text-gray-500 font-mono w-12 text-right">{card.hp.current}/{card.hp.max}</span>
            {isInCombat && (
              <div className="flex gap-0.5" onClick={e => e.stopPropagation()}>
                <button onClick={() => onQuickHP(card.id, -1)} className="w-5 h-5 rounded bg-red-900/50 hover:bg-red-800 text-red-300 text-xs transition-colors">−</button>
                <button onClick={() => onQuickHP(card.id, 1)} className="w-5 h-5 rounded bg-emerald-900/50 hover:bg-emerald-800 text-emerald-300 text-xs transition-colors">+</button>
              </div>
            )}
          </div>
        )}
        {card.notes && !card.hp && <div className="mt-1 ml-5 text-[10px] text-gray-500 truncate">{card.notes}</div>}
      </div>
      <ConfirmModal isOpen={showConfirm} title="Delete?" message={`Delete "${card.name}"?`}
        onConfirm={() => { onDelete(card.id); setShowConfirm(false); }} onCancel={() => setShowConfirm(false)} />
    </>
  );
};

// Detail Drawer
const DetailDrawer = ({ card, isOpen, onClose, onUpdate, onDelete, onGenerateRiff, isGenerating, onGetCharacterEvents }) => {
  const [activeTab, setActiveTab] = useState('canon');
  const [editField, setEditField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showStats, setShowStats] = useState(false);

  // Check if card has any stats set
  const hasStats = card && (
    (card.stats && Object.values(card.stats).some(v => v !== 10 && v !== undefined)) ||
    card.ac || card.level || card.class
  );

  // Auto-expand stats if they exist or are added via AI
  useEffect(() => {
    if (hasStats) setShowStats(true);
  }, [hasStats]);

  // Reset showStats when switching cards
  useEffect(() => {
    if (card) {
      const cardHasStats = (card.stats && Object.values(card.stats).some(v => v !== 10 && v !== undefined)) ||
                          card.ac || card.level || card.class;
      setShowStats(cardHasStats);
    }
  }, [card?.id]);

  if (!isOpen || !card) return null;
  const cardType = CARD_TYPES[card.type] || CARD_TYPES.CHARACTER;
  const templates = RIFF_TEMPLATES[card.type] || [];
  const colorClass = { indigo: 'bg-indigo-900/50 text-indigo-400', emerald: 'bg-emerald-900/50 text-emerald-400', amber: 'bg-amber-900/50 text-amber-400', pink: 'bg-pink-900/50 text-pink-400', red: 'bg-red-900/50 text-red-400' }[cardType.color];

  const saveEdit = (field) => {
    if (field === 'name') onUpdate(card.id, { name: editValue });
    else if (field === 'notes') onUpdate(card.id, { notes: editValue });
    else if (field === 'newFact') onUpdate(card.id, { canonFacts: [...(card.canonFacts || []), editValue] });
    setEditField(null); setEditValue('');
  };

  // Get health status for characters/enemies
  const getHealthStatus = () => {
    if (!card.hp) return null;
    const ratio = card.hp.current / card.hp.max;
    if (ratio <= 0) return { label: 'Dead', color: 'bg-gray-600 text-gray-300' };
    if (ratio <= 0.25) return { label: 'Critical', color: 'bg-red-600 text-white' };
    if (ratio <= 0.5) return { label: 'Bloodied', color: 'bg-amber-600 text-white' };
    return { label: 'Healthy', color: 'bg-emerald-600 text-white' };
  };
  const healthStatus = getHealthStatus();

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-[420px] bg-gray-900 border-l border-gray-800 z-50 flex flex-col transform transition-transform duration-300">
        {/* Hero Header with Image Area */}
        <div className="relative">
          {/* Image/Gradient Background */}
          <div
            className="h-40 bg-gradient-to-br from-gray-800 via-gray-900 to-gray-950 relative overflow-hidden"
            style={card.image ? { backgroundImage: `url(${card.image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
          >
            {/* Gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent" />

            {/* Type icon badge - top left */}
            <div className={`absolute top-3 left-3 w-10 h-10 rounded-lg flex items-center justify-center ${colorClass} shadow-lg`}>
              <span className="scale-125">{Icons[cardType.icon]}</span>
            </div>

            {/* Close button - top right */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white/80 hover:text-white transition-colors"
            >
              <IconX size={18} />
            </button>

            {/* Status badges - positioned over image */}
            <div className="absolute bottom-12 left-4 flex flex-wrap gap-1.5">
              {healthStatus && (
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${healthStatus.color}`}>
                  {healthStatus.label}
                </span>
              )}
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${card.isCanon ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'}`}>
                {card.isCanon ? 'Canon' : 'Riff'}
              </span>
              {card.type === 'CHARACTER' && (
                <>
                  <button
                    onClick={() => onUpdate(card.id, { isPC: !card.isPC })}
                    className="transition-opacity hover:opacity-80"
                    title="Toggle PC/NPC"
                  >
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${card.isPC ? 'bg-indigo-600 text-white' : 'bg-gray-600 text-gray-200'}`}>
                      {card.isPC ? 'PC' : 'NPC'}
                    </span>
                  </button>
                  <button
                    onClick={() => onUpdate(card.id, { inParty: !card.inParty })}
                    className="transition-opacity hover:opacity-80"
                    title="Toggle Party Member"
                  >
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${card.inParty ? 'bg-indigo-600 text-white' : 'bg-gray-600 text-gray-200'}`}>
                      {card.inParty ? 'Party' : 'Solo'}
                    </span>
                  </button>
                </>
              )}
            </div>

            {/* Name - at bottom of hero */}
            <div className="absolute bottom-3 left-4 right-4">
              {editField === 'name' ? (
                <div className="flex gap-2">
                  <input value={editValue} onChange={e => setEditValue(e.target.value)}
                    className="bg-gray-950/80 backdrop-blur border border-gray-700 rounded px-2 py-1 text-white font-semibold text-lg flex-1 focus:border-indigo-500 focus:outline-none"
                    autoFocus onKeyDown={e => e.key === 'Enter' && saveEdit('name')} />
                  <Button size="sm" variant="primary" onClick={() => saveEdit('name')}>Save</Button>
                </div>
              ) : (
                <h2 className="text-xl font-bold text-white cursor-pointer hover:text-indigo-300 drop-shadow-lg"
                  onClick={() => { setEditField('name'); setEditValue(card.name); }}>{card.name}</h2>
              )}
            </div>
          </div>

          {/* Notes/Description - below hero */}
          {card.notes && (
            <div className="px-4 py-2 text-sm text-gray-400 border-b border-gray-800 bg-gray-900/50">
              {card.notes}
            </div>
          )}
        </div>

        {/* HP Section - Characters and Enemies */}
        {(card.hp || card.type === 'CHARACTER' || card.type === 'ENEMY') && (
          <div className="px-4 py-3 border-b border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Hit Points</span>
              {card.hp ? (
                <span className="text-sm text-gray-300 font-mono">{card.hp.current} / {card.hp.max}</span>
              ) : (
                <Button size="xs" variant="primary" onClick={() => {
                  onUpdate(card.id, { hp: { current: 10, max: 10 } });
                }}>
                  Add HP
                </Button>
              )}
            </div>
            {card.hp && (
              <>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-2">
                  <div className={`h-full transition-all ${card.hp.current / card.hp.max > 0.5 ? 'bg-emerald-500' : card.hp.current / card.hp.max > 0.25 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${(card.hp.current / card.hp.max) * 100}%` }} />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={card.hp.current}
                    onChange={(e) => {
                      const newCurrent = parseInt(e.target.value) || 0;
                      onUpdate(card.id, { hp: { ...card.hp, current: Math.max(0, Math.min(card.hp.max, newCurrent)) } });
                    }}
                    className="w-16 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-center text-sm font-mono focus:border-indigo-500 focus:outline-none"
                  />
                  <span className="text-gray-500">/</span>
                  <input
                    type="number"
                    value={card.hp.max}
                    onChange={(e) => {
                      const newMax = parseInt(e.target.value) || 1;
                      onUpdate(card.id, { hp: { current: Math.min(card.hp.current, newMax), max: newMax } });
                    }}
                    className="w-16 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-center text-sm font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* D&D 5.5e Stats Section - only for CHARACTERs and ENEMYs */}
        {(card.type === 'CHARACTER' || card.type === 'ENEMY') && (
          <div className="px-4 py-3 border-b border-gray-800">
            {!showStats && !hasStats ? (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 uppercase tracking-wide">Stats</span>
                <Button size="xs" variant="primary" onClick={() => setShowStats(true)}>
                  Add Stats
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Ability Scores</span>
                  <button
                    onClick={() => setShowStats(!showStats)}
                    className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {showStats ? 'Hide ▲' : 'Show ▼'}
                  </button>
                </div>
                {showStats && (
                  <>
                    {/* 6-column stat grid like the inspiration */}
                    <div className="grid grid-cols-6 gap-1.5 mb-3">
                      {['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].map(stat => {
                        const value = card.stats?.[stat] || 10;
                        const modifier = Math.floor((value - 10) / 2);
                        return (
                          <div key={stat} className="bg-gray-800 border border-gray-700 rounded-lg p-2 text-center">
                            <div className="text-[9px] text-gray-500 uppercase mb-1">{stat}</div>
                            <input
                              type="number"
                              value={value}
                              onChange={(e) => {
                                const newVal = parseInt(e.target.value) || 10;
                                onUpdate(card.id, { stats: { ...(card.stats || {}), [stat]: newVal } });
                              }}
                              className="w-full bg-transparent text-white text-center text-lg font-bold focus:outline-none"
                            />
                            <div className="text-[10px] text-gray-400">
                              {modifier >= 0 ? '+' : ''}{modifier}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* AC, Level, Class row */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-gray-800 border border-gray-700 rounded-lg p-2 text-center">
                        <div className="text-[9px] text-gray-500 uppercase mb-1">AC</div>
                        <div className="flex items-center justify-center gap-1">
                          <IconShield size={14} className="text-gray-500" />
                          <input
                            type="number"
                            value={card.ac || ''}
                            onChange={(e) => onUpdate(card.id, { ac: parseInt(e.target.value) || null })}
                            className="w-10 bg-transparent text-white text-center text-lg font-bold focus:outline-none"
                            placeholder="-"
                          />
                        </div>
                      </div>
                      <div className="bg-gray-800 border border-gray-700 rounded-lg p-2 text-center">
                        <div className="text-[9px] text-gray-500 uppercase mb-1">Level</div>
                        <input
                          type="number"
                          value={card.level || ''}
                          onChange={(e) => onUpdate(card.id, { level: parseInt(e.target.value) || null })}
                          className="w-full bg-transparent text-white text-center text-lg font-bold focus:outline-none"
                          placeholder="-"
                        />
                      </div>
                      <div className="bg-gray-800 border border-gray-700 rounded-lg p-2 text-center">
                        <div className="text-[9px] text-gray-500 uppercase mb-1">Class</div>
                        <input
                          type="text"
                          value={card.class || ''}
                          onChange={(e) => onUpdate(card.id, { class: e.target.value })}
                          className="w-full bg-transparent text-white text-center text-sm font-semibold focus:outline-none truncate"
                          placeholder="-"
                        />
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        <div className="flex border-b border-gray-800">
          <button onClick={() => setActiveTab('canon')} className={`flex-1 px-4 py-2 text-sm font-medium ${activeTab === 'canon' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-gray-400'}`}>Canon</button>
          <button onClick={() => setActiveTab('riffs')} className={`flex-1 px-4 py-2 text-sm font-medium ${activeTab === 'riffs' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-gray-400'}`}>
            Riffs {Object.keys(card.riffs || {}).length > 0 && <span className="ml-1 px-1.5 text-[10px] bg-amber-500 text-black rounded-full">{Object.keys(card.riffs || {}).length}</span>}
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {activeTab === 'canon' ? (
            <div className="space-y-3">
              {card.genesis && (
                <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-lg p-3">
                  <div className="text-xs text-indigo-400 uppercase mb-1 flex items-center gap-1">
                    {Icons.transcript} Genesis
                  </div>
                  <p className="text-xs text-indigo-200/80 italic leading-relaxed">"{card.genesis}"</p>
                  {card.createdAt && (
                    <p className="text-[10px] text-indigo-400/60 mt-1">
                      {new Date(card.createdAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-500 uppercase mb-1">Notes</div>
                {editField === 'notes' ? (
                  <div className="space-y-2">
                    <textarea value={editValue} onChange={e => setEditValue(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white text-sm h-20 resize-none" autoFocus />
                    <div className="flex gap-2">
                      <Button size="sm" variant="primary" onClick={() => saveEdit('notes')}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditField(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-300 cursor-pointer hover:text-white" onClick={() => { setEditField('notes'); setEditValue(card.notes || ''); }}>
                    {card.notes || <span className="italic text-gray-500">Click to add...</span>}
                  </p>
                )}
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase mb-2">Facts</div>
                <div className="space-y-2">
                  {(card.canonFacts || []).map((f, i) => (
                    <div key={i} className="flex items-start gap-2 bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-2">
                      <span className="text-emerald-400">{Icons.check}</span>
                      <span className="text-sm text-gray-200 flex-1">{f}</span>
                      <button onClick={() => onUpdate(card.id, { canonFacts: card.canonFacts.filter((_, j) => j !== i) })} className="text-gray-500 hover:text-red-400 text-xs">×</button>
                    </div>
                  ))}
                  {editField === 'newFact' ? (
                    <div className="space-y-2">
                      <input value={editValue} onChange={e => setEditValue(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white text-sm"
                        placeholder="New fact..." autoFocus onKeyDown={e => e.key === 'Enter' && saveEdit('newFact')} />
                      <div className="flex gap-2">
                        <Button size="sm" variant="success" onClick={() => saveEdit('newFact')}>Add</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditField(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setEditField('newFact'); setEditValue(''); }}
                      className="w-full py-2 border border-dashed border-gray-700 rounded-lg text-sm text-gray-500 hover:text-white hover:border-gray-600">
                      + Add Fact
                    </button>
                  )}
                </div>
              </div>

              {/* Character Events/Milestones */}
              {onGetCharacterEvents && (() => {
                const charEvents = onGetCharacterEvents(card.name);
                return charEvents.length > 0 ? (
                  <div>
                    <div className="text-xs text-gray-500 uppercase mb-2">Events & Milestones</div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {charEvents.map((evt) => {
                        const typeColors = {
                          check: 'text-blue-400 bg-blue-900/20 border-blue-500/30',
                          save: 'text-purple-400 bg-purple-900/20 border-purple-500/30',
                          attack: 'text-red-400 bg-red-900/20 border-red-500/30',
                          discovery: 'text-amber-400 bg-amber-900/20 border-amber-500/30',
                          levelup: 'text-emerald-400 bg-emerald-900/20 border-emerald-500/30',
                          story: 'text-indigo-400 bg-indigo-900/20 border-indigo-500/30'
                        };
                        const colorClass = typeColors[evt.type] || 'text-gray-400 bg-gray-800/50 border-gray-800';

                        return (
                          <div key={evt.id} className={`flex items-start gap-2 rounded-lg p-2 border ${colorClass}`}>
                            <div className="flex-1">
                              <div className="text-xs font-medium capitalize">{evt.type}</div>
                              <div className="text-xs opacity-90">{evt.detail}</div>
                              {evt.outcome && (
                                <div className="text-[10px] opacity-70 mt-0.5">
                                  {evt.outcome === 'success' && '✓ Success'}
                                  {evt.outcome === 'fail' && '✗ Fail'}
                                  {evt.outcome === 'critical' && '⚡ Critical'}
                                  {evt.outcome === 'fumble' && '💥 Fumble'}
                                </div>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-500">
                              {new Date(evt.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map(t => {
                const val = card.riffs?.[t.key];
                return (
                  <div key={t.key} className={`rounded-lg p-3 ${val ? 'bg-amber-900/20 border border-amber-500/30' : 'bg-gray-800/50 border border-gray-800'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400 uppercase">{t.label}</span>
                      <div className="flex gap-1">
                        {val && <Button size="xs" variant="success" onClick={() => {
                          const fact = `${t.label}: ${val}`;
                          const newRiffs = { ...card.riffs }; delete newRiffs[t.key];
                          onUpdate(card.id, { canonFacts: [...(card.canonFacts || []), fact], riffs: newRiffs });
                        }}>Canonize</Button>}
                        <Button size="xs" variant={val ? 'ghost' : 'riff'} onClick={() => onGenerateRiff(card, t)} disabled={isGenerating}>
                          {isGenerating ? '...' : val ? '↻' : 'Generate'}
                        </Button>
                      </div>
                    </div>
                    {val ? <p className="text-sm text-amber-200">{val}</p> : <p className="text-sm text-gray-600 italic">Not generated</p>}
                  </div>
                );
              })}
              <Button variant="riff" className="w-full mt-4" onClick={() => templates.forEach(t => !card.riffs?.[t.key] && onGenerateRiff(card, t))} disabled={isGenerating}>
                {isGenerating ? 'Generating...' : 'Generate All'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// Audio Panel with Live Session
const AudioPanel = ({ settings, onProcess, isProcessing }) => {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [liveStatus, setLiveStatus] = useState('idle');

  const mediaRecorderRef = useRef(null);
  const socketRef = useRef(null);
  const streamRef = useRef(null);
  const transcriptBufferRef = useRef('');
  const bufferTimerRef = useRef(null);

  const startLiveSession = async () => {
    if (!settings.deepgramKey) {
      setError('Deepgram API key required');
      return;
    }

    try {
      setError(null);
      setLiveStatus('requesting');

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      setLiveStatus('connecting');

      // Connect to Deepgram WebSocket
      const ws = new WebSocket(
        `wss://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&diarize=true&punctuate=true&interim_results=false`,
        ['token', settings.deepgramKey]
      );

      socketRef.current = ws;

      ws.onopen = () => {
        setLiveStatus('recording');
        setIsLive(true);

        // Start recording
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus'
        });

        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            ws.send(event.data);
          }
        };

        mediaRecorder.start(250); // Send audio chunks every 250ms
      };

      ws.onmessage = (message) => {
        const data = JSON.parse(message.data);

        if (data.type === 'Results' && data.channel?.alternatives?.[0]?.transcript) {
          const transcript = data.channel.alternatives[0].transcript;

          if (transcript.trim()) {
            // Buffer transcript chunks to prevent incomplete sentence processing
            transcriptBufferRef.current += ' ' + transcript;

            // Clear existing timer
            if (bufferTimerRef.current) {
              clearTimeout(bufferTimerRef.current);
            }

            // Flush buffer after 2 seconds of silence (complete thought)
            // OR if buffer ends with sentence-ending punctuation
            const endsWithPunctuation = /[.!?;]\s*$/.test(transcriptBufferRef.current.trim());
            const delay = endsWithPunctuation ? 500 : 2000;

            bufferTimerRef.current = setTimeout(() => {
              const bufferedText = transcriptBufferRef.current.trim();
              if (bufferedText) {
                // Determine speaker (you could enhance this with voice recognition)
                const speaker = data.channel_index?.[0] === 0 ? 'DM' : 'Player';
                console.log(`🎤 Flushing buffered transcript (${bufferedText.length} chars)`);
                onProcess(`${speaker}: ${bufferedText}`);
                transcriptBufferRef.current = '';
              }
            }, delay);
          }
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setError('Connection error');
        stopLiveSession();
      };

      ws.onclose = () => {
        if (liveStatus === 'recording') {
          stopLiveSession();
        }
      };

    } catch (e) {
      console.error('Live session error:', e);
      setError(e.message || 'Microphone access denied');
      setLiveStatus('idle');
    }
  };

  const stopLiveSession = () => {
    // Flush any remaining buffered transcript
    if (bufferTimerRef.current) {
      clearTimeout(bufferTimerRef.current);
      bufferTimerRef.current = null;
    }
    if (transcriptBufferRef.current.trim()) {
      console.log('🎤 Flushing final buffered transcript on stop');
      onProcess(`DM: ${transcriptBufferRef.current.trim()}`);
      transcriptBufferRef.current = '';
    }

    // Stop media recorder
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    // Close WebSocket
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsLive(false);
    setLiveStatus('idle');
  };

  const transcribe = async () => {
    if (!settings.deepgramKey || !file) return;
    setStatus('transcribing'); setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const res = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&diarize=true&punctuate=true', {
        method: 'POST',
        headers: { 'Authorization': `Token ${settings.deepgramKey}`, 'Content-Type': file.type || 'audio/wav' },
        body: buffer,
      });
      if (!res.ok) throw new Error(`Deepgram: ${res.status}`);
      const data = await res.json();
      const paras = data.results?.channels?.[0]?.alternatives?.[0]?.paragraphs?.paragraphs;
      if (paras) {
        console.log(`📄 Processing ${paras.length} transcript paragraphs...`);
        for (let i = 0; i < paras.length; i++) {
          const p = paras[i];
          const speaker = p.speaker === 0 ? 'DM' : `Player ${p.speaker}`;
          const text = p.sentences.map(s => s.text).join(' ');
          setProgress(((i + 1) / paras.length) * 100);
          console.log(`  [${i+1}/${paras.length}] ${speaker}: ${text.substring(0, 50)}...`);
          await onProcess(`${speaker}: ${text}`);
          // Wait for AI processing to complete before next chunk
          await new Promise(r => setTimeout(r, 500));
        }
      } else {
        const text = data.results?.channels?.[0]?.alternatives?.[0]?.transcript;
        if (text) {
          console.log('📄 Processing single transcript chunk');
          await onProcess(`DM: ${text}`);
        }
      }
      setStatus('complete');
      console.log('✅ File transcription complete');
    } catch (e) { setError(e.message); setStatus('error'); }
  };

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-800 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-gray-500">{Icons.audio}</span>
          <span className="text-sm font-medium text-gray-300">Audio Session</span>
        </div>

        {/* Live Session Button */}
        <div className="flex items-center gap-2">
          {!isLive ? (
            <Button
              size="sm"
              variant="primary"
              onClick={startLiveSession}
              disabled={!settings.deepgramKey || liveStatus === 'connecting'}
              className="flex items-center gap-1.5"
            >
              {Icons.record}
              {liveStatus === 'connecting' ? 'Connecting...' : 'Start Live Session'}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="danger"
              onClick={stopLiveSession}
              className="flex items-center gap-1.5 animate-pulse"
            >
              {Icons.stop}
              Stop Session
            </Button>
          )}

          {!isLive && status === 'idle' && (
            <label className="cursor-pointer">
              <input type="file" accept="audio/*" onChange={e => { if (e.target.files?.[0]) { setFile(e.target.files[0]); setStatus('ready'); setProgress(0); setError(null); } }} className="hidden" />
              <span className="text-xs bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded text-gray-300">Upload File</span>
            </label>
          )}
        </div>
      </div>

      {error && <div className="text-xs text-red-400 mb-2 p-2 bg-red-900/20 rounded">{error}</div>}

      {isLive && (
        <div className="flex items-center gap-2 text-xs text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          <span>LIVE - Listening...</span>
        </div>
      )}

      {file && !isLive && (
        <div className="space-y-2">
          <div className="text-xs text-gray-400">{file.name}</div>
          <div className="h-1.5 bg-gray-900 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center gap-2">
            {status === 'ready' && <Button size="sm" variant="primary" onClick={transcribe} disabled={!settings.deepgramKey} className="flex items-center gap-1">{Icons.play} Transcribe</Button>}
            {status === 'transcribing' && <span className="text-xs text-indigo-400 animate-pulse">Processing... {progress.toFixed(0)}%</span>}
            {status === 'complete' && <span className="text-xs text-emerald-400 flex items-center gap-1">{Icons.check} Done</span>}
            <Button size="sm" variant="ghost" onClick={() => { setFile(null); setStatus('idle'); setProgress(0); setError(null); }}>Clear</Button>
          </div>
          {!settings.deepgramKey && <p className="text-xs text-amber-400">Add Deepgram key in Settings</p>}
        </div>
      )}

      {!file && !isLive && (
        <p className="text-xs text-gray-500">
          {settings.deepgramKey ? 'Start a live session or upload an audio file' : 'Add Deepgram key in Settings to enable'}
        </p>
      )}
    </div>
  );
};

// Create Card Modal
const CreateCardModal = ({ isOpen, onClose, onCreate, cardType }) => {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [hp, setHp] = useState('');
  const [isPC, setIsPC] = useState(false);

  if (!isOpen) return null;

  const handleCreate = () => {
    if (!name.trim()) return;
    const card = {
      type: cardType,
      name: name.trim(),
      notes: notes.trim(),
      isCanon: true,
    };
    if (cardType === 'CHARACTER') {
      card.isPC = isPC;
      card.inParty = isPC; // Default: PCs start in party, NPCs don't
    }
    if ((cardType === 'CHARACTER' || cardType === 'ENEMY') && hp.trim()) {
      const hpNum = parseInt(hp);
      if (!isNaN(hpNum) && hpNum > 0) {
        card.hp = { current: hpNum, max: hpNum };
      }
    }
    onCreate(card);
    setName('');
    setNotes('');
    setHp('');
    setIsPC(false);
    onClose();
  };

  const typeLabels = {
    CHARACTER: 'Character',
    LOCATION: 'Location',
    ITEM: 'Item',
    ENEMY: 'Enemy',
    PLOT: 'Plot Thread'
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-800 w-full max-w-md p-6">
        <h3 className="font-semibold text-lg mb-4">New {typeLabels[cardType]}</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-indigo-500 focus:outline-none transition-colors"
              placeholder={`${typeLabels[cardType]} name...`}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white h-20 resize-none focus:border-indigo-500 focus:outline-none transition-colors"
              placeholder="Description, details..."
            />
          </div>
          {(cardType === 'CHARACTER' || cardType === 'ENEMY') && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">HP (optional)</label>
              <input
                type="number"
                value={hp}
                onChange={(e) => setHp(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-indigo-500 focus:outline-none transition-colors"
                placeholder="Hit points..."
              />
            </div>
          )}
          {cardType === 'CHARACTER' && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPC"
                checked={isPC}
                onChange={(e) => setIsPC(e.target.checked)}
                className="w-4 h-4 rounded border-gray-700 bg-gray-950 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-gray-900"
              />
              <label htmlFor="isPC" className="text-sm text-gray-300">Player Character</label>
            </div>
          )}
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleCreate} disabled={!name.trim()}>Create</Button>
        </div>
      </div>
    </div>
  );
};

// Campaign View
const CampaignView = ({ campaign, onUpdateLocal, onBack, settings, onSaveSettings, userId }) => {
  // ── State: loaded from Supabase ──
  const [sessions, setSessions] = useState([]);
  const [allCards, setAllCards] = useState([]);
  const [transcript, setTranscript] = useState([]);
  const [events, setEvents] = useState([]);
  const [playerRoster, setPlayerRoster] = useState([]);
  const [dmContext, setDmContext] = useState(campaign.dmContext || '');
  const [dataLoaded, setDataLoaded] = useState(false);

  // ── UI State ──
  const [mode, setMode] = useState('exploration');
  const [selected, setSelected] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [genRiff, setGenRiff] = useState(false);
  const [input, setInput] = useState('');
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [createModalType, setCreateModalType] = useState(null);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [showRoster, setShowRoster] = useState(false);
  const [showArc, setShowArc] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const transcriptRef = useRef(null);
  const [showVoid, setShowVoid] = useState(false);

  // ── Load campaign data from Supabase ──
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [sessionsData, cardsData, rosterData] = await Promise.all([
          dbOps.fetchSessions(campaign.id),
          dbOps.fetchCards(campaign.id),
          dbOps.fetchRoster(campaign.id),
        ]);

        if (cancelled) return;

        const frontendSessions = sessionsData.map(dbSessionToFrontend);
        const frontendCards = cardsData.map(dbCardToFrontend);
        const frontendRoster = rosterData.map(dbRosterToFrontend);

        setSessions(frontendSessions);
        setAllCards(frontendCards);
        setPlayerRoster(frontendRoster);

        // Set active session
        const active = frontendSessions.find(s => s.isActive) || frontendSessions[frontendSessions.length - 1];
        if (active) {
          setCurrentSessionId(active.id);

          // Load transcript and events for active session
          const [transcriptData, eventsData] = await Promise.all([
            dbOps.fetchTranscript(active.id),
            dbOps.fetchEvents(active.id),
          ]);

          if (!cancelled) {
            setTranscript(transcriptData.map(dbTranscriptToFrontend));
            setEvents(eventsData.map(dbEventToFrontend));
          }
        }

        setDataLoaded(true);
      } catch (err) {
        console.error('Failed to load campaign data:', err);
        if (!cancelled) setDataLoaded(true);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [campaign.id]);

  // Keep a ref to always get the latest state for AI processing
  const stateRef = useRef({ allCards, sessions, transcript, events, playerRoster, dmContext, currentSessionId });
  useEffect(() => {
    stateRef.current = { allCards, sessions, transcript, events, playerRoster, dmContext, currentSessionId };
  });

  // Throttling for AI requests - minimum 2 seconds between calls
  const lastAICallRef = useRef(0);
  const pendingTextRef = useRef([]);
  const throttleTimerRef = useRef(null);

  const currentSession = sessions.find(s => s.id === currentSessionId) || sessions[sessions.length - 1];
  const activeCards = allCards.filter(c => !c.voidedAt);
  const voidCards = allCards.filter(c => c.voidedAt);

  // Session-based card filtering: show cards that existed at the time of the selected session
  const getSessionIndex = (sessionId) => sessions.findIndex(s => s.id === sessionId);
  const currentSessionIndex = getSessionIndex(currentSessionId);

  const cards = activeCards.filter(card => {
    if (!card.sessionId) return true;
    const cardSessionIndex = getSessionIndex(card.sessionId);
    return cardSessionIndex <= currentSessionIndex;
  });

  if (!dataLoaded) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><div className="text-gray-400">Loading campaign...</div></div>;
  }

  // ── Card CRUD operations (write to Supabase) ──

  const updateCard = (id, updates) => {
    // Optimistic local update
    setAllCards(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    // Async write to Supabase
    dbOps.updateCard(id, updates).catch(err => console.error('Failed to update card:', err));
  };

  const deleteCard = async (id) => {
    // Optimistic: mark as voided locally
    setAllCards(prev => prev.map(c =>
      c.id === id ? { ...c, voidedAt: new Date().toISOString(), voidedInSession: currentSessionId } : c
    ));
    if (selected?.id === id) setSelected(null);
    try {
      await dbOps.voidCard(id, currentSessionId);
    } catch (err) {
      console.error('Failed to void card:', err);
    }
  };

  const restoreFromVoid = async (id) => {
    setAllCards(prev => prev.map(c =>
      c.id === id ? { ...c, voidedAt: null, voidedInSession: null } : c
    ));
    try {
      await dbOps.restoreCard(id);
    } catch (err) {
      console.error('Failed to restore card:', err);
    }
  };

  const permanentlyDelete = async (id) => {
    setAllCards(prev => prev.filter(c => c.id !== id));
    try {
      await dbOps.permanentlyDeleteCard(id);
    } catch (err) {
      console.error('Failed to permanently delete card:', err);
    }
  };

  const addCard = async (card, genesisText = null) => {
    try {
      const dbCard = await dbOps.createCard(campaign.id, currentSessionId, {
        ...card,
        genesis: genesisText,
      });
      const frontendCard = dbCardToFrontend(dbCard);
      setAllCards(prev => [...prev, frontendCard]);
      return frontendCard;
    } catch (err) {
      console.error('Failed to create card:', err);
      // Fallback: add optimistically with temp ID
      const nc = {
        ...card,
        id: `temp-${Date.now()}`,
        riffs: {},
        canonFacts: card.canonFacts || [],
        status: card.status || [],
        genesis: genesisText,
        sessionId: currentSessionId,
        createdAt: new Date().toISOString()
      };
      setAllCards(prev => [...prev, nc]);
      return nc;
    }
  };

  const quickHP = (id, d) => {
    setAllCards(prev => prev.map(c =>
      c.id === id && c.hp
        ? { ...c, hp: { ...c.hp, current: Math.max(0, Math.min(c.hp.max, c.hp.current + d)) } }
        : c
    ));
    // Find the card to get current HP for correct update
    const card = allCards.find(c => c.id === id);
    if (card?.hp) {
      const newCurrent = Math.max(0, Math.min(card.hp.max, card.hp.current + d));
      dbOps.updateCard(id, { hp: { current: newCurrent, max: card.hp.max } }).catch(err => console.error('Failed to update HP:', err));
    }
  };

  const reorderCards = (draggedId, targetId) => {
    // Reorder is local-only for now (card order not stored in DB as a separate field)
    setAllCards(prev => {
      const cards = [...prev];
      const draggedIdx = cards.findIndex(c => c.id === draggedId);
      const targetIdx = cards.findIndex(c => c.id === targetId);
      if (draggedIdx === -1 || targetIdx === -1) return prev;
      const [draggedCard] = cards.splice(draggedIdx, 1);
      cards.splice(targetIdx, 0, draggedCard);
      return cards;
    });
  };

  const getCharacterEvents = (characterName) => {
    // For now, return events from the current session
    // TODO: load events from all sessions for cross-session view
    return events
      .filter(e => e.character?.toLowerCase() === characterName?.toLowerCase())
      .map(e => ({ ...e, sessionId: currentSessionId, sessionName: currentSession?.name }))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  };

  const genRiffFn = async (card, template) => {
    setGenRiff(true);
    try {
      const data = await aiService.generateRiff({
        campaignId: campaign.id,
        cardName: card.name,
        cardType: card.type,
        cardNotes: card.notes || '',
        dmContext: stateRef.current.dmContext || '',
        templatePrompt: template.prompt,
        templateLabel: template.label,
        templateKey: template.key,
      });
      const val = data?.riffText?.trim();
      if (val) {
        const updatedRiffs = { ...(card.riffs || {}), [template.key]: val };
        updateCard(card.id, { riffs: updatedRiffs });
      }
    } catch (e) { console.error('Riff generation error:', e); }
    setGenRiff(false);
  };

  const generateReport = async (session, reportCards) => {
    const sessionTranscript = transcript; // current transcript
    const sessionEvents = events;
    const pcCards = reportCards.filter(c => c.isPC);

    const data = await aiService.generateReport({
      campaignId: campaign.id,
      sessionId: session.id,
      transcript: sessionTranscript.map(t => `${t.speaker}: ${t.text}`).join('\n'),
      events: sessionEvents.map(e => `${e.character} - ${e.type}: ${e.detail}${e.outcome ? ` (${e.outcome})` : ''}`).join('\n'),
      pcNames: pcCards.map(c => c.name),
    });

    return data.report;
  };

  // Helper to update current session
  const updateSession = (sessionUpdates) => {
    setSessions(prev => prev.map(s =>
      s.id === currentSessionId ? { ...s, ...sessionUpdates } : s
    ));
    dbOps.updateSession(currentSessionId, sessionUpdates).catch(err => console.error('Failed to update session:', err));
  };

  // SYSTEM_PROMPT is now server-side in the ai-process Edge Function

  // Core AI processing function — calls Edge Function instead of direct Anthropic API
  const executeAIProcessing = async (textsToProcess) => {
    const combinedText = textsToProcess.join(' | ');
    setProcessing(true);

    try {
      console.log(`🤖 Processing ${textsToProcess.length} transcript(s) via Edge Function`);

      const state = stateRef.current;
      const currentCards = state.allCards.filter(c => !c.voidedAt);

      // Build context for the Edge Function
      const existingCards = currentCards.map(c => {
        const facts = (c.canonFacts || []).join('; ');
        return `${c.name} (${c.type}): ${c.notes || ''}${facts ? ' | ' + facts : ''}`;
      }).join('\n') || 'None';

      const roster = (state.playerRoster || []).map(p => {
        const aliases = p.aliases?.length ? ` (aliases: ${p.aliases.join(', ')})` : '';
        return `- Player: ${p.playerName} → Character: ${p.characterName}${aliases}`;
      }).join('\n') || 'None defined';

      const recentTranscript = (state.transcript || []).slice(-5).map(t => `${t.speaker}: ${t.text}`).join('\n');

      // Call Edge Function
      const aiResult = await aiService.processTranscript({
        campaignId: campaign.id,
        sessionId: state.currentSessionId,
        texts: textsToProcess,
        existingCards,
        roster,
        recentTranscript,
        dmContext: state.dmContext || '',
      });

      const ai = aiResult.result;
      console.log('✅ AI result from Edge Function:', ai);

      // Apply HP changes
      if (ai.hpChanges?.length) {
        const latestCards = stateRef.current.allCards;
        ai.hpChanges.forEach(change => {
          const card = latestCards.find(c => c.name.toLowerCase() === change.name.toLowerCase());
          if (card?.hp) {
            const delta = change.damage ? -change.damage : (change.healing || 0);
            const newCurrent = Math.max(0, Math.min(card.hp.max, card.hp.current + delta));
            updateCard(card.id, { hp: { ...card.hp, current: newCurrent } });
          }
        });
      }

      // Apply status changes
      if (ai.statusChanges?.length) {
        const latestCards = stateRef.current.allCards;
        ai.statusChanges.forEach(change => {
          const card = latestCards.find(c => c.name.toLowerCase() === change.name.toLowerCase());
          if (card) {
            let newStatus = [...(card.status || [])];
            if (change.addStatus) change.addStatus.forEach(s => { if (!newStatus.includes(s)) newStatus.push(s); });
            if (change.removeStatus) change.removeStatus.forEach(s => { newStatus = newStatus.filter(x => x !== s); });
            updateCard(card.id, { status: newStatus });
          }
        });
      }

      // Record events to Supabase
      if (ai.events?.length) {
        const newEvents = ai.events.map(event => ({
          ...event,
          timestamp: new Date().toISOString(),
          id: `temp-event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }));
        setEvents(prev => [...prev, ...newEvents]);

        // Async save to DB
        Promise.all(ai.events.map(e =>
          dbOps.addEvent(state.currentSessionId, e)
        )).catch(err => console.error('Failed to save events:', err));
      }

      // Apply card updates
      if (ai.cardUpdates?.length) {
        const latestCards = stateRef.current.allCards;
        const cardsToCreate = [];

        ai.cardUpdates.forEach(upd => {
          const existing = latestCards.find(c => c.name.toLowerCase() === upd.name.toLowerCase());
          if (existing) {
            updateCard(existing.id, upd.updates);
          } else {
            cardsToCreate.push({
              type: 'CHARACTER',
              name: upd.name,
              notes: upd.updates?.notes || '',
              isCanon: true,
              isPC: false,
              inParty: false,
              isHostile: upd.updates?.isHostile || false,
              inCombat: upd.updates?.inCombat || false,
              ...upd.updates,
              genesis: combinedText,
            });
          }
        });

        // Create cards that didn't exist
        for (const cardData of cardsToCreate) {
          const latestNow = stateRef.current.allCards;
          if (!latestNow.some(c => c.name.toLowerCase() === cardData.name.toLowerCase())) {
            await addCard(cardData, combinedText);
          }
        }
      }

      // Create new cards
      if (ai.newCards?.length) {
        const latestCards = stateRef.current.allCards;

        // Expand cards with count > 1
        const expandedCards = ai.newCards.flatMap(c => {
          const count = c.count || 1;
          if (count > 1) {
            return Array.from({ length: count }, (_, i) => ({ ...c, name: `${c.name} ${i + 1}`, count: undefined }));
          }
          return [{ ...c, count: undefined }];
        });

        for (const c of expandedCards) {
          if (!latestCards.some(x => x.name.toLowerCase() === c.name.toLowerCase())) {
            await addCard({
              ...c,
              inCombat: mode === 'combat' && c.type === 'CHARACTER' ? true : (c.inCombat || false),
            }, combinedText);
          }
        }
      }

      // Handle combatants
      if (ai.combatants?.length) {
        const latestCards = stateRef.current.allCards;
        ai.combatants.forEach(name => {
          const card = latestCards.find(c => c.name.toLowerCase() === name.toLowerCase());
          if (card && !card.inCombat) updateCard(card.id, { inCombat: true });
        });
      }

      if (ai.modeSwitch) {
        setMode(ai.modeSwitch);
      }
    } catch (e) {
      console.error('❌ AI processing error:', e);
    }
    setProcessing(false);
  };

  // Throttled processAI — saves transcript to Supabase immediately, batches AI calls
  const processAI = async (text) => {
    const ts = new Date().toLocaleTimeString();
    const speaker = text.toLowerCase().startsWith('dm:') ? 'DM' : 'Player';
    const txt = text.replace(/^(dm:|player:)\s*/i, '');

    // Save transcript to local state immediately
    const entry = { speaker, text: txt, timestamp: ts, id: `temp-${Date.now()}` };
    setTranscript(prev => [...prev, entry]);

    // Async save to Supabase
    dbOps.addTranscriptEntry(currentSessionId, speaker, txt, ts).catch(err =>
      console.error('Failed to save transcript:', err)
    );

    // Add to pending texts for AI processing
    pendingTextRef.current.push(text);

    const now = Date.now();
    const timeSinceLastCall = now - lastAICallRef.current;
    const THROTTLE_MS = 2000;

    if (timeSinceLastCall >= THROTTLE_MS && !throttleTimerRef.current) {
      const textsToProcess = [...pendingTextRef.current];
      pendingTextRef.current = [];
      lastAICallRef.current = now;
      await executeAIProcessing(textsToProcess);
    } else if (!throttleTimerRef.current) {
      const waitTime = THROTTLE_MS - timeSinceLastCall;
      throttleTimerRef.current = setTimeout(async () => {
        const textsToProcess = [...pendingTextRef.current];
        pendingTextRef.current = [];
        lastAICallRef.current = Date.now();
        throttleTimerRef.current = null;
        if (textsToProcess.length > 0) {
          await executeAIProcessing(textsToProcess);
        }
      }, waitTime);
    }
  };

  const submit = () => { if (input.trim()) { processAI(input); setInput(''); } };

  // Combat view: split by hostility
  const combatParty = cards.filter(c => c.type === 'CHARACTER' && c.inCombat && !c.isHostile); // Party members and allies in combat
  const combatEnemies = cards.filter(c => c.type === 'CHARACTER' && c.inCombat && c.isHostile); // Hostile creatures in combat

  // Exploration view: show ALL characters not in combat
  const party = cards.filter(c => c.type === 'CHARACTER' && c.inParty); // Party members
  const npcs = cards.filter(c => c.type === 'CHARACTER' && !c.inParty && !c.inCombat); // NPCs/creatures not in party or combat
  const locations = cards.filter(c => c.type === 'LOCATION');
  const items = cards.filter(c => c.type === 'ITEM');
  const plots = cards.filter(c => c.type === 'PLOT');

  useEffect(() => { if (selected) { const u = cards.find(c => c.id === selected.id); if (u) setSelected(u); else setSelected(null); } }, [cards]);
  useEffect(() => { if (transcriptRef.current && transcriptOpen) transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight; }, [transcript, transcriptOpen]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="h-16 bg-gray-950/80 backdrop-blur-md border-b border-gray-800 px-4 sticky top-0 z-30 flex items-center">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-gray-400 hover:text-white flex items-center gap-1 transition-colors">{Icons.back}</button>
            <h1 className="text-lg font-semibold text-white">{campaign.name}</h1>

            {/* Session Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">|</span>
              <select
                value={currentSessionId}
                onChange={async (e) => {
                  const sid = e.target.value;
                  setCurrentSessionId(sid);
                  // Load transcript and events for the selected session
                  try {
                    const [t, ev] = await Promise.all([
                      dbOps.fetchTranscript(sid),
                      dbOps.fetchEvents(sid),
                    ]);
                    setTranscript(t.map(dbTranscriptToFrontend));
                    setEvents(ev.map(dbEventToFrontend));
                  } catch (err) {
                    console.error('Failed to load session data:', err);
                  }
                }}
                className="bg-gray-900 border border-gray-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
              >
                {sessions.map((s, i) => (
                  <option key={s.id} value={s.id}>
                    {s.name || `Session ${i + 1}`} {s.endTime ? '(Archived)' : '(Active)'}
                  </option>
                ))}
              </select>
              <button
                onClick={async () => {
                  try {
                    // Deactivate old sessions locally
                    setSessions(prev => prev.map(s => s.isActive ? { ...s, isActive: false, endTime: new Date().toISOString() } : s));

                    const dbSession = await dbOps.createSession(campaign.id, `Session ${sessions.length + 1}`);
                    const newSession = dbSessionToFrontend(dbSession);
                    setSessions(prev => [...prev, newSession]);
                    setCurrentSessionId(newSession.id);
                    setTranscript([]);
                    setEvents([]);
                  } catch (err) {
                    console.error('Failed to create session:', err);
                  }
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 px-2 py-1 bg-gray-900 border border-gray-800 rounded transition-colors"
                title="Start new session"
              >
                + New
              </button>
            </div>

            <div className="flex items-center bg-gray-900 rounded-lg p-0.5 ml-2">
              <button onClick={() => setMode('exploration')} className={`px-3 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${mode === 'exploration' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}>{Icons.exploration} Exploration</button>
              <button onClick={() => setMode('combat')} className={`px-3 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${mode === 'combat' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}>{Icons.combat} Combat</button>
            </div>
            {processing && <span className="text-xs text-indigo-400 animate-pulse">Processing...</span>}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowRoster(true)} className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors">
              <IconUsers size={16} />
              <span className="text-xs">Roster</span>
            </button>
            <button onClick={() => setShowArc(true)} className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors">{Icons.book} <span className="text-xs">Arc</span></button>
            <button onClick={() => setShowTools(true)} className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors">{Icons.settings} <span className="text-xs">Tools</span></button>
          </div>
        </div>
      </header>

      <div className="p-4 pb-40">
        {mode === 'combat' ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">{Icons.party} Party</h2>
                <button onClick={() => setCreateModalType('CHARACTER')} className="p-1 rounded hover:bg-gray-800/50 text-emerald-400 hover:text-emerald-300">
                  {Icons.plus}
                </button>
              </div>
              <div className="space-y-2">
                {combatParty.length === 0 ? (
                  <div className="text-gray-600 text-xs italic p-3 border border-dashed border-gray-800 rounded-lg text-center">No party members in combat</div>
                ) : (
                  combatParty.map(c => <CompactCard key={c.id} card={c} onClick={() => setSelected(c)} onQuickHP={quickHP} onDelete={deleteCard} onReorder={reorderCards} isInCombat />)
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-red-400 flex items-center gap-1.5">{Icons.enemy} Enemies</h2>
                <button onClick={() => setCreateModalType('ENEMY')} className="p-1 rounded hover:bg-gray-800/50 text-red-400 hover:text-red-300">
                  {Icons.plus}
                </button>
              </div>
              <div className="space-y-2">
                {combatEnemies.length === 0 ? <div className="text-gray-600 text-xs italic p-3 border border-dashed border-gray-800 rounded-lg text-center">No enemies in combat</div>
                  : combatEnemies.map(c => <CompactCard key={c.id} card={c} onClick={() => setSelected(c)} onQuickHP={quickHP} onDelete={deleteCard} onReorder={reorderCards} isInCombat />)}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-indigo-400 flex items-center gap-1.5">{Icons.character} Characters</h2>
                <button onClick={() => setCreateModalType('CHARACTER')} className="p-1 rounded hover:bg-gray-800/50 text-indigo-400 hover:text-indigo-300">
                  {Icons.plus}
                </button>
              </div>
              <div className="space-y-2">
                {[...party, ...npcs].length === 0 ? (
                  <div className="text-gray-600 text-xs italic p-3 border border-dashed border-gray-800 rounded-lg text-center">No characters</div>
                ) : (
                  [...party, ...npcs].map(c => <CompactCard key={c.id} card={c} onClick={() => setSelected(c)} onQuickHP={quickHP} onDelete={deleteCard} onReorder={reorderCards} isInCombat={false} />)
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">{Icons.location} Locations</h2>
                <button onClick={() => setCreateModalType('LOCATION')} className="p-1 rounded hover:bg-gray-800/50 text-emerald-400 hover:text-emerald-300">
                  {Icons.plus}
                </button>
              </div>
              <div className="space-y-2">
                {locations.length === 0 ? <div className="text-gray-600 text-xs italic p-3 border border-dashed border-gray-800 rounded-lg text-center">No locations</div>
                  : locations.map(c => <CompactCard key={c.id} card={c} onClick={() => setSelected(c)} onDelete={deleteCard} onReorder={reorderCards} isInCombat={false} />)}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-amber-400 flex items-center gap-1.5">{Icons.item} Items</h2>
                <button onClick={() => setCreateModalType('ITEM')} className="p-1 rounded hover:bg-gray-800/50 text-amber-400 hover:text-amber-300">
                  {Icons.plus}
                </button>
              </div>
              <div className="space-y-2">
                {items.length === 0 ? <div className="text-gray-600 text-xs italic p-3 border border-dashed border-gray-800 rounded-lg text-center">No items</div>
                  : items.map(c => <CompactCard key={c.id} card={c} onClick={() => setSelected(c)} onDelete={deleteCard} onReorder={reorderCards} isInCombat={false} />)}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-pink-400 flex items-center gap-1.5">{Icons.plot} Plot</h2>
                <button onClick={() => setCreateModalType('PLOT')} className="p-1 rounded hover:bg-gray-800/50 text-pink-400 hover:text-pink-300">
                  {Icons.plus}
                </button>
              </div>
              <div className="space-y-2">
                {plots.length === 0 ? <div className="text-gray-600 text-xs italic p-3 border border-dashed border-gray-800 rounded-lg text-center">No plot threads</div>
                  : plots.map(c => <CompactCard key={c.id} card={c} onClick={() => setSelected(c)} onDelete={deleteCard} onReorder={reorderCards} isInCombat={false} />)}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-gray-950 via-gray-950/95 to-transparent">
        <div className="max-w-4xl mx-auto space-y-2">
          <AudioPanel settings={settings} onProcess={processAI} isProcessing={processing} />
          <div className={`bg-gray-900/90 backdrop-blur-md rounded-2xl border border-gray-800 transition-all ${transcriptOpen ? 'h-96' : 'h-10'}`}>
            <div className="w-full px-3 py-2 flex items-center justify-between text-xs text-gray-400 border-b border-gray-800">
              <button onClick={() => setTranscriptOpen(!transcriptOpen)} className="flex items-center gap-2 hover:text-gray-200 transition-colors">
                <span className={`w-1.5 h-1.5 rounded-full ${transcript.length > 0 ? 'bg-emerald-500' : 'bg-gray-600'}`} />
                {Icons.transcript} Transcript ({transcript.length} entries)
              </button>
              <button onClick={() => setTranscriptOpen(!transcriptOpen)} className="text-[10px] hover:text-gray-200 transition-colors">
                {transcriptOpen ? 'Hide ▼' : 'Show ▲'}
              </button>
            </div>
            {transcriptOpen && (
              <div ref={transcriptRef} className="px-3 py-3 overflow-y-auto overflow-x-hidden" style={{ maxHeight: '350px' }}>
                {transcript.length === 0 ? (
                  <p className="text-gray-500 text-xs italic">No transcript yet. Start speaking or typing to begin.</p>
                ) : (
                  <div className="space-y-3">
                    {transcript.map((e, i) => (
                      <div key={i} className="text-xs border-l-2 border-gray-800 pl-3 py-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-semibold ${e.speaker === 'DM' ? 'text-indigo-400' : 'text-emerald-400'}`}>{e.speaker}</span>
                          <span className="text-gray-600 text-[10px]">{e.timestamp}</span>
                        </div>
                        <div className="text-gray-300 leading-relaxed">{e.text}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !processing && submit()}
              placeholder="DM: As you enter..." disabled={processing}
              className="flex-1 bg-gray-900/90 backdrop-blur-md border border-gray-800 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors" />
            <Button variant="primary" onClick={submit} disabled={processing || !input.trim()}>{processing ? '...' : 'Send'}</Button>
          </div>
        </div>
      </div>

      <DetailDrawer card={selected} isOpen={!!selected} onClose={() => setSelected(null)} onUpdate={updateCard} onDelete={deleteCard} onGenerateRiff={genRiffFn} isGenerating={genRiff} onGetCharacterEvents={getCharacterEvents} />
      <CreateCardModal isOpen={!!createModalType} onClose={() => setCreateModalType(null)} onCreate={addCard} cardType={createModalType} />
      <PlayerRosterModal
        isOpen={showRoster}
        onClose={() => setShowRoster(false)}
        playerRoster={playerRoster}
        onSave={async (newRoster) => {
          setPlayerRoster(newRoster);
          // Sync roster to Supabase: delete removed, upsert existing/new
          try {
            const existingIds = new Set(newRoster.filter(r => r.id).map(r => r.id));
            const toDelete = playerRoster.filter(r => !existingIds.has(r.id));
            for (const r of toDelete) {
              await dbOps.deleteRosterEntry(r.id);
            }
            for (const r of newRoster) {
              await dbOps.upsertRosterEntry(campaign.id, r);
            }
          } catch (err) {
            console.error('Failed to save roster:', err);
          }
        }}
      />
      <ArcModal
        isOpen={showArc}
        onClose={() => setShowArc(false)}
        arc={dmContext}
        onSave={async (arc) => {
          setDmContext(arc);
          try {
            await dbOps.updateCampaign(campaign.id, { dm_context: arc });
          } catch (err) {
            console.error('Failed to save DM context:', err);
          }
        }}
      />
      <ToolsPanel
        isOpen={showTools}
        onClose={() => setShowTools(false)}
        campaign={campaign}
        sessions={sessions}
        currentSession={currentSession}
        cards={cards}
        settings={settings}
        onSaveSettings={onSaveSettings}
        onGenerateReport={generateReport}
      />

      {/* Void (Graveyard) Button - Bottom Left */}
      <button
        onClick={() => setShowVoid(true)}
        className="fixed bottom-4 left-4 z-20 flex items-center gap-2 px-3 py-2 bg-gray-900/90 backdrop-blur-md border border-gray-800 rounded-lg text-gray-400 hover:text-white hover:border-gray-700 transition-all group"
        title="The Void - Deleted cards"
      >
        <IconGhost2 size={18} className="text-gray-500 group-hover:text-purple-400 transition-colors" />
        {voidCards.length > 0 && (
          <span className="text-xs bg-purple-600/30 text-purple-300 px-1.5 py-0.5 rounded">
            {voidCards.length}
          </span>
        )}
      </button>

      {/* Void Panel Modal */}
      {showVoid && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setShowVoid(false)} />
          <div className="fixed bottom-4 left-4 z-50 w-80 max-h-[60vh] bg-gray-900/95 backdrop-blur-md border border-gray-800 rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <IconGhost2 size={18} className="text-purple-400" />
                <h3 className="font-semibold text-white text-sm">The Void</h3>
                <span className="text-xs text-gray-500">({voidCards.length} cards)</span>
              </div>
              <button onClick={() => setShowVoid(false)} className="text-gray-500 hover:text-white transition-colors">
                <IconX size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {voidCards.length === 0 ? (
                <div className="text-center py-8">
                  <IconGhost2 size={32} className="mx-auto text-gray-700 mb-2" />
                  <p className="text-gray-500 text-xs">The Void is empty</p>
                  <p className="text-gray-600 text-[10px] mt-1">Deleted cards will appear here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {voidCards.map(card => {
                    const typeConfig = CARD_TYPES[card.type] || CARD_TYPES.CHARACTER;
                    const sessionName = sessions.find(s => s.id === card.voidedInSession)?.name || 'Unknown session';
                    return (
                      <div key={card.id} className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 group">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-${typeConfig.color}-400`}>{Icons[typeConfig.icon]}</span>
                              <span className="text-sm font-medium text-white truncate">{card.name}</span>
                            </div>
                            <div className="text-[10px] text-gray-500">
                              Voided in {sessionName}
                            </div>
                            {card.notes && (
                              <p className="text-xs text-gray-400 mt-1 line-clamp-2">{card.notes}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => restoreFromVoid(card.id)}
                              className="p-1.5 rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 transition-colors"
                              title="Restore card"
                            >
                              <IconRefresh size={14} />
                            </button>
                            <button
                              onClick={() => permanentlyDelete(card.id)}
                              className="p-1.5 rounded bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors"
                              title="Delete permanently"
                            >
                              <IconTrash size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {voidCards.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-800 bg-gray-900/50">
                <button
                  onClick={async () => {
                    if (confirm('Permanently delete all cards in The Void? This cannot be undone.')) {
                      const toDelete = [...voidCards];
                      setAllCards(prev => prev.filter(c => !c.voidedAt));
                      for (const card of toDelete) {
                        dbOps.permanentlyDeleteCard(card.id).catch(err => console.error('Failed to delete:', err));
                      }
                    }
                  }}
                  className="w-full text-xs text-red-400/70 hover:text-red-400 py-1 transition-colors"
                >
                  Empty The Void
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// Main App (without error boundary)
function AppCore() {
  const { user, profile, signOut } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [campaignsLoaded, setCampaignsLoaded] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  // Settings object for backward compatibility with components that expect it
  // In managed mode, the AI keys are handled server-side
  const settings = {
    anthropicKey: profile?.key_mode === 'byok' ? profile?.anthropic_key_encrypted : '__managed__',
    deepgramKey: profile?.key_mode === 'byok' ? profile?.deepgram_key_encrypted : '__managed__',
    keyMode: profile?.key_mode || 'managed',
  };

  // Load campaigns from Supabase
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    dbOps.fetchCampaigns(user.id).then(data => {
      if (!cancelled) {
        setCampaigns(data.map(dbCampaignToFrontend));
        setCampaignsLoaded(true);
      }
    }).catch(err => {
      console.error('Failed to load campaigns:', err);
      if (!cancelled) setCampaignsLoaded(true);
    });

    return () => { cancelled = true; };
  }, [user]);

  const active = campaigns.find(c => c.id === activeId);

  const create = async (name) => {
    try {
      const { campaign, session } = await dbOps.createCampaign(user.id, name);
      const frontendCampaign = dbCampaignToFrontend(campaign);
      setCampaigns(prev => [frontendCampaign, ...prev]);
      setActiveId(frontendCampaign.id);
    } catch (err) {
      console.error('Failed to create campaign:', err);
    }
  };

  const del = async (id) => {
    setCampaigns(prev => prev.filter(c => c.id !== id));
    if (activeId === id) setActiveId(null);
    try {
      await dbOps.deleteCampaign(id);
    } catch (err) {
      console.error('Failed to delete campaign:', err);
    }
  };

  const updateLocal = (updated) => setCampaigns(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));

  const onSaveSettings = async (newSettings) => {
    // Save BYOK keys to profile
    if (profile?.key_mode === 'byok') {
      try {
        await dbOps.updateProfile(user.id, {
          anthropic_key_encrypted: newSettings.anthropicKey,
          deepgram_key_encrypted: newSettings.deepgramKey,
        });
      } catch (err) {
        console.error('Failed to save settings:', err);
      }
    }
  };

  if (!campaignsLoaded) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><div className="text-gray-400">Loading...</div></div>;

  return (
    <>
      {active ? (
        <CampaignView campaign={active} onUpdateLocal={updateLocal} onBack={() => setActiveId(null)} settings={settings} onSaveSettings={onSaveSettings} userId={user.id} />
      ) : (
        <CampaignsHome campaigns={campaigns} onSelect={setActiveId} onCreate={create} onDelete={del} settings={settings} onOpenSettings={() => setShowSettings(true)} onSignOut={signOut} profile={profile} />
      )}
      {/* Settings panel for home screen (Account tab only) */}
      <ToolsPanel
        isOpen={showSettings && !active}
        onClose={() => setShowSettings(false)}
        campaign={null}
        sessions={[]}
        currentSession={null}
        cards={[]}
        settings={settings}
        onSaveSettings={onSaveSettings}
        onGenerateReport={() => {}}
      />
    </>
  );
}

// Wrapped export with error boundary
export default function App() {
  return (
    <ErrorBoundary>
      <AppCore />
    </ErrorBoundary>
  );
}
